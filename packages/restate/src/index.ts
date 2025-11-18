/**
 * @favy/restate - Restate-based workflow orchestration for bookmark enrichment
 *
 * This package provides durable execution for bookmark enrichment workflows
 * using Restate's self-hosted infrastructure.
 */

// Export types
export * from "./types.js";

// Export client for workflow invocation
export { RestateWorkflowClient } from "./client";

// Export configuration utilities
export {
  loadConfig,
  validateConfig,
  getClientConfig,
  getServiceConfig,
} from "./lib/config.js";

// Export error handling utilities
export {
  classifyError,
  isRetryableError,
  throwAppropriateError,
  createTerminalError,
  preserveErrorContext,
  getErrorContext,
} from "./lib/errors.js";

// Export logging utilities
export {
  Logger,
  PerformanceTimer,
  createWorkflowLogger,
  startTimer,
  logWorkflowStart,
  logWorkflowCompletion,
  logStepStart,
  logStepCompletion,
  logStepFailure,
  type LogLevel,
  type LogEntry,
  type WorkflowContext,
} from "./lib/logger.js";

// Export services
export { contentRetrievalService } from "./services/content-retrieval.js";
export { summarizationService } from "./services/summarization.js";
export { mediaDetectionService } from "./services/media-detection.js";
export { mediaDownloadService } from "./services/media-download.js";
export { storageUploadService } from "./services/storage-upload.js";
export { databaseUpdateService } from "./services/database-update.js";

// Export service input/output types
export type {
  ContentRetrievalInput,
  ContentRetrievalOutput,
} from "./services/content-retrieval.js";
export type { SummarizationInput } from "./services/summarization.js";
export type { MediaDetectionInput } from "./services/media-detection.js";
export type { MediaDownloadInput } from "./services/media-download.js";
export type { StorageUploadInput } from "./services/storage-upload.js";
export type {
  BookmarkEnrichmentUpdateInput,
  MediaRecordInput,
} from "./services/database-update.js";

// Export workflows
export { bookmarkEnrichmentWorkflow } from "./workflows/bookmark-enrichment.js";
