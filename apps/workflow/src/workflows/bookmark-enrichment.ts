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
 * to ensure durable execution. Uses neverthrow for functional error handling
 * and ts-pattern for pattern matching.
 */

import { WorkflowStep } from "@favy/db";
import { DictProcessingStatus } from "@favy/shared";
import * as restate from "@restatedev/restate-sdk";
import { err, ok, ResultAsync } from "neverthrow";
import { match } from "ts-pattern";
import { classify_error, is_retryable_error } from "@/lib/errors";
import { create_workflow_logger } from "@/lib/logger";
import { content_retrieval_service } from "@/services/content-retrieval";
import { database_update_service } from "@/services/database-update";
import { media_detection_service } from "@/services/media-detection";
import { media_download_service } from "@/services/media-download";
import { storage_upload_service } from "@/services/storage-upload";
import { summarization_service } from "@/services/summarization";
import type {
  IBookmarkEnrichmentInput,
  IBookmarkEnrichmentOutput,
  TProcessingStatus,
} from "@/types";

/**
 * Bookmark enrichment workflow as a Restate Virtual Object
 * Uses the bookmark ID as the key for state management
 */
export const bookmark_enrichment_workflow = restate.object({
  name: "bookmark_enrichment",
  handlers: {
    /**
     * Main enrichment handler
     * Orchestrates all enrichment steps with functional error handling
     */
    enrich: async (
      ctx: restate.ObjectContext,
      payload: IBookmarkEnrichmentInput,
    ): Promise<IBookmarkEnrichmentOutput> => {
      const {
        bookmarkId,
        userId,
        platform,
        url,
        content,
        enable_media_download,
      } = payload;

      const workflowId = await ctx.rand.uuidv4();
      const logger = create_workflow_logger({
        workflowId,
        bookmarkId,
        userId,
      });
      const workflowStartTime = await ctx.date.now();
      logger.info("Workflow started", {
        platform,
        url,
        enable_media_download,
      });

      const result: IBookmarkEnrichmentOutput = {
        success: false,
        errors: [],
      };

      const content_result = await ResultAsync.fromPromise(
        ctx.serviceClient(content_retrieval_service).retrieve({
          url,
          platform,
          fallbackContent: content,
          bookmarkId,
          workflowId,
          userId,
        }),
        (error) => error as Error,
      );

      const full_content = content_result.match(
        (retrieved) =>
          retrieved.success && retrieved.content.length > content.length
            ? retrieved.content
            : content,
        (error) => {
          result.errors?.push({
            step: WorkflowStep.CONTENT_RETRIEVAL,
            errorType: classify_error(error),
            message: error.message,
            timestamp: new Date(workflowStartTime),
            retryable: false,
            stackTrace: error.stack,
          });
          return content;
        },
      );

      const is_ai_summarization_enabled =
        process.env.ENABLE_AI_SUMMARIZATION !== "false";
      const is_media_download_enabled =
        process.env.ENABLE_MEDIA_DOWNLOAD !== "false";
      const allow_process_media =
        enable_media_download && is_media_download_enabled;

      let has_summary = false;
      let initial_status = DictProcessingStatus.PENDING;

      if (is_ai_summarization_enabled) {
        const summary_result = await ResultAsync.fromPromise(
          ctx.serviceClient(summarization_service).summarize({
            content: full_content,
            bookmarkId,
            workflowId,
            userId,
          }),
          (error) => error as Error,
        );

        await summary_result.match(
          (summary) => {
            result.summary = summary.summary;
            result.keywords = summary.keywords;
            result.tags = summary.tags;
            result.tokensUsed = summary.tokensUsed;
            return ok(undefined);
          },
          async (error) => {
            const errorType = classify_error(error);
            const retryable = is_retryable_error(error);

            result.errors?.push({
              step: WorkflowStep.SUMMARIZATION,
              errorType,
              message: error.message,
              timestamp: new Date(await ctx.date.now()),
              retryable,
              stackTrace: error.stack,
            });

            if (retryable) {
              throw error;
            }
            return err(error);
          },
        );

        has_summary = !!result.summary;
        const initial_status = determine_status_after_summarization(
          has_summary,
          allow_process_media,
          (result.errors?.length ?? 0) > 0,
        );

        const initial_db_update_result = await ResultAsync.fromPromise(
          ctx.serviceClient(database_update_service).update_enrichment({
            bookmarkId,
            workflowId,
            userId,
            summary: result.summary,
            keywords: result.keywords,
            tags: result.tags,
            status: initial_status,
            errors: result.errors,
          }),
          (error) => error as Error,
        );

        await initial_db_update_result.match(
          () => ok(undefined),
          async (error) => {
            const errorType = classify_error(error);
            const retryable = is_retryable_error(error);

            result.errors?.push({
              step: WorkflowStep.DATABASE_UPDATE,
              errorType,
              message: error.message,
              timestamp: new Date(await ctx.date.now()),
              retryable,
              stackTrace: error.stack,
            });

            throw error;
          },
        );
      }

      if (allow_process_media) {
        const max_size_mb = Number.parseInt(
          process.env.MAX_MEDIA_SIZE_MB || "500",
          10,
        );

        const media_result = await ResultAsync.fromPromise(
          ctx.serviceClient(media_detection_service).detect({
            url,
            bookmarkId,
            workflowId,
            userId,
            enableMediaDownload: allow_process_media,
            maxSizeMB: max_size_mb,
          }),
          (error) => error as Error,
        );

        await media_result.match(
          async (detection) => {
            if (!detection.hasMedia) {
              return ok(undefined);
            }

            const downloadResult = await ResultAsync.fromPromise(
              ctx.serviceClient(media_download_service).download({
                url,
                bookmarkId,
                workflowId,
                userId,
                maxSizeMB: max_size_mb,
                quality: detection.quality,
              }),
              (error) => error as Error,
            );

            return await downloadResult.match(
              async (download) => {
                if (!download.success || !download.filePath) {
                  return ok(undefined);
                }
                const uploadResult = await ResultAsync.fromPromise(
                  ctx.serviceClient(storage_upload_service).upload({
                    filePath: download.filePath,
                    bookmarkId,
                    workflowId,
                    userId,
                    metadata: download.metadata,
                  }),
                  (error) => error as Error,
                );

                return await uploadResult.match(
                  async (upload) => {
                    result.mediaMetadata = [
                      {
                        ...download.metadata,
                        storagePath: upload.key,
                        storageUrl: upload.url,
                      },
                    ];

                    await ctx
                      .serviceClient(database_update_service)
                      .create_media_record({
                        bookmarkId,
                        workflowId,
                        userId,
                        metadata: download.metadata,
                        uploadResult: upload,
                        originalUrl: url,
                      });

                    return ok(undefined);
                  },
                  (error) => {
                    result.errors?.push({
                      step: WorkflowStep.STORAGE_UPLOAD,
                      errorType: classify_error(error),
                      message: error.message,
                      timestamp: new Date(workflowStartTime),
                      retryable: false,
                      stackTrace: error.stack,
                    });
                    return err(error);
                  },
                );
              },
              async (error) => {
                const errorType = classify_error(error);
                result.errors?.push({
                  step: WorkflowStep.MEDIA_DOWNLOAD,
                  errorType,
                  message: error.message,
                  timestamp: new Date(await ctx.date.now()),
                  retryable: false,
                  stackTrace: error.stack,
                });
                await ResultAsync.fromPromise(
                  ctx.serviceClient(database_update_service).mark_media_failed({
                    bookmarkId,
                    workflowId,
                    userId,
                    originalUrl: url,
                    errorMessage: error.message,
                  }),
                  () => undefined,
                );

                return err(error);
              },
            );
          },
          async (error) => {
            result.errors?.push({
              step: WorkflowStep.MEDIA_DETECTION,
              errorType: classify_error(error),
              message: error.message,
              timestamp: new Date(await ctx.date.now()),
              retryable: false,
              stackTrace: error.stack,
            });
            return err(error);
          },
        );

        const has_media = !!(
          result.mediaMetadata && result.mediaMetadata.length > 0
        );
        const media_errors = result.errors?.filter(
          (e) =>
            e.step === WorkflowStep.MEDIA_DETECTION ||
            e.step === WorkflowStep.MEDIA_DOWNLOAD ||
            e.step === WorkflowStep.STORAGE_UPLOAD,
        );
        const has_media_errors = (media_errors?.length ?? 0) > 0;

        const final_status = determine_status_after_media(
          has_summary,
          has_media,
          has_media_errors,
        );

        const media_db_update_result = await ResultAsync.fromPromise(
          ctx
            .serviceClient(database_update_service)
            .update_enrichment_after_media({
              bookmarkId,
              workflowId,
              userId,
              status: final_status,
              errors: media_errors,
            }),
          (error) => error as Error,
        );

        await media_db_update_result.match(
          () => ok(undefined),
          async (error) => {
            const errorType = classify_error(error);
            const retryable = is_retryable_error(error);

            result.errors?.push({
              step: WorkflowStep.DATABASE_UPDATE,
              errorType,
              message: error.message,
              timestamp: new Date(await ctx.date.now()),
              retryable,
              stackTrace: error.stack,
            });

            throw error;
          },
        );
      }

      const final_status =
        allow_process_media && result.mediaMetadata
          ? determine_status_after_media(
            has_summary,
            !!(result.mediaMetadata && result.mediaMetadata.length > 0),
            (result.errors?.filter(
              (e) =>
                e.step === WorkflowStep.MEDIA_DETECTION ||
                e.step === WorkflowStep.MEDIA_DOWNLOAD ||
                e.step === WorkflowStep.STORAGE_UPLOAD,
            ).length ?? 0) > 0,
          )
          : initial_status;

      result.success = final_status !== DictProcessingStatus.FAILED;
      result.executionTimeMs = Date.now() - workflowStartTime;

      logger.info("Workflow completed", {
        status: final_status,
        duration: result.executionTimeMs,
        success: result.success,
      });

      return result;
    },
  },
});

