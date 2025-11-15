/**
 * Media type enumeration
 */
export type MediaType = "video" | "audio";

/**
 * Media metadata extracted from downloaded content
 */
export interface MediaMetadata {
  type: MediaType;
  format?: string; // e.g., "mp4", "webm", "mp3"
  quality?: string; // e.g., "1080p", "720p", "audio-only"
  fileSize: number; // Size in bytes
  duration?: number; // Duration in seconds
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

/**
 * Result of media detection operation
 */
export interface MediaDetectionResult {
  hasMedia: boolean;
  mediaType?: MediaType;
  estimatedSize?: number;
  quality?: string;
  availableQualities?: string[];
}

/**
 * Options for downloading media
 */
export interface DownloadOptions {
  quality?: string; // Preferred quality (e.g., "1080", "720", "max")
  maxSize?: number; // Maximum file size in bytes
  audioFormat?: string; // For audio extraction (e.g., "mp3", "wav")
  videoQuality?: string; // Video quality preference
}

/**
 * Result of media download operation
 */
export interface DownloadResult {
  success: boolean;
  filePath?: string; // Path to downloaded file
  metadata: MediaMetadata;
  error?: string;
}

/**
 * Cobalt API response structure
 */
export interface CobaltApiResponse {
  status: "error" | "redirect" | "stream" | "success" | "rate-limit" | "picker";
  text?: string; // Error message or status text
  url?: string; // Download URL
  pickerType?: string;
  picker?: Array<{
    type: string;
    url: string;
    thumb?: string;
  }>;
  audio?: string; // Audio-only URL
}

/**
 * Cobalt API request payload
 */
export interface CobaltApiRequest {
  url: string;
  videoQuality?: string; // "144" | "240" | "360" | "480" | "720" | "1080" | "1440" | "2160" | "max"
  audioFormat?: string; // "best" | "mp3" | "ogg" | "wav" | "opus"
  audioBitrate?: string; // "320" | "256" | "128" | "96" | "64" | "8"
  filenamePattern?: string; // "classic" | "pretty" | "basic" | "nerdy"
  isAudioOnly?: boolean;
  isAudioMuted?: boolean;
  dubLang?: boolean;
  disableMetadata?: boolean;
  twitterGif?: boolean;
  tiktokFullAudio?: boolean;
  tiktokH265?: boolean;
  youtubeVideoCodec?: string; // "h264" | "av1" | "vp9"
}

/**
 * Configuration for Cobalt API client
 */
export interface CobaltConfig {
  apiUrl: string;
  apiKey?: string;
  timeout: number;
}

/**
 * Service interface for media downloader
 */
export interface MediaDownloaderService {
  /**
   * Detect if URL contains downloadable media
   */
  detectMedia(url: string): Promise<MediaDetectionResult>;

  /**
   * Download media from URL
   */
  downloadMedia(
    url: string,
    options?: DownloadOptions
  ): Promise<DownloadResult>;
}

/**
 * Error types for media downloader
 */
export class MediaDownloadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "MediaDownloadError";
  }
}

export const MediaErrorCodes = {
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  RATE_LIMIT: "RATE_LIMIT",
  INVALID_URL: "INVALID_URL",
  NO_MEDIA_FOUND: "NO_MEDIA_FOUND",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_PLATFORM: "UNSUPPORTED_PLATFORM",
  DOWNLOAD_FAILED: "DOWNLOAD_FAILED",
} as const;
