import { logger } from "@trigger.dev/sdk";
import type { UploadResult, MediaMetadata } from "../types";

/**
 * Storage upload step - Upload media file to S3-compatible storage
 * @param filePath - Local file path to upload
 * @param bookmarkId - Bookmark ID for key generation
 * @param metadata - Media metadata to attach
 * @returns Upload result with storage key and URL
 * @throws Error if upload fails
 */
export async function uploadMediaToStorage(
  filePath: string,
  bookmarkId: string,
  metadata: MediaMetadata
): Promise<UploadResult> {
  logger.info("Starting media upload to storage", {
    bookmarkId,
    filePath,
    fileSize: metadata.fileSize,
  });

  try {
    // Import storage service
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
      bookmarkId,
      type: metadata.type,
      format: metadata.format || "unknown",
      fileSize: metadata.fileSize.toString(),
    };

    if (metadata.quality) {
      storageMetadata.quality = metadata.quality;
    }

    if (metadata.duration) {
      storageMetadata.duration = metadata.duration.toString();
    }

    if (metadata.width) {
      storageMetadata.width = metadata.width.toString();
    }

    if (metadata.height) {
      storageMetadata.height = metadata.height.toString();
    }

    // Upload file with automatic key generation and cleanup
    const result = await storage.uploadFileFromPathWithGeneratedKey(
      client,
      bucket,
      filePath,
      bookmarkId,
      storageMetadata,
      true // Clean up temp file after upload
    );

    logger.info("Media uploaded to storage successfully", {
      bookmarkId,
      storageKey: result.key,
      storageUrl: result.url,
      size: result.size,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    logger.error("Storage upload failed", {
      bookmarkId,
      filePath,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Generate presigned URL for media access
 * @param storageKey - Storage key of the file
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns Presigned URL
 */
export async function generatePresignedUrl(
  storageKey: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  try {
    const storage = await import("@favy/storage");

    const bucket = process.env.S3_BUCKET || "bookmark-media";

    const client = storage.createS3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION || "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
      bucket: bucket,
    });

    return await storage.getFileUrl(client, bucket, storageKey, expiresIn);
  } catch (error) {
    logger.error("Failed to generate presigned URL", {
      storageKey,
      error,
    });
    throw error;
  }
}

/**
 * Delete media file from storage
 * @param storageKey - Storage key of the file to delete
 */
export async function deleteMediaFromStorage(
  storageKey: string
): Promise<void> {
  try {
    const storage = await import("@favy/storage");

    const bucket = process.env.S3_BUCKET || "bookmark-media";

    const client = storage.createS3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION || "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
      bucket: bucket,
    });

    await storage.deleteFile(client, bucket, storageKey);

    logger.info("Media deleted from storage", { storageKey });
  } catch (error) {
    logger.error("Failed to delete media from storage", {
      storageKey,
      error,
    });
    throw error;
  }
}

/**
 * Validate storage upload result
 * @param result - Upload result to validate
 * @returns True if valid
 */
export function validateUploadResult(result: UploadResult): boolean {
  if (!result.key || !result.url) {
    throw new Error("Upload result is missing key or URL");
  }

  if (!result.size || result.size <= 0) {
    throw new Error("Upload result has invalid size");
  }

  return true;
}
