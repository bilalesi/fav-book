// Export the abstract provider interface
export type { AIProviderClient } from "./interface";

// Export provider implementations
export { LMStudioClient } from "./lmstudio-client";
export { OllamaClient } from "./ollama-client";

// Export error mapping utilities
export {
  isRetryableError,
  mapErrorToCode,
  createAIServiceError,
  BaseErrorMapper,
} from "./error-mapping";

// Export provider-specific error mappers
export { LMStudioErrorMapper, mapLMStudioError } from "./lmstudio-error-mapper";
export { OllamaErrorMapper, mapOllamaError } from "./ollama-error-mapper";

// Export validation utilities
export {
  validateContent,
  validateAndTruncateContent,
  validateModelAvailability,
  validateApiUrl,
  validateConfiguration,
  createTimeoutSignal,
  validateConnectionResponse,
} from "./validation";
