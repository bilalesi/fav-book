import { task } from "@trigger.dev/sdk/v3";
import type {
  BookmarkEnrichmentInput,
  BookmarkEnrichmentOutput,
  WorkflowStep,
} from "../types";
import { isRetryableError } from "../types";
import { getFeatureFlag } from "@my-better-t-app/shared";
import {
  createLogger,
  createWorkflowLogContext,
  PerformanceTimer,
} from "../lib/logger";
import { createWorkflowError } from "../lib/errors";

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
    maxAttempts: getFeatureFlag("WORKFLOW_RETRY_ATTEMPTS"),
    factor: 3,
    minTimeoutInMs: getFeatureFlag("WORKFLOW_RETRY_DELAY_MS"),
    maxTimeoutInMs: getFeatureFlag("WORKFLOW_RETRY_DELAY_MS") * 9, // 3^2 factor
    randomize: true,
  },
  run: async (payload: BookmarkEnrichmentInput, { ctx }) => {
    const { bookmarkId, userId, platform, url, content, enableMediaDownload } =
      payload;

    // Create structured logger with correlation IDs
    const logContext = createWorkflowLogContext(bookmarkId, userId, ctx.run.id);
    const logger = createLogger(logContext);
    const workflowTimer = new PerformanceTimer();

    const startTime = logger.workflowStart({
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
      // Step 1: Content Retrieval
      const contentRetrievalTimer = new PerformanceTimer();
      const stepStartTime = logger.stepStart(
        "content_retrieval" as WorkflowStep
      );
      let fullContent = content;

      try {
        // Import content retrieval task dynamically to avoid circular dependencies
        const { retrieveContent } = await import("../tasks/content-retrieval");
        fullContent = await retrieveContent(url, platform, content);

        logger.stepComplete(
          "content_retrieval" as WorkflowStep,
          stepStartTime,
          {
            contentLength: fullContent.length,
            originalLength: content.length,
          }
        );

        contentRetrievalTimer.logMetrics(logger, "content_retrieval");
      } catch (error) {
        const err = error as Error;
        logger.stepFailed(
          "content_retrieval" as WorkflowStep,
          stepStartTime,
          err,
          {
            originalContentLength: content.length,
          }
        );

        // Non-critical error, continue with original content
        result.errors?.push({
          step: "content_retrieval" as WorkflowStep,
          message: err.message,
          timestamp: new Date(),
          retryable: false,
          stackTrace: err.stack,
        });
      }

      // Step 2: AI Summarization
      const aiSummarizationEnabled = getFeatureFlag("ENABLE_AI_SUMMARIZATION");

      if (aiSummarizationEnabled) {
        const summarizationTimer = new PerformanceTimer();
        const stepStartTime = logger.stepStart(
          "summarization" as WorkflowStep,
          {
            contentLength: fullContent.length,
          }
        );

        try {
          const { summarizeContent, updateBookmarkSummary } = await import(
            "../tasks/summarization"
          );

          // Generate summary, keywords, and tags
          const summaryResult = await summarizeContent(fullContent, bookmarkId);
          result.summary = summaryResult.summary;
          result.keywords = summaryResult.keywords;
          result.tags = summaryResult.tags;
          result.tokensUsed = summaryResult.tokensUsed;

          // Update bookmark with summary data
          await updateBookmarkSummary(bookmarkId, summaryResult);

          logger.stepComplete("summarization" as WorkflowStep, stepStartTime, {
            summaryLength: summaryResult.summary.length,
            keywordsCount: summaryResult.keywords.length,
            tagsCount: summaryResult.tags.length,
            tokensUsed: summaryResult.tokensUsed,
          });

          summarizationTimer.logMetrics(logger, "summarization", {
            tokensUsed: summaryResult.tokensUsed,
          });
        } catch (error) {
          const err = error as Error;
          const workflowError = createWorkflowError(
            err,
            "summarization" as WorkflowStep,
            {
              contentLength: fullContent.length,
            }
          );

          logger.stepFailed(
            "summarization" as WorkflowStep,
            stepStartTime,
            err,
            {
              errorType: workflowError.errorType,
              retryable: workflowError.retryable,
            }
          );

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
      } else {
        logger.info("AI summarization disabled by feature flag, skipping", {
          step: "summarization",
        });
      }

      // Step 3: Media Detection and Download (if enabled)
      const mediaDownloadEnabled = getFeatureFlag("ENABLE_MEDIA_DOWNLOAD");
      const shouldProcessMedia = enableMediaDownload && mediaDownloadEnabled;

      if (shouldProcessMedia) {
        const mediaTimer = new PerformanceTimer();
        const stepStartTime = logger.stepStart(
          "media_detection" as WorkflowStep,
          {
            url,
          }
        );

        try {
          const { detectMediaContent, shouldDownloadMedia } = await import(
            "../tasks/media-detection"
          );

          // Detect media in content
          const mediaDetection = await detectMediaContent(
            url,
            bookmarkId,
            shouldProcessMedia
          );

          // Check if we should proceed with download
          const maxSizeMB = getFeatureFlag("MAX_MEDIA_SIZE_MB");
          if (
            mediaDetection.hasMedia &&
            shouldDownloadMedia(mediaDetection, maxSizeMB)
          ) {
            logger.stepComplete(
              "media_detection" as WorkflowStep,
              stepStartTime,
              {
                hasMedia: true,
                mediaType: mediaDetection.mediaType,
                estimatedSize: mediaDetection.estimatedSize,
              }
            );

            // Step 4: Download media
            const downloadTimer = new PerformanceTimer();
            const downloadStartTime = logger.stepStart(
              "media_download" as WorkflowStep,
              {
                mediaType: mediaDetection.mediaType,
                maxSizeMB,
              }
            );

            const { downloadMediaFile, enrichMediaMetadata } = await import(
              "../tasks/media-download"
            );

            const downloadResult = await downloadMediaFile(
              url,
              bookmarkId,
              maxSizeMB
            );

            if (downloadResult.success && downloadResult.filePath) {
              logger.stepComplete(
                "media_download" as WorkflowStep,
                downloadStartTime,
                {
                  fileSize: downloadResult.metadata.fileSize,
                  format: downloadResult.metadata.format,
                  duration: downloadResult.metadata.duration,
                }
              );

              downloadTimer.logMetrics(logger, "media_download", {
                fileSize: downloadResult.metadata.fileSize,
              });

              // Step 5: Upload to S3
              const uploadTimer = new PerformanceTimer();
              const uploadStartTime = logger.stepStart(
                "storage_upload" as WorkflowStep,
                {
                  fileSize: downloadResult.metadata.fileSize,
                }
              );

              const { uploadMediaToStorage } = await import(
                "../tasks/storage-upload"
              );

              const uploadResult = await uploadMediaToStorage(
                downloadResult.filePath,
                bookmarkId,
                downloadResult.metadata
              );

              // Enrich metadata with storage info
              const enrichedMetadata = enrichMediaMetadata(
                downloadResult.metadata,
                url
              );

              result.mediaMetadata = [
                {
                  ...enrichedMetadata,
                  storagePath: uploadResult.key,
                  storageUrl: uploadResult.url,
                },
              ];

              // Create database record for downloaded media
              const { createDownloadedMediaRecord } = await import(
                "../tasks/database-update"
              );

              await createDownloadedMediaRecord(
                bookmarkId,
                enrichedMetadata,
                uploadResult,
                url
              );

              logger.stepComplete(
                "storage_upload" as WorkflowStep,
                uploadStartTime,
                {
                  storageKey: uploadResult.key,
                  uploadSize: uploadResult.size,
                }
              );

              uploadTimer.logMetrics(logger, "storage_upload", {
                fileSize: uploadResult.size,
              });

              mediaTimer.logMetrics(logger, "media_processing_total", {
                fileSize: uploadResult.size,
              });
            }
          } else {
            logger.stepComplete(
              "media_detection" as WorkflowStep,
              stepStartTime,
              {
                hasMedia: mediaDetection.hasMedia,
                reason: !mediaDetection.hasMedia
                  ? "no_media"
                  : "size_exceeds_limit",
              }
            );
          }
        } catch (error) {
          const err = error as Error;
          const workflowError = createWorkflowError(
            err,
            "media_download" as WorkflowStep,
            {
              url,
            }
          );

          logger.stepFailed(
            "media_download" as WorkflowStep,
            stepStartTime,
            err,
            {
              errorType: workflowError.errorType,
              retryable: workflowError.retryable,
            }
          );

          result.errors?.push({
            step: "media_download" as WorkflowStep,
            message: err.message,
            timestamp: new Date(),
            retryable: isRetryableError(err),
            stackTrace: err.stack,
          });

          // Mark media download as failed in database
          try {
            const { markMediaDownloadFailed } = await import(
              "../tasks/database-update"
            );
            await markMediaDownloadFailed(bookmarkId, url, err.message);
          } catch (dbError) {
            logger.warn("Failed to mark media download as failed", {
              bookmarkId,
              error: dbError,
            });
          }

          // Media download failure is not critical, continue
        }
      } else {
        if (!enableMediaDownload) {
          logger.info("Media download disabled by workflow input, skipping", {
            step: "media_detection",
            reason: "disabled_by_input",
          });
        } else if (!mediaDownloadEnabled) {
          logger.info("Media download disabled by feature flag, skipping", {
            step: "media_detection",
            reason: "disabled_by_flag",
          });
        }
      }

      // Step 6: Update database with final status
      const dbUpdateTimer = new PerformanceTimer();
      const dbUpdateStartTime = logger.stepStart(
        "database_update" as WorkflowStep
      );

      try {
        const { determineFinalStatus, updateBookmarkEnrichment } = await import(
          "../tasks/database-update"
        );

        // Determine final status
        const hasErrors = (result.errors?.length ?? 0) > 0;
        const hasSummary = !!result.summary;
        const hasMedia = !!(
          result.mediaMetadata && result.mediaMetadata.length > 0
        );

        const finalStatus = determineFinalStatus(
          hasErrors,
          hasSummary,
          hasMedia
        );

        // Update bookmark with final enrichment data
        await updateBookmarkEnrichment(bookmarkId, ctx.run.id, {
          summary: result.summary,
          keywords: result.keywords,
          tags: result.tags,
          status: finalStatus,
          errors: result.errors,
        });

        logger.stepComplete(
          "database_update" as WorkflowStep,
          dbUpdateStartTime,
          {
            status: finalStatus,
            hasSummary,
            hasMedia,
            errorsCount: result.errors?.length ?? 0,
          }
        );

        dbUpdateTimer.logMetrics(logger, "database_update");

        result.success = finalStatus !== "FAILED";
        result.executionTimeMs = Date.now() - startTime;

        logger.workflowComplete(startTime, result.success, {
          status: finalStatus,
          errorsCount: result.errors?.length ?? 0,
          hasSummary,
          hasMedia,
          tokensUsed: result.tokensUsed,
        });

        workflowTimer.logMetrics(logger, "workflow_total", {
          status: finalStatus,
          tokensUsed: result.tokensUsed,
        });

        return result;
      } catch (error) {
        const err = error as Error;
        const workflowError = createWorkflowError(
          err,
          "database_update" as WorkflowStep
        );

        logger.stepFailed(
          "database_update" as WorkflowStep,
          dbUpdateStartTime,
          err,
          {
            errorType: workflowError.errorType,
            retryable: workflowError.retryable,
          }
        );

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
      logger.workflowFailed(startTime, err, {
        errorsCount: result.errors?.length ?? 0,
      });

      // Update bookmark status to FAILED
      try {
        const { updateBookmarkStatus } = await import(
          "../tasks/database-update"
        );
        await updateBookmarkStatus(bookmarkId, "FAILED", err.message);
      } catch (dbError) {
        const dbErr = dbError as Error;
        logger.error("Failed to update bookmark status to FAILED", dbErr, {
          bookmarkId,
        });
      }

      result.success = false;
      result.executionTimeMs = Date.now() - startTime;

      // Re-throw to let Trigger.dev handle the retry
      throw err;
    }
  },
});
