import { logger } from "@trigger.dev/sdk/v3";
import type { DownloadResult, MediaMetadata } from "../types";

/**
 * Media download step - Download media from URL using Cobalt API
 * @param url - URL to download media from
 * @param bookmarkId - Bookmark ID for logging
 * @param maxSizeMB - Maximum file size in MB (default: 500)
 * @returns Download result with file path and metadata
 * @throws Error if download fails critically
 */
export async function downloadMediaFile(
  url: string,
  bookmarkId: string,
  maxSizeMB: number = 500
): Promise<DownloadResult> {
  logger.info("Starting media download", {
    bookmarkId,
    url,
    maxSizeMB,
  });

  try {
    // Import media downloader service
    const { downloadMedia } = await import("@my-better-t-app/media-downloader");

    // Calculate max size in bytes
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Download media
    const result = await downloadMedia(url, {
      maxSize: maxSizeBytes,
      quality: "1080", // Default to 1080p
    });

    if (!result.success) {
      throw new Error(result.error || "Media download failed");
    }

    logger.info("Media download completed successfully", {
      bookmarkId,
      filePath: result.filePath,
      fileSize: result.metadata.fileSize,
      format: result.metadata.format,
      quality: result.metadata.quality,
      duration: result.metadata.duration,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    logger.error("Media download failed", {
      bookmarkId,
      url,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Validate downloaded media file
 * @param result - Download result to validate
 * @param maxSizeMB - Maximum allowed file size in MB
 * @returns True if valid, throws error if invalid
 */
export function validateDownloadedMedia(
  result: DownloadResult,
  maxSizeMB: number = 500
): boolean {
  if (!result.success || !result.filePath) {
    throw new Error("Download result is invalid");
  }

  // Validate file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (result.metadata.fileSize > maxSizeBytes) {
    throw new Error(
      `File size (${result.metadata.fileSize} bytes) exceeds maximum (${maxSizeBytes} bytes)`
    );
  }

  // Validate metadata
  if (!result.metadata.type) {
    throw new Error("Media type is missing");
  }

  if (!result.metadata.format) {
    logger.warn("Media format is missing, using default");
  }

  return true;
}

/**
 * Extract and enrich media metadata
 * @param metadata - Base metadata from download
 * @param url - Original URL
 * @returns Enriched metadata
 */
export function enrichMediaMetadata(
  metadata: MediaMetadata,
  url: string
): MediaMetadata {
  return {
    ...metadata,
    originalUrl: url,
    // Add any additional enrichment here
  };
}

/**
 * Clean up temporary media file
 * @param filePath - Path to temporary file
 */
export async function cleanupMediaFile(filePath: string): Promise<void> {
  try {
    const { cleanupTempFile } = await import(
      "@my-better-t-app/media-downloader"
    );
    await cleanupTempFile(filePath);
    logger.info("Cleaned up temporary media file", { filePath });
  } catch (error) {
    logger.warn("Failed to cleanup temporary media file", {
      filePath,
      error,
    });
    // Don't throw - cleanup failure is not critical
  }
}
