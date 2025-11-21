/**
 * Shared workflow module
 * Contains types and utilities used by both Trigger.dev and Restate implementations
 */

import type { IBookmarkEnrichmentInput } from "./types";

export * from "./types";
export * from "./errors";


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
export interface IWorkflowClient {
    /**
     * Triggers a bookmark enrichment workflow
     * @param payload - Input parameters for the workflow
     * @returns Promise resolving to a workflow handle with invocation ID
     */
    invoke_bookmark_enrichment(
        payload: IBookmarkEnrichmentInput
    ): Promise<WorkflowHandle>;

    /**
     * Returns the name of the workflow engine
     */
    engine_name(): string;
}