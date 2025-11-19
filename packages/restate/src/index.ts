/**
 * @favy/restate - Restate-based workflow orchestration for bookmark enrichment
 *
 * This package provides durable execution for bookmark enrichment workflows
 * using Restate's self-hosted infrastructure.
 */

// Export types
export * from "./types";

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
} from "./lib/errors";

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
} from "./lib/logger";

// Export services
export { contentRetrievalService } from "./services/content-retrieval";
export { summarizationService } from "./services/summarization";
export { mediaDetectionService } from "./services/media-detection";
export { mediaDownloadService } from "./services/media-download";
export { storageUploadService } from "./services/storage-upload";
export { databaseUpdateService } from "./services/database-update";

// Export service input/output types
export type {
  ContentRetrievalInput,
  ContentRetrievalOutput,
} from "./services/content-retrieval";
export type { SummarizationInput } from "./services/summarization";
export type { MediaDetectionInput } from "./services/media-detection";
export type { MediaDownloadInput } from "./services/media-download";
export type { StorageUploadInput } from "./services/storage-upload";
export type {
  BookmarkEnrichmentUpdateInput,
  MediaRecordInput,
} from "./services/database-update";

export { bookmarkEnrichmentWorkflow } from "./workflows/bookmark-enrichment";
