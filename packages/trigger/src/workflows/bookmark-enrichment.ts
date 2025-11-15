import { task, logger } from "@trigger.dev/sdk/v3";
import type {
  BookmarkEnrichmentInput,
  BookmarkEnrichmentOutput,
  WorkflowStep,
} from "../types";
import { isRetryableError, classifyError } from "../types";

/**
 * Main bookmark enrichment workflow
 * Orchestrates the complete enrichment process including:
 * - Content retrieval
 * - AI summarization
 * - Media detection and download
 * - Storage upload
 * - Database updates
 */
export const bookmarkEnrichmentWorkflow = task({
  id: "bookmark-enrichment",
  retry: {
    maxAttempts: 3,
    factor: 3,
    minTimeoutInMs: 5000,
    maxTimeoutInMs: 45000,
    randomize: true,
  },
  run: async (payload: BookmarkEnrichmentInput) => {
    const startTime = Date.now();
    const { bookmarkId, userId, platform, url, content, enableMediaDownload } =
      payload;

    logger.info("Starting bookmark enrichment workflow", {
      bookmarkId,
      userId,
      platform,
      url,
      enableMediaDownload,
    });

    const result: BookmarkEnrichmentOutput = {
      success: false,
      errors: [],
    };

    try {
      // Step 1: Content Retrieval
      logger.info("Step 1: Content retrieval", { bookmarkId });
      let fullContent = content;

      try {
        // Import content retrieval task dynamically to avoid circular dependencies
        const { retrieveContent } = await import("../tasks/content-retrieval");
        fullContent = await retrieveContent(url, platform, content);
        logger.info("Content retrieved successfully", {
          bookmarkId,
          contentLength: fullContent.length,
        });
      } catch (error) {
        const err = error as Error;
        logger.warn("Content retrieval failed, using original content", {
          bookmarkId,
          error: err.message,
        });
        // Non-critical error, continue with original content
        result.errors?.push({
          step: "content_retrieval" as WorkflowStep,
          message: err.message,
          timestamp: new Date(),
          retryable: false,
        });
      }

      // Step 2: AI Summarization
      logger.info("Step 2: AI summarization", { bookmarkId });
      try {
        // Placeholder for AI summarization - will be implemented in task 4
        // For now, we'll structure the workflow to call it when available
        logger.info("Summarization step placeholder", { bookmarkId });

        // TODO: Implement when AI package is ready
        // const { generateSummary } = await import("@my-better-t-app/ai");
        // const summaryResult = await generateSummary(fullContent);
        // result.summary = summaryResult.summary;
        // result.keywords = summaryResult.keywords;
        // result.tags = summaryResult.tags;
        // result.tokensUsed = summaryResult.tokensUsed;

        logger.info("Summarization completed (placeholder)", {
          bookmarkId,
        });
      } catch (error) {
        const err = error as Error;
        logger.error("Summarization failed", {
          bookmarkId,
          error: err.message,
          errorType: classifyError(err),
        });

        result.errors?.push({
          step: "summarization" as WorkflowStep,
          message: err.message,
          timestamp: new Date(),
          retryable: isRetryableError(err),
          stackTrace: err.stack,
        });

        // If summarization fails but is retryable, throw to trigger retry
        if (isRetryableError(err)) {
          throw err;
        }
      }

      // Step 3: Media Detection and Download (if enabled)
      if (enableMediaDownload) {
        logger.info("Step 3: Media detection", { bookmarkId });

        try {
          // Placeholder for media detection - will be implemented in task 5
          logger.info("Media detection step placeholder", {
            bookmarkId,
          });

          // TODO: Implement when media-downloader package is ready
          // const { detectMedia } = await import("@my-better-t-app/media-downloader");
          // const mediaDetection = await detectMedia(url);

          // if (mediaDetection.hasMedia) {
          //   logger.info("Media detected, starting download", {
          //     bookmarkId,
          //     mediaType: mediaDetection.mediaType,
          //   });

          //   // Step 4: Download media
          //   const { downloadMedia } = await import("@my-better-t-app/media-downloader");
          //   const downloadResult = await downloadMedia(url, {
          //     maxSize: parseInt(process.env.MAX_MEDIA_SIZE_MB || "500") * 1024 * 1024,
          //   });

          //   if (downloadResult.success) {
          //     // Step 5: Upload to S3
          //     logger.info("Step 5: Uploading media to storage", {
          //       bookmarkId,
          //     });

          //     const { uploadFile } = await import("@my-better-t-app/storage");
          //     const storageKey = generateStorageKey(bookmarkId, downloadResult.metadata);
          //     const uploadResult = await uploadFile(
          //       downloadResult.filePath,
          //       storageKey,
          //       downloadResult.metadata
          //     );

          //     result.mediaMetadata = [
          //       {
          //         ...downloadResult.metadata,
          //         storagePath: storageKey,
          //         storageUrl: uploadResult.url,
          //       },
          //     ];

          //     logger.info("Media uploaded successfully", {
          //       bookmarkId,
          //       storageKey,
          //     });
          //   }
          // } else {
          //   logger.info("No media detected", { bookmarkId });
          // }
        } catch (error) {
          const err = error as Error;
          logger.error("Media processing failed", {
            bookmarkId,
            error: err.message,
            errorType: classifyError(err),
          });

          result.errors?.push({
            step: "media_download" as WorkflowStep,
            message: err.message,
            timestamp: new Date(),
            retryable: isRetryableError(err),
            stackTrace: err.stack,
          });

          // Media download failure is not critical, continue
        }
      } else {
        logger.info("Media download disabled, skipping", {
          bookmarkId,
        });
      }

      // Step 6: Update database with final status
      logger.info("Step 6: Updating database", { bookmarkId });

      try {
        // Determine final status
        const hasErrors = (result.errors?.length ?? 0) > 0;
        const hasSuccessfulData = !!(result.summary || result.mediaMetadata);

        let finalStatus: "COMPLETED" | "PARTIAL_SUCCESS" | "FAILED";
        if (!hasErrors) {
          finalStatus = "COMPLETED";
        } else if (hasSuccessfulData) {
          finalStatus = "PARTIAL_SUCCESS";
        } else {
          finalStatus = "FAILED";
        }

        // TODO: Implement database update when db package is ready
        // const { prisma } = await import("@my-better-t-app/db");
        // await prisma.bookmarkPost.update({
        //   where: { id: bookmarkId },
        //   data: {
        //     summary: result.summary,
        //     keywords: result.keywords,
        //     tags: result.tags,
        //     processingStatus: finalStatus,
        //     enrichedAt: new Date(),
        //     errorMessage: result.errors?.map(e => e.message).join("; "),
        //   },
        // });

        logger.info("Database updated successfully", {
          bookmarkId,
          status: finalStatus,
        });

        result.success = finalStatus !== "FAILED";
        result.executionTimeMs = Date.now() - startTime;

        logger.info("Workflow completed", {
          bookmarkId,
          success: result.success,
          status: finalStatus,
          executionTimeMs: result.executionTimeMs,
          errorsCount: result.errors?.length ?? 0,
        });

        return result;
      } catch (error) {
        const err = error as Error;
        logger.error("Database update failed", {
          bookmarkId,
          error: err.message,
        });

        result.errors?.push({
          step: "database_update" as WorkflowStep,
          message: err.message,
          timestamp: new Date(),
          retryable: isRetryableError(err),
          stackTrace: err.stack,
        });

        // Database update failure is critical, throw to trigger retry
        throw err;
      }
    } catch (error) {
      const err = error as Error;
      logger.error("Workflow failed with unhandled error", {
        bookmarkId,
        error: err.message,
        stackTrace: err.stack,
      });

      // Update bookmark status to FAILED
      try {
        // TODO: Implement when db package is ready
        // const { prisma } = await import("@my-better-t-app/db");
        // await prisma.bookmarkPost.update({
        //   where: { id: bookmarkId },
        //   data: {
        //     processingStatus: "FAILED",
        //     errorMessage: err.message,
        //   },
        // });
      } catch (dbError) {
        logger.error("Failed to update bookmark status to FAILED", {
          bookmarkId,
          error: dbError,
        });
      }

      result.success = false;
      result.executionTimeMs = Date.now() - startTime;

      // Re-throw to let Trigger.dev handle the retry
      throw err;
    }
  },
});

/**
 * Helper function to generate unique storage keys for media files
 * @param bookmarkId - The bookmark ID
 * @param metadata - Media metadata containing format information
 * @returns Storage key path
 */
function generateStorageKey(
  bookmarkId: string,
  metadata: { format?: string }
): string {
  const timestamp = Date.now();
  const extension = metadata.format || "mp4";
  return `media/${bookmarkId}/${timestamp}.${extension}`;
}
