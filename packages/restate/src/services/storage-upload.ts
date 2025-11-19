/**
 * Storage upload service for Restate workflows
 *
 * Uploads media files to S3-compatible storage
 */

import * as restate from "@restatedev/restate-sdk";
import type { UploadResult, MediaMetadata } from "../types";
import { throwAppropriateError } from "../lib/errors";
import { createWorkflowLogger } from "../lib/logger";

export interface StorageUploadInput {
  filePath: string;
  bookmarkId: string;
  workflowId: string;
  userId: string;
  metadata: MediaMetadata;
}

export const storageUploadService = restate.service({
  name: "StorageUploadService",
  handlers: {
    upload: async (
      ctx: restate.Context,
      input: StorageUploadInput
    ): Promise<UploadResult> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Starting media upload to storage", {
        filePath: input.filePath,
        fileSize: input.metadata.fileSize,
      });

      try {
        // Upload to storage using ctx.run() for durability
        const result = await ctx.run("upload-to-storage", async () => {
          const storage = await import("@favy/storage");

          // Get S3 configuration from environment
          const bucket = process.env.S3_BUCKET || "bookmark-media";

          // Create S3 client
          const client = storage.createS3Client({
            endpoint: process.env.S3_ENDPOINT!,
            region: process.env.S3_REGION || "us-east-1",
            accessKeyId: process.env.S3_ACCESS_KEY!,
            secretAccessKey: process.env.S3_SECRET_KEY!,
            bucket: bucket,
          });

          // Prepare metadata for storage
          const storageMetadata: Record<string, string> = {
            bookmarkId: input.bookmarkId,
            type: input.metadata.type,
            format: input.metadata.format || "unknown",
            fileSize: input.metadata.fileSize.toString(),
          };

          if (input.metadata.quality) {
            storageMetadata.quality = input.metadata.quality;
          }

          if (input.metadata.duration) {
            storageMetadata.duration = input.metadata.duration.toString();
          }

          if (input.metadata.width) {
            storageMetadata.width = input.metadata.width.toString();
          }

          if (input.metadata.height) {
            storageMetadata.height = input.metadata.height.toString();
          }

          // Upload file with automatic key generation and cleanup
          return await storage.uploadFileFromPathWithGeneratedKey(
            client,
            bucket,
            input.filePath,
            input.bookmarkId,
            storageMetadata,
            true // Clean up temp file after upload
          );
        });

        logger.info("Media uploaded to storage successfully", {
          storageKey: result.key,
          storageUrl: result.url,
          size: result.size,
        });

        return result;
      } catch (error) {
        logger.error("Storage upload failed", error as Error, {
          filePath: input.filePath,
        });

        // Re-throw with appropriate error handling
        throwAppropriateError(error as Error, {
          step: "storage-upload",
          bookmarkId: input.bookmarkId,
          filePath: input.filePath,
        });
      }
    },
  },
});
