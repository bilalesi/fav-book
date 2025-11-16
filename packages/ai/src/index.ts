// Export types
export type {
  SummaryOptions,
  SummaryResult,
  SummarizationService,
  LMStudioConfig,
} from "./types";
export { AIServiceError } from "./types";

// Export client utilities
export {
  createLMStudioClient,
  getLMStudioConfig,
  validateLMStudioConnection,
  isRetryableError,
  createAIServiceError,
} from "./client";

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
  createSummarizationService,
} from "./services/summarization";
