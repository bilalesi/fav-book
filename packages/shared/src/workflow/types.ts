/**
 * Shared workflow types used by both Trigger.dev and Restate implementations
 */

import type { Platform } from "../types";

/**
 * Workflow step enumeration
 */
export const WorkflowStep = {
  CONTENT_RETRIEVAL: 'CONTENT_RETRIEVAL',
  SUMMARIZATION: 'SUMMARIZATION',
  MEDIA_DETECTION: 'MEDIA_DETECTION',
  MEDIA_DOWNLOAD: 'MEDIA_DOWNLOAD',
  STORAGE_UPLOAD: 'STORAGE_UPLOAD',
  DATABASE_UPDATE: 'DATABASE_UPDATE'
} as const

export type WorkflowStep = (typeof WorkflowStep)[keyof typeof WorkflowStep]

/**
 * Error types for classification
 */
export const ErrorType = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT: 'RATE_LIMIT',
  INVALID_CONTENT: 'INVALID_CONTENT',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  MALFORMED_URL: 'MALFORMED_URL',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  UNKNOWN: 'UNKNOWN'
} as const

export type ErrorType = (typeof ErrorType)[keyof typeof ErrorType]


/**
 * Input payload for bookmark enrichment workflow
 */
export interface BookmarkEnrichmentInput {
  bookmarkId: string;
  userId: string;
  platform: Platform;
  url: string;
  content: string;
  enableMediaDownload: boolean;
}

/**
 * Media metadata returned from workflow
 */
export interface MediaMetadata {
  type: "video" | "audio";
  originalUrl?: string;
  storagePath?: string;
  storageUrl?: string;
  fileSize: number;
  duration?: number;
  quality?: string;
  format?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

/**
 * Media detection result
 */
export interface MediaDetectionResult {
  hasMedia: boolean;
  mediaType?: "video" | "audio";
  estimatedSize?: number;
  quality?: string;
  availableQualities?: string[];
}

/**
 * Download result from media downloader
 */
export interface DownloadResult {
  success: boolean;
  filePath?: string;
  metadata: MediaMetadata;
  error?: string;
}

/**
 * Upload result from storage service
 */
export interface UploadResult {
  key: string;
  url: string;
  size: number;
  etag: string;
}

/**
 * Summary result from AI service
 */
export interface SummaryResult {
  summary: string;
  keywords: string[];
  tags: Array<{ id: string; name: string }>;
  tokensUsed?: number;
}

/**
 * Error information for workflow failures
 */
export interface WorkflowError {
  step: WorkflowStep;
  errorType: ErrorType;
  message: string;
  timestamp: Date;
  retryable: boolean;
  stackTrace?: string;
  context?: Record<string, any>;
}

/**
 * Output result from bookmark enrichment workflow
 */
export interface BookmarkEnrichmentOutput {
  success: boolean;
  summary?: string;
  keywords?: string[];
  tags?: Array<{ id: string; name: string }>;
  mediaMetadata?: MediaMetadata[];
  errors?: WorkflowError[];
  tokensUsed?: number;
  executionTimeMs?: number;
}

/**
 * Internal workflow state for tracking execution
 */
export interface WorkflowState {
  bookmarkId: string;
  userId: string;
  currentStep: WorkflowStep;
  completedSteps: WorkflowStep[];
  errors: WorkflowError[];
  retryCount: number;
  startedAt: Date;
  updatedAt: Date;
  partialResults: Partial<BookmarkEnrichmentOutput>;
}

/**
 * Configuration for workflow retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  factor: number;
  minTimeoutInMs: number;
  maxTimeoutInMs: number;
  randomize: boolean;
}

/**
 * Workflow invocation handle
 */
export interface WorkflowHandle {
  id: string;
}
