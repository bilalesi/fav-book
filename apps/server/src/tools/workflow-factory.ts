/**
 * Workflow Engine Abstraction Layer
 * Provides a unified interface for triggering workflows across different engines (Restate, Trigger.dev)
 */

import type {
  IBookmarkEnrichmentInput,
  IWorkflowClient,
  IWorkflowHandle,
} from "@favy/shared";

/**
 * Workflow client wrapper that adds logging to workflow invocations
 */
class LoggingWorkflowClient implements IWorkflowClient {
  constructor(private client: IWorkflowClient) { }

  async invoke_bookmark_enrichment(
    payload: IBookmarkEnrichmentInput,
  ): Promise<IWorkflowHandle> {
    const engine = this.client.engine_name();
    console.log("——engine——", engine);
    console.log("[Workflow] Triggering bookmark enrichment workflow", {
      engine,
      bookmarkId: payload.bookmarkId,
      userId: payload.userId,
      platform: payload.platform,
      enableMediaDownload: payload.enable_media_download,
    });

    try {
      const handle = await this.client.invoke_bookmark_enrichment(payload);

      console.log("[Workflow] Successfully triggered workflow", {
        engine,
        workflowId: handle.id,
        bookmarkId: payload.bookmarkId,
      });

      return handle;
    } catch (error) {
      console.error("[Workflow] Failed to trigger workflow", {
        engine,
        bookmarkId: payload.bookmarkId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  engine_name(): string {
    return this.client.engine_name();
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
export async function createWorkflowClient(): Promise<IWorkflowClient> {
  const engine = process.env.WORKFLOW_ENGINE || "restate";

  let baseClient: IWorkflowClient;

  if (engine === "restate") {
    const { RestateWorkflowClient } = await import("@favy/workflow");

    baseClient = new RestateWorkflowClient({
      ingressUrl:
        process.env.RESTATE_RUNTIME_ENDPOINT || "http://localhost:8080",
      adminUrl: process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070",
    });
  } else {
    throw new Error(
      `Unknown workflow engine: ${engine}. Must be "restate" or "trigger"`,
    );
  }

  return new LoggingWorkflowClient(baseClient);
}
