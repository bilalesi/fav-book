# @favy/trigger

Trigger.dev integration package for bookmark enrichment workflows.

## Overview

This package provides durable workflow orchestration for enriching bookmarks with:

- AI-generated summaries
- Extracted keywords and tags
- Downloaded media content
- Metadata extraction

## Features

- **Durable Workflows**: Workflows survive failures and can be resumed
- **Automatic Retries**: Exponential backoff retry logic for transient failures
- **Structured Logging**: Comprehensive logging for observability
- **Error Classification**: Distinguishes between retryable and non-retryable errors
- **Partial Success Handling**: Saves successful results even if some steps fail

## Installation

This package is part of the monorepo and uses workspace dependencies:

```bash
bun install
```

## Configuration

Set the following environment variables:

```bash
TRIGGER_API_KEY=tr_dev_xxxxxxxxxxxxx
TRIGGER_API_URL=http://localhost:3030
TRIGGER_PROJECT_ID=proj_xxxxxxxxxxxxx
TRIGGER_SECRET_KEY=your-secret-key-here
TRIGGER_ENCRYPTION_KEY=your-encryption-key-here
```

## Usage

### Spawning a Workflow

```typescript
import { bookmarkEnrichmentWorkflow } from "@favy/trigger";

// Trigger the workflow
const run = await bookmarkEnrichmentWorkflow.trigger({
  bookmarkId: "bookmark_123",
  userId: "user_456",
  platform: "TWITTER",
  url: "https://twitter.com/user/status/123",
  content: "Original tweet content...",
  enableMediaDownload: true,
});

console.log("Workflow started:", run.id);
```

### Validating Connection

```typescript
import { validateConnection } from "@favy/trigger";

try {
  await validateConnection();
  console.log("Connected to Trigger.dev");
} catch (error) {
  console.error("Connection failed:", error);
}
```

### Content Retrieval

```typescript
import { retrieveContent } from "@favy/trigger";

const content = await retrieveContent(
  "https://example.com/article",
  "GENERIC_URL",
  "Fallback content if retrieval fails"
);
```

## Workflow Steps

The bookmark enrichment workflow executes the following steps:

1. **Content Retrieval**: Fetches full content from the URL
2. **AI Summarization**: Generates summary, keywords, and tags
3. **Media Detection**: Checks if content contains video/audio
4. **Media Download**: Downloads media using Cobalt API (if detected)
5. **Storage Upload**: Uploads media to S3-compatible storage
6. **Database Update**: Persists enriched data and final status

## Error Handling

The workflow implements sophisticated error handling:

- **Retryable Errors**: Network timeouts, service unavailable, rate limits
- **Non-Retryable Errors**: Invalid content, authentication failures, not found
- **Partial Success**: Saves successful results even if some steps fail

## Types

### BookmarkEnrichmentInput

```typescript
interface BookmarkEnrichmentInput {
  bookmarkId: string;
  userId: string;
  platform: Platform;
  url: string;
  content: string;
  enableMediaDownload: boolean;
}
```

### BookmarkEnrichmentOutput

```typescript
interface BookmarkEnrichmentOutput {
  success: boolean;
  summary?: string;
  keywords?: string[];
  tags?: string[];
  mediaMetadata?: MediaMetadata[];
  errors?: WorkflowError[];
  tokensUsed?: number;
  executionTimeMs?: number;
}
```

## Development

### Build

```bash
bun run build
```

### Type Check

```bash
bun run check-types
```

## Dependencies

- `@trigger.dev/sdk`: Workflow orchestration
- `@favy/db`: Database access
- `@favy/shared`: Shared types

## Future Enhancements

- Integration with AI package for summarization
- Integration with media-downloader package
- Integration with storage package
- Comprehensive unit and integration tests
- Performance monitoring and metrics
