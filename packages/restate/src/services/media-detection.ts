/**
 * Media detection service for Restate workflows
 *
 * Checks if URLs contain downloadable media content
 */

import * as restate from "@restatedev/restate-sdk";
import type { MediaDetectionResult } from "../types";
import { createWorkflowLogger } from "../lib/logger";

/**
 * Input for media detection service
 */
export interface MediaDetectionInput {
  url: string;
  bookmarkId: string;
  workflowId: string;
  userId: string;
  enableMediaDownload: boolean;
  maxSizeMB?: number;
}

/**
 * Media detection service
 * Uses ctx.run() for non-deterministic operations
 */
export const mediaDetectionService = restate.service({
  name: "MediaDetectionService",
  handlers: {
    detect: async (
      ctx: restate.Context,
      input: MediaDetectionInput
    ): Promise<MediaDetectionResult> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Starting media detection", {
        url: input.url,
        enableMediaDownload: input.enableMediaDownload,
      });

      // Check if media download is enabled
      if (!input.enableMediaDownload) {
        logger.info("Media download disabled, skipping detection");
        return {
          hasMedia: false,
        };
      }

      try {
        // Detect media using ctx.run() for durability
        const result = await ctx.run("detect-media", async () => {
          const { detectMedia } = await import("@favy/media-downloader");
          return await detectMedia(input.url);
        });

        logger.info("Media detection completed", {
          hasMedia: result.hasMedia,
          mediaType: result.mediaType,
          quality: result.quality,
          estimatedSize: result.estimatedSize,
        });

        // Check if media should be downloaded based on size
        if (result.hasMedia && result.estimatedSize && input.maxSizeMB) {
          const maxSizeBytes = input.maxSizeMB * 1024 * 1024;
          if (result.estimatedSize > maxSizeBytes) {
            logger.warn(
              "Media size exceeds maximum, marking as not downloadable",
              {
                estimatedSize: result.estimatedSize,
                maxSize: maxSizeBytes,
              }
            );
            return {
              hasMedia: false,
            };
          }
        }

        return result;
      } catch (error) {
        logger.warn(
          "Media detection failed, continuing without media",
          error as Error
        );

        // Return false for detection rather than throwing
        // This allows the workflow to continue without media
        return {
          hasMedia: false,
        };
      }
    },
  },
});
