# @favy/ai

AI SDK integration package for bookmark enrichment using LM Studio.

## Features

- OpenAI-compatible client for LM Studio
- AI-powered content summarization
- Keyword extraction
- Semantic tag generation
- Connection validation
- Error handling with retry logic

## Installation

This package is part of the monorepo and uses workspace dependencies.

```bash
bun install
```

## Configuration

Set the following environment variables:

```bash
# LM Studio API endpoint (default: http://localhost:1234/v1)
LM_STUDIO_API_URL=http://localhost:1234/v1

# Model name (default: llama-3.2-3b-instruct)
LM_STUDIO_MODEL=llama-3.2-3b-instruct

# Maximum tokens for generation (default: 1000)
LM_STUDIO_MAX_TOKENS=1000

# Temperature for generation (default: 0.7)
LM_STUDIO_TEMPERATURE=0.7
```

## Usage

### Basic Summarization

```typescript
import { createSummarizationService } from "@favy/ai";

const service = createSummarizationService();

const result = await service.generateSummary(content, {
  maxLength: 500,
  keywordCount: 10,
  tagCount: 8,
});

console.log(result.summary);
console.log(result.keywords);
console.log(result.tags);
console.log(`Tokens used: ${result.tokensUsed}`);
```

### Extract Keywords Only

```typescript
const keywords = await service.extractKeywords(content, 10);
```

### Extract Tags Only

```typescript
const tags = await service.extractTags(content, 8);
```

### Validate Connection

```typescript
import { validateLMStudioConnection } from "@favy/ai";

const isConnected = await validateLMStudioConnection();
if (!isConnected) {
  console.error("LM Studio is not available");
}
```

### Custom Configuration

```typescript
const service = createSummarizationService({
  apiUrl: "http://custom-host:1234/v1",
  model: "custom-model",
  maxTokens: 2000,
  temperature: 0.5,
});
```

## Error Handling

The package provides error classification for retry logic:

```typescript
import { isRetryableError, AIServiceError } from "@favy/ai";

try {
  const result = await service.generateSummary(content);
} catch (error) {
  if (error instanceof AIServiceError && error.retryable) {
    // Retry the operation
  } else {
    // Handle non-retryable error
  }
}
```

## LM Studio Setup

1. Download and install LM Studio from https://lmstudio.ai
2. Download a model (e.g., llama-3.2-3b-instruct)
3. Start the local server in LM Studio
4. Verify the server is running at http://localhost:1234

## Development

Build the package:

```bash
bun run build
```

## Architecture

- `src/client.ts` - LM Studio client configuration and utilities
- `src/types.ts` - TypeScript interfaces and types
- `src/prompts/summarization.ts` - Prompt templates and response parsing
- `src/services/summarization.ts` - Summarization service implementation
