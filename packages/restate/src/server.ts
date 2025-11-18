/**
 * Restate service endpoint
 *
 * Registers all workflows and services with Restate
 * Starts the HTTP server to accept workflow invocations
 */

import * as restate from "@restatedev/restate-sdk";
import { bookmarkEnrichmentWorkflow } from "./workflows/bookmark-enrichment";
import { contentRetrievalService } from "./services/content-retrieval";
import { summarizationService } from "./services/summarization";
import { mediaDetectionService } from "./services/media-detection";
import { mediaDownloadService } from "./services/media-download";
import { storageUploadService } from "./services/storage-upload";
import { databaseUpdateService } from "./services/database-update";
import { loadConfig } from "./lib/config";

/**
 * Health check service
 * Provides a simple health check endpoint to verify the service is running
 */
const healthCheckService = restate.service({
  name: "HealthCheckService",
  handlers: {
    check: async (
      ctx: restate.Context
    ): Promise<{ status: string; timestamp: string }> => {
      const timestamp = new Date(await ctx.date.now()).toISOString();
      return {
        status: "healthy",
        timestamp,
      };
    },
  },
});

/**
 * Main server entry point
 * Registers all services and starts the Restate endpoint
 *
 * After starting, the service endpoint must be registered with the Restate server
 * by making a POST request to the Restate admin API:
 *
 * curl -X POST http://localhost:9070/deployments \
 *   -H "Content-Type: application/json" \
 *   -d '{"uri": "http://localhost:9080"}'
 *
 * This registration step tells the Restate server where to find the service definitions.
 */
async function main() {
  // Load configuration
  const config = loadConfig();

  console.log("Starting Restate service endpoint...");
  console.log(`Service port: ${config.servicePort}`);
  console.log(`Restate ingress URL: ${config.ingressUrl}`);
  console.log(`Restate admin URL: ${config.adminUrl}`);

  // Create Restate endpoint and register all services
  restate
    .endpoint()
    .bind(bookmarkEnrichmentWorkflow)
    .bind(contentRetrievalService)
    .bind(summarizationService)
    .bind(mediaDetectionService)
    .bind(mediaDownloadService)
    .bind(storageUploadService)
    .bind(databaseUpdateService)
    .bind(healthCheckService)
    .listen(config.servicePort);

  console.log(
    `Restate service endpoint listening on port ${config.servicePort}`
  );
  console.log("Registered services:");
  console.log("  - BookmarkEnrichment (workflow)");
  console.log("  - ContentRetrievalService");
  console.log("  - SummarizationService");
  console.log("  - MediaDetectionService");
  console.log("  - MediaDownloadService");
  console.log("  - StorageUploadService");
  console.log("  - DatabaseUpdateService");
  console.log("  - HealthCheckService");
  console.log("");
  console.log("To register this deployment with Restate server, run:");
  console.log(
    `  curl -X POST ${config.adminUrl}/deployments -H "Content-Type: application/json" -d '{"uri": "http://localhost:${config.servicePort}"}'`
  );
}

// Start the server
main().catch((error) => {
  console.error("Failed to start Restate service endpoint:", error);
  process.exit(1);
});
