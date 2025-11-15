import type { Platform } from "@my-better-t-app/shared";

/**
 * Workflow step enumeration
 * Defines all possible steps in the bookmark enrichment workflow
 */
export enum WorkflowStep {
  CONTENT_RETRIEVAL = "content_retrieval",
  SUMMARIZATION = "summarization",
  MEDIA_DETECTION = "media_detection",
  MEDIA_DOWNLOAD = "media_download",
  STORAGE_UPLOAD = "storage_upload",
  DATABASE_UPDATE = "database_update",
}

/**
 * Input payload for bookmark enrichment workflow
 */
export interface BookmarkEnrichmentInput {
  /** Unique identifier of the bookmark to enrich */
  bookmarkId: string;
  /** User ID who owns the bookmark */
  userId: string;
  /** Platform where the bookmark originated */
  platform: Platform;
  /** URL of the bookmarked content */
  url: string;
  /** Content text of the bookmark */
  content: string;
  /** Whether to enable media download for this bookmark */
  enableMediaDownload: boolean;
}

/**
 * Media metadata returned from workflow
 */
export interface MediaMetadata {
  /** Type of media (video or audio) */
  type: "video" | "audio";
  /** Original URL of the media */
  originalUrl?: string;
  /** Storage path/key in S3 */
  storagePath?: string;
  /** Accessible URL for the media (presigned or public) */
  storageUrl?: string;
  /** File size in bytes */
  fileSize: number;
  /** Duration in seconds (for video/audio) */
  duration?: number;
  /** Quality indicator (e.g., "1080p", "720p", "audio-only") */
  quality?: string;
  /** File format (e.g., "mp4", "webm", "mp3") */
  format?: string;
  /** Video width in pixels */
  width?: number;
  /** Video height in pixels */
  height?: number;
  /** Thumbnail URL */
  thumbnailUrl?: string;
}

/**
 * Processing status for bookmarks
 */
export type ProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_SUCCESS";

/**
 * Media detection result
 */
export interface MediaDetectionResult {
  /** Whether media was detected */
  hasMedia: boolean;
  /** Type of media if detected */
  mediaType?: "video" | "audio";
  /** Estimated file size in bytes */
  estimatedSize?: number;
  /** Quality information */
  quality?: string;
  /** Available quality options */
  availableQualities?: string[];
}

/**
 * Download result from media downloader
 */
export interface DownloadResult {
  /** Whether download was successful */
  success: boolean;
  /** Path to downloaded file */
  filePath?: string;
  /** Media metadata */
  metadata: MediaMetadata;
  /** Error message if failed */
  error?: string;
}

/**
 * Upload result from storage service
 */
export interface UploadResult {
  /** Storage key/path */
  key: string;
  /** Accessible URL */
  url: string;
  /** File size in bytes */
  size: number;
  /** ETag from S3 */
  etag: string;
}

/**
 * Summary result from AI service
 */
export interface SummaryResult {
  /** Generated summary text */
  summary: string;
  /** Extracted keywords */
  keywords: string[];
  /** Extracted tags */
  tags: string[];
  /** Number of tokens used */
  tokensUsed: number;
}

/**
 * Error information for workflow failures
 */
export interface WorkflowError {
  /** Step where the error occurred */
  step: WorkflowStep;
  /** Error message */
  message: string;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Stack trace if available */
  stackTrace?: string;
}

/**
 * Output result from bookmark enrichment workflow
 */
export interface BookmarkEnrichmentOutput {
  /** Whether the workflow completed successfully */
  success: boolean;
  /** Generated summary of the content */
  summary?: string;
  /** Extracted keywords from the content */
  keywords?: string[];
  /** Extracted semantic tags for categorization */
  tags?: string[];
  /** Metadata for downloaded media files */
  mediaMetadata?: MediaMetadata[];
  /** Errors encountered during workflow execution */
  errors?: WorkflowError[];
  /** Number of tokens used for LLM operations */
  tokensUsed?: number;
  /** Total workflow execution time in milliseconds */
  executionTimeMs?: number;
}

/**
 * Internal workflow state for tracking execution
 */
export interface WorkflowState {
  /** Bookmark being processed */
  bookmarkId: string;
  /** User who owns the bookmark */
  userId: string;
  /** Current step being executed */
  currentStep: WorkflowStep;
  /** Steps that have been completed */
  completedSteps: WorkflowStep[];
  /** Errors encountered so far */
  errors: WorkflowError[];
  /** Number of retry attempts for current step */
  retryCount: number;
  /** When workflow started */
  startedAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Partial results accumulated so far */
  partialResults: Partial<BookmarkEnrichmentOutput>;
}

/**
 * Configuration for workflow retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Delay multiplier for exponential backoff */
  factor: number;
  /** Minimum timeout in milliseconds */
  minTimeoutInMs: number;
  /** Maximum timeout in milliseconds */
  maxTimeoutInMs: number;
  /** Whether to randomize delays */
  randomize: boolean;
}

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT = "RATE_LIMIT",
  INVALID_CONTENT = "INVALID_CONTENT",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  NOT_FOUND = "NOT_FOUND",
  MALFORMED_URL = "MALFORMED_URL",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  UNKNOWN = "UNKNOWN",
}

/**
 * Determines if an error is retryable based on its type
 * @deprecated Use isRetryableError from lib/errors instead
 */
export function isRetryableError(error: Error | ErrorType): boolean {
  const retryableTypes = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT,
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorType.RATE_LIMIT,
  ];

  if (error instanceof Error) {
    // Try to classify the error based on message
    const message = error.message.toLowerCase();
    if (message.includes("timeout")) return true;
    if (message.includes("network")) return true;
    if (message.includes("unavailable")) return true;
    if (message.includes("503")) return true;
    if (message.includes("429")) return true;
    return false;
  }

  return retryableTypes.includes(error);
}

/**
 * Classifies an error into an ErrorType
 * @deprecated Use classifyError from lib/errors instead
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();

  if (message.includes("timeout")) return ErrorType.TIMEOUT;
  if (message.includes("network")) return ErrorType.NETWORK_ERROR;
  if (message.includes("unavailable") || message.includes("503"))
    return ErrorType.SERVICE_UNAVAILABLE;
  if (message.includes("rate limit") || message.includes("429"))
    return ErrorType.RATE_LIMIT;
  if (message.includes("not found") || message.includes("404"))
    return ErrorType.NOT_FOUND;
  if (message.includes("auth")) return ErrorType.AUTHENTICATION_FAILED;
  if (message.includes("invalid") || message.includes("malformed"))
    return ErrorType.INVALID_CONTENT;
  if (message.includes("quota")) return ErrorType.QUOTA_EXCEEDED;

  return ErrorType.UNKNOWN;
}
