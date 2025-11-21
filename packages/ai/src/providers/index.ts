// Export the abstract provider interface
export type { AIProviderClient } from "./interface";

// Export provider implementations
export { LMStudioClient } from "./lmstudio/lmstudio-client";
export { OllamaClient } from "./ollama/ollama-client";

// Export error mapping utilities
export {
  is_retryable_error,
  map_error_to_code,
  create_ai_service_error,
  BaseErrorMapper,
} from "./error-mapping";

// Export provider-specific error mappers
export { LMStudioErrorMapper, map_lmstudio_error } from "./lmstudio/lmstudio-error-mapper";
export { OllamaErrorMapper, map_ollama_error } from "./ollama/ollama-error-mapper";

// Export validation utilities
export {
  validate_content,
  validate_truncate_content,
  validate_model_availability,
  validate_api_url,
  validate_configuration,
  create_timeout_signal,
  assess_connection_response,
} from "./validation";
