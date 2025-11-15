/**
 * Media Downloader Package
 *
 * Provides integration with Cobalt API for detecting and downloading
 * media content from social platforms and web pages.
 */

// Export client
export { CobaltClient, getCobaltClient, resetCobaltClient } from "./client";

// Export detector functions
export {
  detectMedia,
  isVideoUrl,
  isAudioUrl,
  getPlatformFromUrl,
} from "./detector";

// Export downloader functions
export {
  downloadMedia,
  downloadAudio,
  downloadMediaSafe,
  cleanupTempFile,
  estimateMediaSize,
  isDownloadSupported,
  getAvailableQualities,
} from "./downloader";

// Export types
export type {
  MediaType,
  MediaMetadata,
  MediaDetectionResult,
  DownloadOptions,
  DownloadResult,
  CobaltApiResponse,
  CobaltApiRequest,
  CobaltConfig,
  MediaDownloaderService,
} from "./types";

export { MediaDownloadError, MediaErrorCodes } from "./types";
