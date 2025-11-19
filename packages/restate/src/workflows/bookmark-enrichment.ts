/**
 * Bookmark enrichment workflow for Restate
 *
 * Orchestrates the complete enrichment process including:
 * - Content retrieval
 * - AI summarization
 * - Media detection and download
 * - Storage upload
 * - Database updates
 *
 * Note: This workflow uses ctx.serviceClient() for all service invocations
 * to ensure durable execution. For parallel operations, RestatePromise.all()
 * should be used instead of Promise.all() to ensure deterministic replay.
 *
 * Example of parallel operations (when applicable):
 * ```typescript
 * const [result1, result2] = await RestatePromise.all([
 *   ctx.serviceClient(service1).method1(input1),
 *   ctx.serviceClient(service2).method2(input2),
 * ]);
 * ```
 */

import * as restate from "@restatedev/restate-sdk";
import type {
  BookmarkEnrichmentInput,
  BookmarkEnrichmentOutput,
  ProcessingStatus,
} from "../types";
import { WorkflowStep } from "../types";
import { createWorkflowLogger, startTimer } from "../lib/logger";
import { classifyError, isRetryableError } from "../lib/errors";
import { contentRetrievalService } from "../services/content-retrieval";
import { summarizationService } from "../services/summarization";
import { mediaDetectionService } from "../services/media-detection";
import { mediaDownloadService } from "../services/media-download";
import { storageUploadService } from "../services/storage-upload";
import { databaseUpdateService } from "../services/database-update";

/**
 * Bookmark enrichment workflow as a Restate Virtual Object
 * Uses the bookmark ID as the key for state management
 */
