import { logger } from "@trigger.dev/sdk/v3";
import type {
  ProcessingStatus,
  WorkflowError,
  MediaMetadata,
  UploadResult,
} from "../types";
import { logWorkflowErrors } from "../lib/error-persistence";

/**
 * Database update step - Persist all enriched data to database
 * @param bookmarkId - Bookmark ID to update
 * @param workflowId - Workflow run ID for error tracking
 * @param data - Enrichment data to persist
 * @throws Error if database update fails
 */
export async function updateBookmarkEnrichment(
  bookmarkId: string,
  workflowId: string,
  data: {
    summary?: string;
    keywords?: string[];
    tags?: Array<{ id: string; name: string }>;
    status: ProcessingStatus;
    errors?: WorkflowError[];
  }
): Promise<void> {
  logger.info("Updating bookmark enrichment data", {
    bookmarkId,
    workflowId,
    status: data.status,
    hasSummary: !!data.summary,
    keywordsCount: data.keywords?.length || 0,
    tagsCount: data.tags?.length || 0,
    errorsCount: data.errors?.length || 0,
  });

  try {
    const prisma = (await import("@favy/db")).default;

    const errorMessage = data.errors
      ?.map((e) => `[${e.step}] ${e.message}`)
      .join("; ");

    await prisma.$transaction(async (tx) => {
      await tx.bookmarkEnrichment.upsert({
        where: { bookmarkPostId: bookmarkId },
        create: {
          bookmarkPostId: bookmarkId,
          summary: data.summary,
          keywords: data.keywords,
          tags: data.tags?.map((o) => o.name),
          processingStatus: data.status,
          workflowId,
          enrichedAt: new Date(),
          errorMessage: errorMessage || null,
        },
        update: {
          summary: data.summary,
          keywords: data.keywords,
          tags: data.tags?.map((o) => o.name),
          processingStatus: data.status,
          workflowId,
          enrichedAt: new Date(),
          errorMessage: errorMessage || null,
        },
      });
      if (!!data.tags?.length) {
        await tx.bookmarkPostCategory.createMany({
          data: data.tags?.map((o) => ({
            bookmarkPostId: bookmarkId,
            categoryId: o.id,
            assignedAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }
    });

    if (data.errors && data.errors.length > 0) {
      await logWorkflowErrors(bookmarkId, workflowId, data.errors);
    }

    logger.info("Bookmark enrichment data updated successfully", {
      bookmarkId,
      workflowId,
      status: data.status,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Failed to update bookmark enrichment data", {
      bookmarkId,
      workflowId,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Create downloaded media record in database
 * @param bookmarkId - Bookmark ID
 * @param metadata - Media metadata
 * @param uploadResult - Storage upload result
 * @param originalUrl - Original media URL
 * @returns Created media record ID
 */
export async function createDownloadedMediaRecord(
  bookmarkId: string,
  metadata: MediaMetadata,
  uploadResult: UploadResult,
  originalUrl: string
): Promise<string> {
  logger.info("Creating downloaded media record", {
    bookmarkId,
    mediaType: metadata.type,
    storageKey: uploadResult.key,
  });

  try {
    // Import database client
    const prisma = (await import("@favy/db")).default;

    // Map media type to MediaType enum
    const mediaType = metadata.type === "video" ? "VIDEO" : "IMAGE"; // Use IMAGE for audio since AUDIO is not in enum

    // Create downloaded media record
    const mediaRecord = await prisma.downloadedMedia.create({
      data: {
        bookmarkPostId: bookmarkId,
        type: mediaType,
        originalUrl,
        storagePath: uploadResult.key,
        storageUrl: uploadResult.url,
        fileSize: BigInt(metadata.fileSize),
        duration: metadata.duration || null,
        quality: metadata.quality || null,
        format: metadata.format || null,
        width: metadata.width || null,
        height: metadata.height || null,
        downloadStatus: "COMPLETED",
        downloadedAt: new Date(),
        metadata: metadata.thumbnailUrl
          ? JSON.parse(JSON.stringify({ thumbnailUrl: metadata.thumbnailUrl }))
          : null,
      },
    });

    logger.info("Downloaded media record created successfully", {
      bookmarkId,
      mediaId: mediaRecord.id,
    });

    return mediaRecord.id;
  } catch (error) {
    const err = error as Error;
    logger.error("Failed to create downloaded media record", {
      bookmarkId,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Update bookmark processing status
 * @param bookmarkId - Bookmark ID to update
 * @param status - Processing status
 * @param errorMessage - Optional error message
 */
export async function updateBookmarkStatus(
  bookmarkId: string,
  status: ProcessingStatus,
  errorMessage?: string
): Promise<void> {
  logger.info("Updating bookmark status", {
    bookmarkId,
    status,
    hasError: !!errorMessage,
  });

  try {
    // Import database client
    const prisma = (await import("@favy/db")).default;

    // Upsert bookmark enrichment status
    await prisma.bookmarkEnrichment.upsert({
      where: { bookmarkPostId: bookmarkId },
      create: {
        bookmarkPostId: bookmarkId,
        processingStatus: status,
        errorMessage: errorMessage || null,
        enrichedAt:
          status === "COMPLETED" || status === "PARTIAL_SUCCESS"
            ? new Date()
            : undefined,
      },
      update: {
        processingStatus: status,
        errorMessage: errorMessage || null,
        enrichedAt:
          status === "COMPLETED" || status === "PARTIAL_SUCCESS"
            ? new Date()
            : undefined,
      },
    });

    logger.info("Bookmark status updated successfully", {
      bookmarkId,
      status,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Failed to update bookmark status", {
      bookmarkId,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Mark media download as failed
 * @param bookmarkId - Bookmark ID
 * @param originalUrl - Original media URL
 * @param errorMessage - Error message
 */
export async function markMediaDownloadFailed(
  bookmarkId: string,
  originalUrl: string,
  errorMessage: string
): Promise<void> {
  logger.info("Marking media download as failed", {
    bookmarkId,
    originalUrl,
  });

  try {
    // Import database client
    const prisma = (await import("@favy/db")).default;

    // Create failed media record
    await prisma.downloadedMedia.create({
      data: {
        bookmarkPostId: bookmarkId,
        type: "VIDEO", // Default type
        originalUrl,
        storagePath: "",
        storageUrl: null,
        fileSize: BigInt(0),
        downloadStatus: "FAILED",
        errorMessage,
      },
    });

    logger.info("Media download marked as failed", {
      bookmarkId,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Failed to mark media download as failed", {
      bookmarkId,
      error: err.message,
      stack: err.stack,
    });
    // Don't throw - this is not critical
  }
}

/**
 * Determine final processing status based on results
 * @param hasErrors - Whether any errors occurred
 * @param hasSummary - Whether summary was generated
 * @param hasMedia - Whether media was downloaded
 * @returns Final processing status
 */
export function determineFinalStatus(
  hasErrors: boolean,
  hasSummary: boolean,
  hasMedia: boolean
): ProcessingStatus {
  if (!hasErrors) {
    return "COMPLETED";
  }

  // If we have some successful data despite errors
  if (hasSummary || hasMedia) {
    return "PARTIAL_SUCCESS";
  }

  return "FAILED";
}

/**
 * Batch update multiple bookmarks (for bulk operations)
 * @param updates - Array of bookmark updates
 */
export async function batchUpdateBookmarks(
  updates: Array<{
    bookmarkId: string;
    summary?: string;
    keywords?: string[];
    tags?: string[];
    status: ProcessingStatus;
    errorMessage?: string;
  }>
): Promise<void> {
  logger.info("Batch updating bookmarks", {
    count: updates.length,
  });

  try {
    // Import database client
    const prisma = (await import("@favy/db")).default;

    // Use transaction for batch updates
    await prisma.$transaction(
      updates.map((update) =>
        prisma.bookmarkEnrichment.upsert({
          where: { bookmarkPostId: update.bookmarkId },
          create: {
            bookmarkPostId: update.bookmarkId,
            summary: update.summary,
            keywords: update.keywords,
            tags: update.tags,
            processingStatus: update.status,
            enrichedAt: new Date(),
            errorMessage: update.errorMessage || null,
          },
          update: {
            summary: update.summary,
            keywords: update.keywords,
            tags: update.tags,
            processingStatus: update.status,
            enrichedAt: new Date(),
            errorMessage: update.errorMessage || null,
          },
        })
      )
    );

    logger.info("Batch update completed successfully", {
      count: updates.length,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Batch update failed", {
      count: updates.length,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}
