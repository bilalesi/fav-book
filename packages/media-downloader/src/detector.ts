import { getCobaltClient } from "./client";
import type { MediaDetectionResult, MediaType } from "./types";
import { MediaDownloadError, MediaErrorCodes } from "./types";

/**
 * Supported platforms for media detection
 */
const SUPPORTED_PLATFORMS = [
  "youtube.com",
  "youtu.be",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "instagram.com",
  "facebook.com",
  "reddit.com",
  "vimeo.com",
  "twitch.tv",
  "soundcloud.com",
  "bilibili.com",
  "tumblr.com",
  "vine.co",
  "pinterest.com",
  "streamable.com",
  "ok.ru",
  "vk.com",
];

/**
 * Check if URL is from a supported platform
 */
function isSupportedPlatform(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");

    return SUPPORTED_PLATFORMS.some(
      (platform) => hostname === platform || hostname.endsWith(`.${platform}`)
    );
  } catch {
    return false;
  }
}

/**
 * Determine media type from URL patterns
 */
function inferMediaTypeFromUrl(url: string): MediaType | undefined {
  const urlLower = url.toLowerCase();

  // Audio-only platforms
  if (urlLower.includes("soundcloud.com")) {
    return "audio";
  }

  // Video platforms (default)
  if (
    urlLower.includes("youtube.com") ||
    urlLower.includes("youtu.be") ||
    urlLower.includes("tiktok.com") ||
    urlLower.includes("twitter.com") ||
    urlLower.includes("x.com") ||
    urlLower.includes("instagram.com") ||
    urlLower.includes("vimeo.com")
  ) {
    return "video";
  }

  return undefined;
}

/**
 * Parse quality information from Cobalt response
 */
function parseQualityInfo(response: any): {
  quality?: string;
  availableQualities?: string[];
} {
  // If picker is available, extract qualities
  if (response.pickerType === "various" && Array.isArray(response.picker)) {
    const qualities: string[] = response.picker
      .map((item: any) => {
        // Try to extract quality from URL or metadata
        const match = item.url?.match(/(\d+p)/);
        return match ? match[1] : null;
      })
      .filter((q: any): q is string => Boolean(q));

    return {
      availableQualities: [...new Set(qualities)],
      quality: qualities[0],
    };
  }

  // Try to infer from URL
  if (response.url) {
    const match = response.url.match(/(\d+p)/);
    if (match) {
      return { quality: match[1] };
    }
  }

  return {};
}

/**
 * Detect if URL contains downloadable media
 */
export async function detectMedia(url: string): Promise<MediaDetectionResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new MediaDownloadError(
      "Invalid URL format",
      MediaErrorCodes.INVALID_URL,
      false
    );
  }

  // Check if platform is supported
  if (!isSupportedPlatform(url)) {
    return {
      hasMedia: false,
    };
  }

  try {
    const client = getCobaltClient();
    const response = await client.getMediaInfo(url);

    // Check response status
    if (response.status === "error") {
      // Not all errors mean no media - some might be temporary
      if (response.text?.includes("rate limit")) {
        throw new MediaDownloadError(
          "Rate limit exceeded",
          MediaErrorCodes.RATE_LIMIT,
          true
        );
      }

      // If error indicates no media found, return false gracefully
      if (
        response.text?.includes("not supported") ||
        response.text?.includes("no media")
      ) {
        return {
          hasMedia: false,
        };
      }

      throw new MediaDownloadError(
        response.text || "Failed to detect media",
        MediaErrorCodes.NO_MEDIA_FOUND,
        false
      );
    }

    // Check if media is available
    const hasMedia =
      response.status === "stream" ||
      response.status === "success" ||
      response.status === "redirect" ||
      response.status === "picker";

    if (!hasMedia) {
      return {
        hasMedia: false,
      };
    }

    // Determine media type
    const inferredType = inferMediaTypeFromUrl(url);
    const mediaType: MediaType = response.audio
      ? "audio"
      : inferredType || "video";

    // Parse quality information
    const qualityInfo = parseQualityInfo(response);

    return {
      hasMedia: true,
      mediaType,
      ...qualityInfo,
    };
  } catch (error) {
    // If it's already a MediaDownloadError, rethrow
    if (error instanceof MediaDownloadError) {
      throw error;
    }

    // For other errors, handle gracefully
    console.error("Media detection error:", error);

    // Return false for detection rather than throwing
    // This allows the workflow to continue without media
    return {
      hasMedia: false,
    };
  }
}

/**
 * Check if URL is likely to contain video content
 */
export function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch/i,
    /youtu\.be\//i,
    /tiktok\.com\/@[\w.-]+\/video/i,
    /twitter\.com\/\w+\/status\/\d+/i,
    /x\.com\/\w+\/status\/\d+/i,
    /instagram\.com\/(p|reel|tv)\//i,
    /vimeo\.com\/\d+/i,
    /facebook\.com\/watch/i,
    /twitch\.tv\/videos/i,
  ];

  return videoPatterns.some((pattern) => pattern.test(url));
}

/**
 * Check if URL is likely to contain audio content
 */
export function isAudioUrl(url: string): boolean {
  const audioPatterns = [
    /soundcloud\.com\//i,
    /spotify\.com\/track/i,
    /music\.youtube\.com/i,
  ];

  return audioPatterns.some((pattern) => pattern.test(url));
}

/**
 * Get platform name from URL
 */
export function getPlatformFromUrl(url: string): string | null | undefined {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, "");

    // Extract main domain
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }

    return hostname;
  } catch {
    return null;
  }
}
