/**
 * Media download service for Restate workflows
 *
 * Downloads media files from URLs using Cobalt API
 */

import * as restate from "@restatedev/restate-sdk";
import type { DownloadResult } from "../types";
import { throwAppropriateError } from "../lib/errors";
import { createWorkflowLogger } from "../lib/logger";

/**
 * Input for media download service
 */
export interface MediaDownloadInput {
  url: string;
  bookmarkId: string;
  workflowId: string;
  userId: string;
  maxSizeMB?: number;
  quality?: string;
}

/**
 * Media download service
 * Uses ctx.run() for download operations to ensure durability
 */
export const mediaDownloadService = restate.service({
  name: "MediaDownloadService",
  handlers: {
    download: async (
      ctx: restate.Context,
      input: MediaDownloadInput
    ): Promise<DownloadResult> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      const maxSizeMB = input.maxSizeMB || 500;

      logger.info("Starting media download", {
        url: input.url,
        maxSizeMB,
      });

      try {
        // Download media using ctx.run() for durability
        const result = await ctx.run("download-media", async () => {
          const { downloadMedia } = await import("@favy/media-downloader");

          // Calculate max size in bytes
          const maxSizeBytes = maxSizeMB * 1024 * 1024;

          // Download media
          return await downloadMedia(input.url, {
            maxSize: maxSizeBytes,
            quality: input.quality || "1080", // Default to 1080p
          });
        });

        if (!result.success) {
          throw new Error(result.error || "Media download failed");
        }

        logger.info("Media download completed successfully", {
          filePath: result.filePath,
          fileSize: result.metadata.fileSize,
          format: result.metadata.format,
          quality: result.metadata.quality,
          duration: result.metadata.duration,
        });

        return result;
      } catch (error) {
        logger.error("Media download failed", error as Error, {
          url: input.url,
        });

        // Re-throw with appropriate error handling
        throwAppropriateError(error as Error, {
          step: "media-download",
          bookmarkId: input.bookmarkId,
          url: input.url,
        });
      }
    },
  },
});
