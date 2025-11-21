/**
 * @favy/workflow - Restate-based workflow orchestration for bookmark enrichment
 *
 * This package provides durable execution for bookmark enrichment workflows
 * using Restate's self-hosted infrastructure.
 */

// Export client for workflow invocation
export { RestateWorkflowClient } from "./client";
// Export configuration utilities
export {
	getClientConfig,
	getServiceConfig,
	load_config,
	validate_config,
} from "./lib/config.js";
// Export error handling utilities
export {
	classify_error,
	createTerminalError,
	is_retryable_error,
	preserve_error_context,
	raise_appropriate_error,
	retrieve_error_context,
} from "./lib/errors";
// Export logging utilities
export {
	create_workflow_logger,
	type LogEntry,
	Logger,
	type LogLevel,
	log_step_completion,
	log_step_failure,
	log_step_start,
	log_workflow_completion,
	log_workflow_start,
	PerformanceTimer,
	start_timer as startTimer,
	type WorkflowContext,
} from "./lib/logger";
// Export service input/output types
export type {
	IContentRetrievalInput,
	IContentRetrievalOutput,
} from "./services/content-retrieval";
export { content_retrieval_service } from "./services/content-retrieval";
export type {
	IBookmarkEnrichmentUpdateInput,
	IMediaRecordInput,
} from "./services/database-update";
export { database_update_service } from "./services/database-update";
export type { IMediaDetectionInput } from "./services/media-detection";
export { media_detection_service } from "./services/media-detection";
export type { IMediaDownloadInput } from "./services/media-download";
export { media_download_service } from "./services/media-download";
export type { IStorageUploadInput } from "./services/storage-upload";
export { storage_upload_service } from "./services/storage-upload";
export type { ISummarizationInput } from "./services/summarization";
export { summarization_service } from "./services/summarization";
// Export types
export * from "./types";
export { bookmark_enrichment_workflow } from "./workflows/bookmark-enrichment";
