/**
 * Database update service for Restate workflows
 *
 * Persists enriched bookmark data to the database
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  ProcessingStatus,
  WorkflowError,
  MediaMetadata,
  UploadResult,
} from "../types";
import { throwAppropriateError } from "../lib/errors";
import { createWorkflowLogger } from "../lib/logger";

export interface BookmarkEnrichmentUpdateInput {
  bookmarkId: string;
  workflowId: string;
  userId: string;
  summary?: string;
  keywords?: string[];
  tags?: Array<{ id: string; name: string }>;
  status: ProcessingStatus;
  errors?: WorkflowError[];
}

export interface MediaRecordInput {
  bookmarkId: string;
  workflowId: string;
  userId: string;
  metadata: MediaMetadata;
  uploadResult: UploadResult;
  originalUrl: string;
}

export const databaseUpdateService = restate.service({
  name: "DatabaseUpdateService",
  handlers: {
    updateEnrichment: async (
      ctx: restate.Context,
      input: BookmarkEnrichmentUpdateInput
    ): Promise<void> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Updating bookmark enrichment data", {
        status: input.status,
        hasSummary: !!input.summary,
        keywordsCount: input.keywords?.length || 0,
        tagsCount: input.tags?.length || 0,
        errorsCount: input.errors?.length || 0,
      });

      try {
        await ctx.run("update-enrichment", async () => {
          const prisma = (await import("@favy/db")).default;

          const errorMessage = input.errors
            ?.map((e) => `[${e.step}] ${e.message}`)
            .join("; ");

          await prisma.$transaction(async (tx) => {
            await tx.bookmarkEnrichment.upsert({
              where: { bookmarkPostId: input.bookmarkId },
              create: {
                bookmarkPostId: input.bookmarkId,
                summary: input.summary,
                keywords: input.keywords,
                tags: input.tags?.map((o) => o.name),
                processingStatus: input.status,
                workflowId: input.workflowId,
                enrichedAt: new Date(),
                errorMessage: errorMessage || null,
              },
              update: {
                summary: input.summary,
                keywords: input.keywords,
                tags: input.tags?.map((o) => o.name),
                processingStatus: input.status,
                workflowId: input.workflowId,
                enrichedAt: new Date(),
                errorMessage: errorMessage || null,
              },
            });

            if (!!input.tags?.length) {
              await tx.bookmarkPostCategory.createMany({
                data: input.tags?.map((o) => ({
                  bookmarkPostId: input.bookmarkId,
                  categoryId: o.id,
                  assignedAt: new Date(),
                })),
                skipDuplicates: true,
              });
            }
          });

          if (input.errors && input.errors.length > 0) {
            await storeLogWorkflowErrors(
              input.bookmarkId,
              input.workflowId,
              input.errors
            );
          }
        });

        logger.info("Bookmark enrichment data updated successfully", {
          status: input.status,
        });
      } catch (error) {
        logger.error(
          "Failed to update bookmark enrichment data",
          error as Error
        );

        // Re-throw with appropriate error handling
        throwAppropriateError(error as Error, {
          step: "database-update",
          bookmarkId: input.bookmarkId,
        });
      }
    },

    createMediaRecord: async (
      ctx: restate.Context,
      input: MediaRecordInput
    ): Promise<string> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Creating downloaded media record", {
        mediaType: input.metadata.type,
        storageKey: input.uploadResult.key,
      });

      try {
        const mediaId = await ctx.run("create-media-record", async () => {
          const prisma = (await import("@favy/db")).default;

          // Map media type to MediaType enum
          const mediaType = input.metadata.type === "video" ? "VIDEO" : "IMAGE";

          // Create downloaded media record
          const mediaRecord = await prisma.downloadedMedia.create({
            data: {
              bookmarkPostId: input.bookmarkId,
              type: mediaType,
              originalUrl: input.originalUrl,
              storagePath: input.uploadResult.key,
              storageUrl: input.uploadResult.url,
              fileSize: BigInt(input.metadata.fileSize),
              duration: input.metadata.duration || null,
              quality: input.metadata.quality || null,
              format: input.metadata.format || null,
              width: input.metadata.width || null,
              height: input.metadata.height || null,
              downloadStatus: "COMPLETED",
              downloadedAt: new Date(),
              metadata: input.metadata.thumbnailUrl
                ? JSON.parse(
                    JSON.stringify({
                      thumbnailUrl: input.metadata.thumbnailUrl,
                    })
                  )
                : null,
            },
          });

          return mediaRecord.id;
        });

        logger.info("Downloaded media record created successfully", {
          mediaId,
        });

        return mediaId;
      } catch (error) {
        logger.error(
          "Failed to create downloaded media record",
          error as Error
        );

        // Re-throw with appropriate error handling
        throwAppropriateError(error as Error, {
          step: "create-media-record",
          bookmarkId: input.bookmarkId,
        });
      }
    },

    markMediaFailed: async (
      ctx: restate.Context,
      input: {
        bookmarkId: string;
        workflowId: string;
        userId: string;
        originalUrl: string;
        errorMessage: string;
      }
    ): Promise<void> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Marking media download as failed", {
        originalUrl: input.originalUrl,
      });

      try {
        await ctx.run("mark-media-failed", async () => {
          const prisma = (await import("@favy/db")).default;

          // Create failed media record
          await prisma.downloadedMedia.create({
            data: {
              bookmarkPostId: input.bookmarkId,
              type: "VIDEO", // Default type
              originalUrl: input.originalUrl,
              storagePath: "",
              storageUrl: null,
              fileSize: BigInt(0),
              downloadStatus: "FAILED",
              errorMessage: input.errorMessage,
            },
          });
        });

        logger.info("Media download marked as failed");
      } catch (error) {
        logger.warn("Failed to mark media download as failed", error as Error);
        // Don't throw - this is not critical
      }
    },
  },
});

async function storeLogWorkflowErrors(
  bookmarkId: string,
  workflowId: string,
  errors: WorkflowError[]
): Promise<void> {
  try {
    const prisma = (await import("@favy/db")).default;

    await prisma.workflowErrorLog.createMany({
      data: errors.map((error) => ({
        bookmarkPostId: bookmarkId,
        workflowId,
        step: error.step,
        errorType: error.errorType as any,
        errorMessage: error.message,
        stackTrace: error.stackTrace,
        retryable: error.retryable,
        retryCount: 0,
        resolved: false,
        context: error.context || {},
        occurredAt: error.timestamp,
      })),
      skipDuplicates: true,
    });
  } catch (error) {
    console.error("Failed to log workflow errors:", error);
    // Don't throw - error logging failure should not fail the workflow
  }
}
