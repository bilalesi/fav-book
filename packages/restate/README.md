# @favy/restate

Restate-based workflow orchestration for bookmark enrichment.

This package provides durable execution for bookmark enrichment workflows using Restate's self-hosted infrastructure.

## Features

- **Durable Execution**: Automatic state management and failure recovery
- **Self-Hosted**: No cloud dependencies, runs on your infrastructure
- **Type-Safe**: Full TypeScript support with type definitions
- **Workflow Orchestration**: Multi-step bookmark enrichment with parallel execution
- **Error Handling**: Automatic retry for transient failures, terminal errors for permanent failures
- **Structured Logging**: Comprehensive logging with correlation IDs

## Architecture

The package consists of:

- **Workflows**: Orchestrate multi-step processes (bookmark enrichment)
- **Services**: Individual task handlers (content retrieval, summarization, media download, etc.)
- **Client**: Trigger workflows from external applications
- **Server**: HTTP endpoint that registers services with Restate

## Getting Started

### Prerequisites

1. **Restate Server**: Running Restate server instance

   ```bash
   # Start Restate server using Docker
   docker run -d \
     --name restate \
     -p 8080:8080 \
     -p 9070:9070 \
     -v restate-data:/restate-data \
     restatedev/restate:latest
   ```

2. **Environment Variables**: Configure the following:
   ```bash
   RESTATE_INGRESS_URL=http://localhost:8080
   RESTATE_ADMIN_URL=http://localhost:9070
   RESTATE_SERVICE_PORT=9080
   DATABASE_URL=postgresql://...
   ```

### Running the Service Endpoint

The service endpoint registers all workflows and services with Restate:

```bash
# Development mode
bun run dev

# Production mode
bun run build
bun run start
```

### Registering with Restate Server

After starting the service endpoint, register it with the Restate server:

```bash
curl -X POST http://localhost:9070/deployments \
  -H "Content-Type: application/json" \
  -d '{"uri": "http://localhost:9080"}'
```

This tells the Restate server where to find the service definitions.

### Triggering Workflows

Use the `RestateWorkflowClient` to trigger workflows from your application:

```typescript
import { RestateWorkflowClient } from "@favy/restate";

const client = new RestateWorkflowClient({
  ingressUrl: "http://localhost:8080",
  adminUrl: "http://localhost:9070",
});

const result = await client.triggerBookmarkEnrichment({
  bookmarkId: "bm-123",
  userId: "user-456",
  platform: "TWITTER",
  url: "https://twitter.com/...",
  content: "Tweet content...",
  enableMediaDownload: true,
});

console.log("Workflow ID:", result.id);
```

## Services

The package includes the following services:

### Workflows

- **BookmarkEnrichment**: Main workflow that orchestrates all enrichment steps

### Task Services

- **ContentRetrievalService**: Fetches full content from URLs
- **SummarizationService**: Generates AI summaries, keywords, and tags
- **MediaDetectionService**: Detects downloadable media in URLs
- **MediaDownloadService**: Downloads media files using Cobalt API
- **StorageUploadService**: Uploads media to S3-compatible storage
- **DatabaseUpdateService**: Persists enriched data to the database

### Utility Services

- **HealthCheckService**: Health check endpoint for monitoring

## Configuration

All configuration is loaded from environment variables:

| Variable                  | Default                 | Description                     |
| ------------------------- | ----------------------- | ------------------------------- |
| `RESTATE_INGRESS_URL`     | `http://localhost:8080` | Restate ingress endpoint        |
| `RESTATE_ADMIN_URL`       | `http://localhost:9070` | Restate admin API endpoint      |
| `RESTATE_SERVICE_PORT`    | `9080`                  | Port for service endpoint       |
| `DATABASE_URL`            | (required)              | PostgreSQL connection string    |
| `ENABLE_AI_SUMMARIZATION` | `true`                  | Enable/disable AI summarization |
| `ENABLE_MEDIA_DOWNLOAD`   | `true`                  | Enable/disable media download   |
| `MAX_MEDIA_SIZE_MB`       | `100`                   | Maximum media file size in MB   |

## Error Handling

The package uses Restate's built-in retry mechanism:

- **Retryable Errors**: Network errors, timeouts, rate limits → automatic retry with exponential backoff
- **Terminal Errors**: Invalid input, business logic failures → no retry, workflow fails immediately

## Logging

All workflows and services use structured logging with correlation IDs:

```json
{
  "timestamp": "2025-11-18T10:30:00Z",
  "level": "info",
  "message": "Workflow started",
  "workflowId": "wf-123",
  "bookmarkId": "bm-456",
  "userId": "user-789",
  "correlationId": "corr-abc"
}
```

## Development

### Building

```bash
bun run build
```

### Running Tests

```bash
bun test
```

### Type Checking

```bash
bun run typecheck
```

## Deployment

See the main project documentation for deployment instructions using Docker Compose.

## License

MIT
