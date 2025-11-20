# AI Provider Interface

This directory contains the abstract provider interface and common utilities for implementing AI provider clients.

## Overview

The provider system enables support for multiple AI providers (LMStudio, Ollama) through a common interface. All provider implementations must implement the `AIProviderClient` interface.

## Files

### `interface.ts`

Defines the `AIProviderClient` interface that all provider implementations must follow:

- `generateStructuredOutput<T>()` - Generate structured output using a Zod schema
- `validateConnection()` - Validate connection to the provider
- `getAvailableModels()` - Get list of available models

### `error-mapping.ts`

Provides utilities for mapping provider-specific errors to standard `AIServiceError` instances:

- `isRetryableError()` - Determine if an error should be retried
- `mapErrorToCode()` - Map errors to standard `AIErrorCode` values
- `createAIServiceError()` - Create properly formatted `AIServiceError` instances
- `BaseErrorMapper` - Abstract base class for provider-specific error mappers

### `validation.ts`

Common validation utilities used by all providers:

- `validateContent()` - Validate content is not empty
- `validateAndTruncateContent()` - Validate and truncate content if too long
- `validateModelAvailability()` - Check if a model is available
- `validateApiUrl()` - Validate API URL format
- `validateConfiguration()` - Validate provider configuration
- `createTimeoutSignal()` - Create timeout signal for fetch requests
- `validateConnectionResponse()` - Validate HTTP response from provider

## Usage

### Implementing a New Provider

To implement a new provider, create a class that implements `AIProviderClient`:

```typescript
import type { AIProviderClient } from "./interface";
import { BaseErrorMapper, validateContent } from "./validation";

class MyProviderClient implements AIProviderClient {
  async generateStructuredOutput<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    object: T;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    // Validate input
    validateContent(params.prompt, "myprovider");

    // Implementation here
  }

  async validateConnection(): Promise<boolean> {
    // Implementation here
  }

  async getAvailableModels(): Promise<string[]> {
    // Implementation here
  }
}
```

### Using Error Mapping

```typescript
import { createAIServiceError } from "./error-mapping";

try {
  // Provider-specific operation
} catch (error) {
  throw createAIServiceError(error, "Failed to generate output", "myprovider");
}
```

### Using Validation

```typescript
import {
  validateContent,
  validateConfiguration,
  validateConnectionResponse,
} from "./validation";

// Validate content before processing
validateContent(content, "myprovider");

// Validate configuration
validateConfiguration(config, "myprovider");

// Validate HTTP response
const response = await fetch(url);
validateConnectionResponse(response, "myprovider");
```

## Error Handling

All errors should be mapped to `AIServiceError` with appropriate error codes:

- **Retryable errors**: Network issues, timeouts, rate limits, service unavailable
- **Non-retryable errors**: Invalid input, configuration errors, model not found

The error mapping utilities automatically determine if an error is retryable based on its characteristics.

## Testing

Each utility module has comprehensive unit tests:

- `error-mapping.test.ts` - Tests for error mapping utilities
- `validation.test.ts` - Tests for validation utilities

Run tests with:

```bash
bun test
```
