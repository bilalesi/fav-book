/**
 * Trigger.dev Workflow Client Wrapper
 * Adapts Trigger.dev's task invocation API to the unified WorkflowClient interface
 */

import { tasks } from "@trigger.dev/sdk/v3";
import type { BookmarkEnrichmentInput } from "@favy/trigger";
import type { WorkflowClient, WorkflowHandle } from "./workflow-factory";

/**
 * Wrapper class that adapts Trigger.dev's API to the WorkflowClient interface
 */
export class TriggerWorkflowClient implements WorkflowClient {
  /**
   * Triggers a bookmark enrichment workflow using Trigger.dev
   *
   * @param payload - Input parameters for the workflow
   * @returns Promise resolving to a workflow handle with invocation ID
   * @throws Error if workflow trigger fails
   */
  async triggerBookmarkEnrichment(
    payload: BookmarkEnrichmentInput
  ): Promise<WorkflowHandle> {
    try {
      // Trigger the workflow using Trigger.dev's tasks API
      const handle = await tasks.trigger("bookmark-enrichment", payload);

      return { id: handle.id };
    } catch (error) {
      throw new Error(
        `Failed to trigger bookmark enrichment workflow via Trigger.dev: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Returns the name of the workflow engine
   */
  getEngineName(): string {
    return "trigger";
  }
}
