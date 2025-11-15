import { Counter, Histogram, Gauge, register } from "prom-client";

/**
 * Prometheus metrics for bookmark enrichment workflows
 * Tracks workflow execution, performance, and errors
 */

// Workflow execution counter
export const workflowCounter = new Counter({
  name: "bookmark_enrichment_total",
  help: "Total bookmark enrichment workflows executed",
  labelNames: ["status", "platform"],
});

// Workflow duration histogram
export const workflowDuration = new Histogram({
  name: "bookmark_enrichment_duration_seconds",
  help: "Bookmark enrichment workflow duration in seconds",
  labelNames: ["platform", "status"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1s to 10min
});

// Workflow retry counter
export const workflowRetries = new Counter({
  name: "bookmark_enrichment_retries_total",
  help: "Total number of workflow step retries",
  labelNames: ["step", "error_type"],
});

// Active workflows gauge
export const activeWorkflows = new Gauge({
  name: "bookmark_enrichment_active",
  help: "Number of currently active enrichment workflows",
});

// Step-specific metrics
export const stepDuration = new Histogram({
  name: "bookmark_enrichment_step_duration_seconds",
  help: "Duration of individual workflow steps",
  labelNames: ["step", "status"],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const stepCounter = new Counter({
  name: "bookmark_enrichment_step_total",
  help: "Total workflow steps executed",
  labelNames: ["step", "status"],
});

// AI/LLM metrics
export const llmTokensUsed = new Counter({
  name: "bookmark_enrichment_llm_tokens_total",
  help: "Total LLM tokens used for summarization",
  labelNames: ["model"],
});

export const llmRequestDuration = new Histogram({
  name: "bookmark_enrichment_llm_duration_seconds",
  help: "LLM request duration",
  buckets: [1, 2, 5, 10, 20, 30, 60],
});

// Media download metrics
export const mediaDownloadSize = new Histogram({
  name: "bookmark_enrichment_media_size_bytes",
  help: "Size of downloaded media files",
  buckets: [
    1024 * 1024, // 1MB
    10 * 1024 * 1024, // 10MB
    50 * 1024 * 1024, // 50MB
    100 * 1024 * 1024, // 100MB
    500 * 1024 * 1024, // 500MB
  ],
});

export const mediaDownloadDuration = new Histogram({
  name: "bookmark_enrichment_media_download_duration_seconds",
  help: "Media download duration",
  buckets: [5, 10, 30, 60, 120, 300],
});

// Storage metrics
export const storageUploadSize = new Histogram({
  name: "bookmark_enrichment_storage_upload_bytes",
  help: "Size of files uploaded to storage",
  buckets: [
    1024 * 1024,
    10 * 1024 * 1024,
    50 * 1024 * 1024,
    100 * 1024 * 1024,
    500 * 1024 * 1024,
  ],
});

// Error metrics
export const errorCounter = new Counter({
  name: "bookmark_enrichment_errors_total",
  help: "Total errors encountered during enrichment",
  labelNames: ["step", "error_type", "retryable"],
});

/**
 * Helper to track step duration
 */
export async function trackStepDuration<T>(
  stepName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = (Date.now() - startTime) / 1000;

    stepDuration.observe({ step: stepName, status: "success" }, duration);
    stepCounter.inc({ step: stepName, status: "success" });

    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;

    stepDuration.observe({ step: stepName, status: "failure" }, duration);
    stepCounter.inc({ step: stepName, status: "failure" });

    throw error;
  }
}

/**
 * Track retry attempts
 */
export function trackRetry(step: string, errorType: string): void {
  workflowRetries.inc({ step, error_type: errorType });
}

/**
 * Track errors
 */
export function trackError(
  step: string,
  errorType: string,
  retryable: boolean
): void {
  errorCounter.inc({
    step,
    error_type: errorType,
    retryable: retryable.toString(),
  });
}

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

/**
 * Get metrics as JSON
 */
export async function getMetricsJSON(): Promise<any> {
  const metrics = await register.getMetricsAsJSON();
  return metrics;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.clear();
}

/**
 * Get registry for custom configuration
 */
export function getRegistry() {
  return register;
}
