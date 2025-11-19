/**
 * Shared workflow types used by both Trigger.dev and Restate implementations
 */

import type { Platform } from "../types";
import {
  WorkflowStep as PrismaWorkflowStep,
  ErrorType as PrismaErrorType,
} from "@favy/db";

/**
 * Workflow step enumeration
 */
export const WorkflowStep = PrismaWorkflowStep;
export type WorkflowStep = PrismaWorkflowStep;

/**
 * Error types for classification
 */
export const ErrorType = PrismaErrorType;
export type ErrorType = PrismaErrorType;

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