/**
 * Determines the status after summarization completes
 * Uses pattern matching for clear, declarative logic
 */
function determine_status_after_summarization(
  has_summary: boolean,
  media_download_enabled: boolean,
  has_errors: boolean,
): TProcessingStatus {
  return match({ has_summary, media_download_enabled, has_errors })
    .with(
      { has_summary: true, media_download_enabled: true, has_errors: false },
      () => DictProcessingStatus.PARTIAL_SUCCESS,
    )
    .with(
      { has_summary: true, media_download_enabled: false, has_errors: false },
      () => DictProcessingStatus.COMPLETED,
    )
    .with(
      { has_summary: true, has_errors: true },
      () => DictProcessingStatus.PARTIAL_SUCCESS,
    )
    .with(
      { has_summary: false, has_errors: true },
      () => DictProcessingStatus.FAILED,
    )
    .otherwise(() => DictProcessingStatus.COMPLETED);
}

/**
 * Determines the final status after media processing completes
 * Uses pattern matching for clear, declarative logic
 */
function determine_status_after_media(
  has_summary: boolean,
  has_media: boolean,
  has_media_errors: boolean,
): TProcessingStatus {
  return match({ has_summary, has_media, has_media_errors })
    .with(
      { has_summary: true, has_media: true, has_media_errors: false },
      () => DictProcessingStatus.COMPLETED,
    )
    .with(
      { has_summary: true, has_media: false, has_media_errors: true },
      () => DictProcessingStatus.PARTIAL_SUCCESS,
    )
    .with(
      { has_summary: true, has_media_errors: true },
      () => DictProcessingStatus.PARTIAL_SUCCESS,
    )
    .with(
      { has_summary: false },
      () => DictProcessingStatus.FAILED,
    )
    .otherwise(() => DictProcessingStatus.COMPLETED);
}
