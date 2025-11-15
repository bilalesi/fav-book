/**
 * Trigger.dev Integration Package
 * Provides workflow orchestration for bookmark enrichment
 */

// Export client configuration
export { triggerConfig, validateConnection, getConfig } from "./client";

// Export workflow
export { bookmarkEnrichmentWorkflow } from "./workflows/bookmark-enrichment";

// Export tasks
export { retrieveContent, isContentReachable } from "./tasks/content-retrieval";

// Export types
export type {
  BookmarkEnrichmentInput,
  BookmarkEnrichmentOutput,
  MediaMetadata,
  WorkflowError,
  WorkflowState,
  RetryConfig,
} from "./types";

export {
  WorkflowStep,
  ErrorType,
  isRetryableError,
  classifyError,
} from "./types";

// Export monitoring and metrics
export * from "./lib/metrics";
export * from "./lib/metrics-tracker";
export * from "./lib/alerting";
