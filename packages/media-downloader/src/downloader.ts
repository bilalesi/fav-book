import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getCobaltClient } from "./client";
import { detectMedia } from "./detector";
import type {
  DownloadOptions,
  DownloadResult,
  MediaMetadata,
  MediaType,
  CobaltApiRequest,
} from "./types";
import { MediaDownloadError, MediaErrorCodes } from "./types";

/**
 * Generate a unique temporary file path
 */
function generateTempFilePath(extension: string = "mp4"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const filename = `media_${timestamp}_${random}.${extension}`;
  return join(tmpdir(), filename);
}

/**
 * Determine file extension from format or URL
 */
function getFileExtension(format?: string, url?: string): string {
  if (format) {
    return format.toLowerCase();
  }

  if (url) {
    const match = url.match(/\.(\w+)(?:\?|$)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
  }

  return "mp4"; // Default
}

/**
 * Extract metadata from Cobalt response and file
 */
function extractMetadata(
  response: any,
  fileBuffer: Buffer,
  mediaType: MediaType
): MediaMetadata {
  const metadata: MediaMetadata = {
    type: mediaType,
    fileSize: fileBuffer.length,
  };

  // Extract format
  if (response.url) {
    const extension = getFileExtension(undefined, response.url);
    metadata.format = extension;
  }

  // Extract quality
  if (response.quality) {
    metadata.quality = response.quality;
  } else {
    // Try to infer from URL
    const qualityMatch = response.url?.match(/(\d+p)/);
    if (qualityMatch) {
      metadata.quality = qualityMatch[1];
    }
  }

  // Extract duration (if available in response)
  if (response.duration) {
    metadata.duration = response.duration;
  }

  // Extract dimensions (if available)
  if (response.width) {
    metadata.width = response.width;
  }
  if (response.height) {
    metadata.height = response.height;
  }

  // Extract thumbnail
  if (response.thumb) {
    metadata.thumbnailUrl = response.thumb;
  }

  return metadata;
}

/**
 * Build Cobalt API request from options
 */
function buildCobaltRequest(
  url: string,
  options?: DownloadOptions
): CobaltApiRequest {
  const request: CobaltApiRequest = {
    url,
    filenamePattern: "basic",
  };

  // Set video quality
  if (options?.videoQuality) {
    request.videoQuality = options.videoQuality;
  } else if (options?.quality) {
    request.videoQuality = options.quality;
  } else {
    request.videoQuality = "1080"; // Default to 1080p
  }

  // Set audio format if specified
  if (options?.audioFormat) {
    request.audioFormat = options.audioFormat;
  }

  return request;
}

/**
 * Download media from URL using Cobalt API
 */
export async function downloadMedia(
  url: string,
  options?: DownloadOptions
): Promise<DownloadResult> {
  try {
    // First, detect if media is available
    const detection = await detectMedia(url);

    if (!detection.hasMedia) {
      throw new MediaDownloadError(
        "No downloadable media found at URL",
        MediaErrorCodes.NO_MEDIA_FOUND,
        false
      );
    }

    const client = getCobaltClient();

    // Build request with options
    const request = buildCobaltRequest(url, options);

    // Get download URL from Cobalt
    const response = await client.request(request);

    // Handle different response statuses
    if (response.status === "error") {
      throw new MediaDownloadError(
        response.text || "Failed to get download URL",
        MediaErrorCodes.DOWNLOAD_FAILED,
        false
      );
    }

    if (response.status === "rate-limit") {
      throw new MediaDownloadError(
        "Rate limit exceeded",
        MediaErrorCodes.RATE_LIMIT,
        true
      );
    }

    // Get download URL
    let downloadUrl: string | undefined;

    if (response.status === "redirect" || response.status === "stream") {
      downloadUrl = response.url;
    } else if (response.status === "success") {
      downloadUrl = response.url;
    } else if (
      response.status === "picker" &&
      response.picker &&
      response.picker.length > 0
    ) {
      // Use first picker option
      downloadUrl = response.picker[0]?.url;
    }

    if (!downloadUrl) {
      throw new MediaDownloadError(
        "No download URL available",
        MediaErrorCodes.DOWNLOAD_FAILED,
        false
      );
    }

    // Download the file
    const fileBuffer = await client.downloadFile(downloadUrl, options?.maxSize);

    // Validate file size
    if (options?.maxSize && fileBuffer.length > options.maxSize) {
      throw new MediaDownloadError(
        `File size (${fileBuffer.length} bytes) exceeds maximum (${options.maxSize} bytes)`,
        MediaErrorCodes.FILE_TOO_LARGE,
        false
      );
    }

    // Extract metadata
    const mediaType = detection.mediaType || "video";
    const metadata = extractMetadata(response, fileBuffer, mediaType);

    // Save to temporary file
    const extension = getFileExtension(metadata.format, downloadUrl);
    const tempPath = generateTempFilePath(extension);

    await writeFile(tempPath, fileBuffer);

    return {
      success: true,
      filePath: tempPath,
      metadata,
    };
  } catch (error) {
    if (error instanceof MediaDownloadError) {
      return {
        success: false,
        metadata: {
          type: "video",
          fileSize: 0,
        },
        error: error.message,
      };
    }

    return {
      success: false,
      metadata: {
        type: "video",
        fileSize: 0,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Download audio-only from URL
 */
export async function downloadAudio(
  url: string,
  options?: DownloadOptions
): Promise<DownloadResult> {
  return downloadMedia(url, {
    ...options,
    audioFormat: options?.audioFormat || "mp3",
  });
}

/**
 * Clean up temporary file
 */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    // Ignore errors - file might already be deleted
    console.warn(`Failed to cleanup temp file ${filePath}:`, error);
  }
}

/**
 * Download media with automatic cleanup on error
 */
export async function downloadMediaSafe(
  url: string,
  options?: DownloadOptions
): Promise<DownloadResult> {
  const result = await downloadMedia(url, options);

  // If download failed and we have a temp file, clean it up
  if (!result.success && result.filePath) {
    await cleanupTempFile(result.filePath);
  }

  return result;
}

/**
 * Estimate download size before downloading
 */
export async function estimateMediaSize(url: string): Promise<number | null> {
  try {
    const detection = await detectMedia(url);
    return detection.estimatedSize || null;
  } catch {
    return null;
  }
}

/**
 * Check if media download is supported for URL
 */
export async function isDownloadSupported(url: string): Promise<boolean> {
  try {
    const detection = await detectMedia(url);
    return detection.hasMedia;
  } catch {
    return false;
  }
}

/**
 * Get available quality options for URL
 */
export async function getAvailableQualities(url: string): Promise<string[]> {
  try {
    const detection = await detectMedia(url);
    return detection.availableQualities || [];
  } catch {
    return [];
  }
}
