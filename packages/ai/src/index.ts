// Export types
export type {
  SummaryOptions,
  SummaryResult,
  SummarizationService,
  LMStudioConfig,
  OllamaConfig,
  ProviderConfig,
  AIProvider,
  BaseProviderConfig,
} from "./types";
export { AIServiceError, AIErrorCode } from "./types";

// Export configuration utilities
export {
  detectProvider,
  getLMStudioConfig,
  getOllamaConfig,
  getProviderConfig,
  shouldValidateOnStartup,
  isStrictMode,
} from "./config";

// Export provider interface and utilities
export type { AIProviderClient } from "./providers";
export {
  isRetryableError,
  mapErrorToCode,
  createAIServiceError,
  BaseErrorMapper,
  validateContent,
  validateAndTruncateContent,
  validateModelAvailability,
  validateApiUrl,
  validateConfiguration,
  createTimeoutSignal,
  validateConnectionResponse,
  LMStudioClient,
  OllamaClient,
} from "./providers";

// Export client utilities (legacy - will be replaced by provider implementations)
export { createLMStudioClient, validateLMStudioConnection } from "./client";

// Export prompt utilities and schemas
export {
  buildSummarizationPrompt,
  buildKeywordExtractionPrompt,
  buildTagExtractionPrompt,
  summarizationSchema,
  keywordSchema,
  tagSchema,
} from "./prompts/summarization";

// Export services
export {
  LMStudioSummarizationService,
  createSummarizationService as createLegacySummarizationService,
} from "./services/summarization";
export { UnifiedSummarizationService } from "./services/unified-summarization";

// Export factory function (new unified approach)
export { createSummarizationService } from "./factory";
