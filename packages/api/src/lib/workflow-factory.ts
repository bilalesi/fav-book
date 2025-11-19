/**
 * Workflow Engine Abstraction Layer
 * Provides a unified interface for triggering workflows across different engines (Restate, Trigger.dev)
 */

import type { BookmarkEnrichmentInput } from "@favy/trigger";

/**
 * Unified workflow handle returned by all workflow engines
 */
export interface WorkflowHandle {
  id: string;
}

/**
 * Unified interface for workflow clients
 * All workflow engines must implement this interface to ensure compatibility
 */
export interface WorkflowClient {
  /**
   * Triggers a bookmark enrichment workflow
   * @param payload - Input parameters for the workflow
   * @returns Promise resolving to a workflow handle with invocation ID
   */
  triggerBookmarkEnrichment(
    payload: BookmarkEnrichmentInput
  ): Promise<WorkflowHandle>;

  /**
   * Returns the name of the workflow engine
   */
  getEngineName(): string;
}

/**
 * Workflow client wrapper that adds logging to workflow invocations
 */
class LoggingWorkflowClient implements WorkflowClient {
  constructor(private client: WorkflowClient) {}

  async triggerBookmarkEnrichment(
    payload: BookmarkEnrichmentInput
  ): Promise<WorkflowHandle> {
    const engine = this.client.getEngineName();

    console.log(`[Workflow] Triggering bookmark enrichment workflow`, {
      engine,
      bookmarkId: payload.bookmarkId,
      userId: payload.userId,
      platform: payload.platform,
      enableMediaDownload: payload.enableMediaDownload,
    });

    try {
      const handle = await this.client.triggerBookmarkEnrichment(payload);

      console.log(`[Workflow] Successfully triggered workflow`, {
        engine,
        workflowId: handle.id,
        bookmarkId: payload.bookmarkId,
      });

      return handle;
    } catch (error) {
      console.error(`[Workflow] Failed to trigger workflow`, {
        engine,
        bookmarkId: payload.bookmarkId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getEngineName(): string {
    return this.client.getEngineName();
  }
}

/**
 * Creates a workflow client based on the WORKFLOW_ENGINE environment variable
 *
 * Supported engines:
 * - "restate" (default): Uses Restate for self-hosted durable execution
 * - "trigger": Uses Trigger.dev for cloud-based workflow orchestration
 *
 * The returned client automatically logs workflow invocations with the engine name
 * and structured context for debugging and monitoring.
 *
 * @returns WorkflowClient instance configured for the selected engine with logging
 * @throws Error if the workflow engine is unknown or configuration is invalid
 *
 * @example
 * ```typescript
 * // Using Restate (default)
 * const client = createWorkflowClient();
 * const handle = await client.triggerBookmarkEnrichment(payload);
 * // Logs: [Workflow] Triggering bookmark enrichment workflow { engine: "restate", ... }
 *
 * // Using Trigger.dev
 * process.env.WORKFLOW_ENGINE = "trigger";
 * const client = createWorkflowClient();
 * const handle = await client.triggerBookmarkEnrichment(payload);
 * // Logs: [Workflow] Triggering bookmark enrichment workflow { engine: "trigger", ... }
 * ```
 */
export async function createWorkflowClient(): Promise<WorkflowClient> {
  const engine = process.env.WORKFLOW_ENGINE || "restate";

  let baseClient: WorkflowClient;

  if (engine === "restate") {
    const { RestateWorkflowClient } = await import("@favy/restate");

    baseClient = new RestateWorkflowClient({
      ingressUrl:
        process.env.RESTATE_RUNTIME_ENDPOINT || "http://localhost:8080",
      adminUrl: process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070",
    });
  } else if (engine === "trigger") {
    const { TriggerWorkflowClient } = await import("./trigger-client-wrapper");
    baseClient = new TriggerWorkflowClient();
  } else {
    throw new Error(
      `Unknown workflow engine: ${engine}. Must be "restate" or "trigger"`
    );
  }

  return new LoggingWorkflowClient(baseClient);
}
