// Export types
export type {
  ISummaryOptions as SummaryOptions,
  ISummaryResult as SummaryResult,
  ISummarizationService as SummarizationService,
  LMStudioConfig,
  OllamaConfig,
  ProviderConfig,
  BaseProviderConfig,
} from "./types";
export { AIServiceError, AIErrorCode } from "./types";

// Export configuration utilities
export {
  detect_provider,
  get_lmstudio_config,
  get_ollama_config,
  get_provider_config,
  should_validate_on_startup,
  is_strict_mode,
} from "./config";

// Export provider interface and utilities
export type { AIProviderClient } from "./providers";
export {
  is_retryable_error,
  map_error_to_code,
  create_ai_service_error,
  validate_content,
  validate_truncate_content,
  validate_model_availability,
  validate_api_url,
  validate_configuration,
  create_timeout_signal,
  assess_connection_response,
  BaseErrorMapper,
  LMStudioClient,
  OllamaClient,
} from "./providers";


// Export prompt utilities and schemas
export {
  build_summarization_prompt,
  build_keyword_extraction_prompt,
  build_tag_extraction_prompt,
  summarizationSchema,
  keywordSchema,
  tagSchema,
} from "./prompts/summarization";

export { UnifiedSummarizationService } from "./services/unified-summarization";

export { make_summarization_service } from "./factory";
