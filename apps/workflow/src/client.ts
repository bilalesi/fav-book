/**
 * Restate workflow client for triggering bookmark enrichment workflows
 */

import * as clients from "@restatedev/restate-sdk-clients";
import type {
	IBookmarkEnrichmentInput,
	IWorkflowClient,
	IWorkflowHandle,
	RestateConfig,
} from "./types";

/**
 * Client for invoking Restate workflows from external applications
 *
 * @example
 * ```typescript
 * const client = new RestateWorkflowClient({
 *   ingressUrl: "http://localhost:8080",
 *   adminUrl: "http://localhost:9070"
 * });
 *
 * const handle = await client.kickoff_bookmark_enrichment({
 *   bookmarkId: "123",
 *   userId: "user-456",
 *   platform: "TWITTER",
 *   url: "https://example.com",
 *   content: "Example content",
 *   enableMediaDownload: true
 * });
 * ```
 */
export class RestateWorkflowClient implements IWorkflowClient {
	private ingress: clients.Ingress;

	constructor(config: RestateConfig) {
		// Validate configuration
		if (!config.ingressUrl) {
			throw new Error("RestateConfig.ingressUrl is required");
		}
		if (!config.adminUrl) {
			throw new Error("RestateConfig.adminUrl is required");
		}

		// Connect to Restate ingress
		try {
			this.ingress = clients.connect({ url: config.ingressUrl });
		} catch (error) {
			throw new Error(
				`Failed to connect to Restate at ${config.ingressUrl}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	/**
	 * Dispatch a bookmark enrichment workflow
	 *
	 * @param payload - Input parameters for the workflow
	 * @returns Promise resolving to a workflow handle with invocation ID
	 * @throws Error if connection to Restate fails or payload is invalid
	 */
	async invoke_bookmark_enrichment(
		payload: IBookmarkEnrichmentInput,
	): Promise<IWorkflowHandle> {
		try {
			// Validate payload
			if (!payload.bookmarkId) {
				throw new Error("BookmarkEnrichmentInput.bookmarkId is required");
			}
			if (!payload.userId) {
				throw new Error("BookmarkEnrichmentInput.userId is required");
			}

			// Invoke the workflow using the bookmark ID as the key for the Virtual Object
			// The workflow will be implemented as a Virtual Object named "BookmarkEnrichment"
			// Using one-way send invocation (fire and forget)
			const sendClient = this.ingress.objectSendClient(
				{ name: "bookmark_enrichment" },
				payload.bookmarkId,
			);

			// Use type assertion to call the enrich method
			const sendHandle = await (sendClient as any).enrich(payload);

			// Get the invocation ID from the send handle
			const invocationId = sendHandle.invocationId;

			return { id: invocationId };
		} catch (error) {
			throw new Error(
				`Failed to trigger bookmark enrichment workflow: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	/**
	 * Returns the name of the workflow engine
	 */
	engine_name(): string {
		return "restate";
	}
}
