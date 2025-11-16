import { logger } from "@trigger.dev/sdk";
import type { MediaDetectionResult } from "../types";

/**
 * Media detection step - Check if URL contains downloadable media
 * @param url - URL to check for media
 * @param bookmarkId - Bookmark ID for logging
 * @param enableMediaDownload - Feature flag to check if media download is enabled
 * @returns Media detection result
 * @throws Error if detection fails critically
 */
export async function detectMediaContent(
  url: string,
  bookmarkId: string,
  enableMediaDownload: boolean
): Promise<MediaDetectionResult> {
  logger.info("Starting media detection", {
    bookmarkId,
    url,
    enableMediaDownload,
  });

  // Check if media download is enabled
  if (!enableMediaDownload) {
    logger.info("Media download disabled, skipping detection", {
      bookmarkId,
    });
    return {
      hasMedia: false,
    };
  }

  try {
    // Import media downloader service
    const { detectMedia } = await import("@favy/media-downloader");

    // Detect media
    const result = await detectMedia(url);

    logger.info("Media detection completed", {
      bookmarkId,
      hasMedia: result.hasMedia,
      mediaType: result.mediaType,
      quality: result.quality,
      estimatedSize: result.estimatedSize,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    logger.warn("Media detection failed, continuing without media", {
      bookmarkId,
      error: err.message,
    });

    // Return false for detection rather than throwing
    // This allows the workflow to continue without media
    return {
      hasMedia: false,
    };
  }
}

/**
 * Check if media download should be attempted based on detection result
 * @param detection - Media detection result
 * @param maxSizeMB - Maximum allowed file size in MB
 * @returns True if download should be attempted
 */
export function shouldDownloadMedia(
  detection: MediaDetectionResult,
  maxSizeMB: number = 500
): boolean {
  if (!detection.hasMedia) {
    return false;
  }

  // Check estimated size if available
  if (detection.estimatedSize) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (detection.estimatedSize > maxSizeBytes) {
      logger.warn("Media size exceeds maximum, skipping download", {
        estimatedSize: detection.estimatedSize,
        maxSize: maxSizeBytes,
      });
      return false;
    }
  }

  return true;
}