export const bookmarkEnrichmentWorkflow = restate.object({
  name: "BookmarkEnrichment",
  handlers: {
    /**
     * Main enrichment handler
     * Orchestrates all enrichment steps with proper error handling and logging
     */
    enrich: async (
      ctx: restate.ObjectContext,
      payload: BookmarkEnrichmentInput
    ): Promise<BookmarkEnrichmentOutput> => {
      const {
        bookmarkId,
        userId,
        platform,
        url,
        content,
        enableMediaDownload,
      } = payload;

      const workflowId = await ctx.rand.uuidv4();

      const logger = createWorkflowLogger({
        workflowId,
        bookmarkId,
        userId,
      });

      const workflowStartTime = await ctx.date.now();

      // Log workflow start with ID and parameters
      logger.info("Workflow started", {
        platform,
        url,
        enableMediaDownload,
        contentLength: content.length,
      });

      const result: BookmarkEnrichmentOutput = {
        success: false,
        errors: [],
      };

      try {
        let fullContent = content;
        const contentTimer = startTimer(WorkflowStep.CONTENT_RETRIEVAL, logger);

        try {
          logger.info(`Step ${WorkflowStep.CONTENT_RETRIEVAL} started`, {
            step: WorkflowStep.CONTENT_RETRIEVAL,
          });

          const contentResult = await ctx
            .serviceClient(contentRetrievalService)
            .retrieve({
              url,
              platform,
              fallbackContent: content,
              bookmarkId,
              workflowId,
              userId,
            });

          if (
            contentResult.success &&
            contentResult.content.length > content.length
          ) {
            fullContent = contentResult.content;
          }

          contentTimer.end(true, {
            contentLength: fullContent.length,
            originalLength: content.length,
          });
        } catch (error) {
          const err = error as Error;
          contentTimer.end(false, { error: err.message });

          logger.error(`Step ${WorkflowStep.CONTENT_RETRIEVAL} failed`, err, {
            step: WorkflowStep.CONTENT_RETRIEVAL,
            duration: contentTimer.elapsed(),
          });

          // Non-critical error, continue with original content
          result.errors?.push({
            step: WorkflowStep.CONTENT_RETRIEVAL,
            errorType: classifyError(err),
            message: err.message,
            timestamp: new Date(await ctx.date.now()),
            retryable: false,
            stackTrace: err.stack,
          });
        }

        const aiSummarizationEnabled =
          process.env.ENABLE_AI_SUMMARIZATION !== "false";

        if (aiSummarizationEnabled) {
          const summarizationTimer = startTimer(
            WorkflowStep.SUMMARIZATION,
            logger
          );

          try {
            logger.info(`Step ${WorkflowStep.SUMMARIZATION} started`, {
              step: WorkflowStep.SUMMARIZATION,
              contentLength: fullContent.length,
            });

            const summaryResult = await ctx
              .serviceClient(summarizationService)
              .summarize({
                content: fullContent,
                bookmarkId,
                workflowId,
                userId,
              });

            result.summary = summaryResult.summary;
            result.keywords = summaryResult.keywords;
            result.tags = summaryResult.tags;
            result.tokensUsed = summaryResult.tokensUsed;

            summarizationTimer.end(true, {
              summaryLength: summaryResult.summary.length,
              keywordsCount: summaryResult.keywords.length,
              tagsCount: summaryResult.tags.length,
              tokensUsed: summaryResult.tokensUsed,
            });
          } catch (error) {
            const err = error as Error;
            summarizationTimer.end(false, { error: err.message });

            const errorType = classifyError(err);
            const retryable = isRetryableError(err);

            logger.error(`Step ${WorkflowStep.SUMMARIZATION} failed`, err, {
              step: WorkflowStep.SUMMARIZATION,
              duration: summarizationTimer.elapsed(),
              errorType,
              retryable,
            });

            result.errors?.push({
              step: WorkflowStep.SUMMARIZATION,
              errorType,
              message: err.message,
              timestamp: new Date(await ctx.date.now()),
              retryable,
              stackTrace: err.stack,
            });

            // If summarization fails with retryable error, throw to trigger retry
            if (retryable) {
              throw err;
            }
          }
        } else {
          logger.info("AI summarization disabled by feature flag, skipping", {
            step: WorkflowStep.SUMMARIZATION,
          });
        }

        const mediaDownloadEnabled =
          process.env.ENABLE_MEDIA_DOWNLOAD !== "false";
        const shouldProcessMedia = enableMediaDownload && mediaDownloadEnabled;

        if (shouldProcessMedia) {
          const mediaTimer = startTimer(WorkflowStep.MEDIA_DETECTION, logger);

          try {
            logger.info(`Step ${WorkflowStep.MEDIA_DETECTION} started`, {
              step: WorkflowStep.MEDIA_DETECTION,
              url,
            });

            const maxSizeMB = parseInt(process.env.MAX_MEDIA_SIZE_MB || "500");

            // Call media detection service using ctx.serviceClient()
            const mediaDetection = await ctx
              .serviceClient(mediaDetectionService)
              .detect({
                url,
                bookmarkId,
                workflowId,
                userId,
                enableMediaDownload: shouldProcessMedia,
                maxSizeMB,
              });

            if (mediaDetection.hasMedia) {
              mediaTimer.end(true, {
                hasMedia: true,
                mediaType: mediaDetection.mediaType,
                estimatedSize: mediaDetection.estimatedSize,
              });

              // Step 4: Download media
              const downloadTimer = startTimer(
                WorkflowStep.MEDIA_DOWNLOAD,
                logger
              );

              logger.info(`Step ${WorkflowStep.MEDIA_DOWNLOAD} started`, {
                step: WorkflowStep.MEDIA_DOWNLOAD,
                mediaType: mediaDetection.mediaType,
                maxSizeMB,
              });

              // Call media download service using ctx.serviceClient()
              const downloadResult = await ctx
                .serviceClient(mediaDownloadService)
                .download({
                  url,
                  bookmarkId,
                  workflowId,
                  userId,
                  maxSizeMB,
                  quality: mediaDetection.quality,
                });

              if (downloadResult.success && downloadResult.filePath) {
                downloadTimer.end(true, {
                  fileSize: downloadResult.metadata.fileSize,
                  format: downloadResult.metadata.format,
                  duration: downloadResult.metadata.duration,
                });

                // Step 5: Upload to S3
                const uploadTimer = startTimer(
                  WorkflowStep.STORAGE_UPLOAD,
                  logger
                );

                logger.info(`Step ${WorkflowStep.STORAGE_UPLOAD} started`, {
                  step: WorkflowStep.STORAGE_UPLOAD,
                  fileSize: downloadResult.metadata.fileSize,
                });

                // Call storage upload service using ctx.serviceClient()
                const uploadResult = await ctx
                  .serviceClient(storageUploadService)
                  .upload({
                    filePath: downloadResult.filePath,
                    bookmarkId,
                    workflowId,
                    userId,
                    metadata: downloadResult.metadata,
                  });

                result.mediaMetadata = [
                  {
                    ...downloadResult.metadata,
                    storagePath: uploadResult.key,
                    storageUrl: uploadResult.url,
                  },
                ];

                uploadTimer.end(true, {
                  storageKey: uploadResult.key,
                  uploadSize: uploadResult.size,
                });

                // Call database update service using ctx.serviceClient() to create media record
                await ctx
                  .serviceClient(databaseUpdateService)
                  .createMediaRecord({
                    bookmarkId,
                    workflowId,
                    userId,
                    metadata: downloadResult.metadata,
                    uploadResult,
                    originalUrl: url,
                  });
              }
            } else {
              mediaTimer.end(true, {
                hasMedia: false,
                reason: "no_media_detected",
              });
            }
          } catch (error) {
            const err = error as Error;
            mediaTimer.end(false, { error: err.message });

            const errorType = classifyError(err);
            const retryable = isRetryableError(err);

            logger.error(`Step ${WorkflowStep.MEDIA_DOWNLOAD} failed`, err, {
              step: WorkflowStep.MEDIA_DOWNLOAD,
              duration: mediaTimer.elapsed(),
              errorType,
              retryable,
            });

            result.errors?.push({
              step: WorkflowStep.MEDIA_DOWNLOAD,
              errorType,
              message: err.message,
              timestamp: new Date(await ctx.date.now()),
              retryable,
              stackTrace: err.stack,
            });

            // Mark media download as failed in database using ctx.serviceClient()
            try {
              await ctx.serviceClient(databaseUpdateService).markMediaFailed({
                bookmarkId,
                workflowId,
                userId,
                originalUrl: url,
                errorMessage: err.message,
              });
            } catch (dbError) {
              logger.warn("Failed to mark media download as failed", {
                bookmarkId,
                error: (dbError as Error).message,
              });
            }

            // Media download failure is not critical, continue
          }
        } else {
          if (!enableMediaDownload) {
            logger.info("Media download disabled by workflow input, skipping", {
              step: WorkflowStep.MEDIA_DETECTION,
              reason: "disabled_by_input",
            });
          } else if (!mediaDownloadEnabled) {
            logger.info("Media download disabled by feature flag, skipping", {
              step: WorkflowStep.MEDIA_DETECTION,
              reason: "disabled_by_flag",
            });
          }
        }

        const dbUpdateTimer = startTimer(WorkflowStep.DATABASE_UPDATE, logger);

        try {
          logger.info(`Step ${WorkflowStep.DATABASE_UPDATE} started`, {
            step: WorkflowStep.DATABASE_UPDATE,
          });

          const hasErrors = (result.errors?.length ?? 0) > 0;
          const hasSummary = !!result.summary;
          const hasMedia = !!(
            result.mediaMetadata && result.mediaMetadata.length > 0
          );

          const finalStatus: ProcessingStatus = determineFinalStatus(
            hasErrors,
            hasSummary,
            hasMedia
          );

          // Call database update service using ctx.serviceClient() to update enrichment
          await ctx.serviceClient(databaseUpdateService).updateEnrichment({
            bookmarkId,
            workflowId,
            userId,
            summary: result.summary,
            keywords: result.keywords,
            tags: result.tags,
            status: finalStatus,
            errors: result.errors,
          });

          dbUpdateTimer.end(true, {
            status: finalStatus,
            hasSummary,
            hasMedia,
            errorsCount: result.errors?.length ?? 0,
          });

          result.success = finalStatus !== "FAILED";
          result.executionTimeMs = (await ctx.date.now()) - workflowStartTime;

          // Log workflow completion with final status
          logger.info("Workflow completed", {
            status: finalStatus,
            duration: result.executionTimeMs,
            success: result.success,
            errorsCount: result.errors?.length ?? 0,
            hasSummary,
            hasMedia,
            tokensUsed: result.tokensUsed,
          });

          return result;
        } catch (error) {
          const err = error as Error;
          dbUpdateTimer.end(false, { error: err.message });

          const errorType = classifyError(err);
          const retryable = isRetryableError(err);

          logger.error(`Step ${WorkflowStep.DATABASE_UPDATE} failed`, err, {
            step: WorkflowStep.DATABASE_UPDATE,
            duration: dbUpdateTimer.elapsed(),
            errorType,
            retryable,
          });

          result.errors?.push({
            step: WorkflowStep.DATABASE_UPDATE,
            errorType,
            message: err.message,
            timestamp: new Date(await ctx.date.now()),
            retryable,
            stackTrace: err.stack,
          });

          throw err;
        }
      } catch (error) {
        const err = error as Error;
        const duration = (await ctx.date.now()) - workflowStartTime;

        logger.error("Workflow failed", err, {
          duration,
          errorsCount: result.errors?.length ?? 0,
        });

        result.success = false;
        result.executionTimeMs = duration;

        // Re-throw to let Restate handle the retry
        throw err;
      }
    },
  },
});

/**
 * Determines the final processing status based on workflow results
 */
function determineFinalStatus(
  hasErrors: boolean,
  hasSummary: boolean,
  hasMedia: boolean
): ProcessingStatus {
  if (!hasErrors && (hasSummary || hasMedia)) {
    return "COMPLETED";
  }

  if (hasErrors && (hasSummary || hasMedia)) {
    return "PARTIAL_SUCCESS";
  }

  if (hasErrors) {
    return "FAILED";
  }

  return "COMPLETED";
}
