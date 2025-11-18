/**
 * Type definitions for Restate workflow package
 *
 * This module re-exports types from @favy/trigger for compatibility
 * and defines Restate-specific configuration types.
 */

// Re-export all types from @favy/trigger for compatibility
// Note: Some types are imported from internal modules since they're not exported from main index
export {
  type BookmarkEnrichmentInput,
  type BookmarkEnrichmentOutput,
  WorkflowStep,
  type WorkflowError,
  type MediaMetadata,
  ErrorType,
  type WorkflowState,
  type RetryConfig,
} from "@favy/trigger";

// Import additional types from internal trigger types module
import type {
  ProcessingStatus as TriggerProcessingStatus,
  SummaryResult as TriggerSummaryResult,
  MediaDetectionResult as TriggerMediaDetectionResult,
  DownloadResult as TriggerDownloadResult,
  UploadResult as TriggerUploadResult,
} from "@favy/trigger/types";

export type ProcessingStatus = TriggerProcessingStatus;
export type SummaryResult = TriggerSummaryResult;
export type MediaDetectionResult = TriggerMediaDetectionResult;
export type DownloadResult = TriggerDownloadResult;
export type UploadResult = TriggerUploadResult;

/**
 * Configuration for Restate client connection
 */
export interface RestateConfig {
  /** Restate ingress URL for workflow invocation */
  ingressUrl: string;
  /** Restate admin API URL for management operations */
  adminUrl: string;
}

/**
 * Configuration for Restate service endpoint
 */
export interface RestateServiceConfig {
  /** Port for the Restate service endpoint to listen on */
  port: number;
  /** Restate ingress URL for service registration */
  ingressUrl: string;
  /** Restate admin URL for health checks */
  adminUrl: string;
}

/**
 * Environment-based configuration loader result
 */
export interface RestateEnvironmentConfig {
  /** Restate ingress URL (default: http://localhost:8080) */
  ingressUrl: string;
  /** Restate admin URL (default: http://localhost:9070) */
  adminUrl: string;
  /** Service port (default: 9080) */
  servicePort: number;
  /** Database connection URL */
  databaseUrl: string;
  /** Whether AI summarization is enabled */
  enableAiSummarization: boolean;
  /** Whether media download is enabled */
  enableMediaDownload: boolean;
  /** Maximum media file size in MB */
  maxMediaSizeMb: number;
}

/**
 * Workflow invocation handle returned from client
 */
export interface WorkflowHandle {
  /** Unique invocation ID for tracking */
  id: string;
}
