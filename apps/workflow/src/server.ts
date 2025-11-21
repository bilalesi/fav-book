/**
 * Restate service endpoint
 *
 * Registers all workflows and services with Restate
 * Starts the HTTP server to accept workflow invocations
 */
import http2 from "node:http2";
import * as restate from "@restatedev/restate-sdk";


import { bookmark_enrichment_workflow } from "./workflows/bookmark-enrichment";
import { content_retrieval_service } from "./services/content-retrieval";
import { database_update_service } from "./services/database-update";
import { media_detection_service } from "./services/media-detection";
import { media_download_service } from "./services/media-download";
import { storage_upload_service } from "./services/storage-upload";
import { summarization_service } from "./services/summarization";
import { load_config } from "./lib/config";

/**
 * Health check service
 * Provides a simple health check endpoint to verify the service is running
 */
const health_probe_service = restate.service({
  name: "health_probe_service",
  handlers: {
    check: async (
      ctx: restate.Context,
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
  const config = load_config();

  console.log("Starting Restate service endpoint...");
  console.log(`Service port: ${config.servicePort}`);
  console.log(`Restate ingress URL: ${config.ingressUrl}`);
  console.log(`Restate admin URL: ${config.adminUrl}`);

  // Create Restate endpoint and register all services
  const http2Handler = restate.createEndpointHandler({
    services: [
      bookmark_enrichment_workflow,
      content_retrieval_service,
      summarization_service,
      media_detection_service,
      media_download_service,
      storage_upload_service,
      database_update_service,
      health_probe_service,
    ],
  });

  const httpServer = http2.createServer(http2Handler);
  httpServer.listen(config.servicePort);

  console.log(
    `Restate service endpoint listening on port ${config.servicePort}`,
  );
  console.log("Registered services:");
  console.log("  - bookmark_enrichment_workflow (workflow)");
  console.log("  - content_retrieval_service");
  console.log("  - summarization_service");
  console.log("  - media_detection_service");
  console.log("  - media_download_service");
  console.log("  - storage_upload_service");
  console.log("  - database_update_service");
  console.log("  - health_probe_service");
  console.log("");
  console.log("To register this deployment with Restate server, run:");
  console.log(
    `  curl -X POST ${config.adminUrl}/deployments -H "Content-Type: application/json" -d '{"uri": "http://localhost:${config.servicePort}"}'`,
  );
}

main().catch((error) => {
  console.error("Failed to start Restate service endpoint:", error);
  process.exit(1);
});
