import type { TAiProvider } from "@favy/shared";

export interface ISummaryOptions {
  maxLength?: number;
  keywordCount?: number;
  tagCount?: number;
  temperature?: number;
}

export interface ISummaryResult {
  summary: string;
  keywords: string[];
  tags: Array<{ id: string; name: string }>;
  tokensUsed?: number;
}

export interface ISummarizationService {
  make_summary(
    content: string,
    options?: ISummaryOptions
  ): Promise<ISummaryResult>;
  extract_keywords(content: string, count?: number): Promise<string[]>;
}


// Base configuration shared by all providers
export interface BaseProviderConfig {
  apiUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// LMStudio-specific configuration
export interface LMStudioConfig extends BaseProviderConfig {
  provider: "lmstudio";
}

// Ollama-specific configuration
export interface OllamaConfig extends BaseProviderConfig {
  provider: "ollama";
  format?: "json"; // Ollama's response format
}

// Union type for all provider configurations
export type ProviderConfig = LMStudioConfig | OllamaConfig;

// Error codes enum
export enum AIErrorCode {
  // Network errors (retryable)
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  CONNECTION_REFUSED = "CONNECTION_REFUSED",

  // Service errors (retryable)
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Configuration errors (non-retryable)
  INVALID_PROVIDER = "INVALID_PROVIDER",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",

  // Input errors (non-retryable)
  INVALID_INPUT = "INVALID_INPUT",
  CONTENT_TOO_LONG = "CONTENT_TOO_LONG",

  // Response errors
  INVALID_RESPONSE = "INVALID_RESPONSE",
  SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",
}

// Enhanced AIServiceError with provider context
export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode | string,
    public readonly retryable: boolean = false,
    public readonly provider?: TAiProvider
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}
