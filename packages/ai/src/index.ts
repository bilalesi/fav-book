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

// Export prompt utilities
export {
  buildSummarizationPrompt,
  buildKeywordExtractionPrompt,
  buildTagExtractionPrompt,
  parseSummarizationResponse,
  parseKeywordResponse,
  parseTagResponse,
} from "./prompts/summarization";

// Export services
export {
  LMStudioSummarizationService,
  createSummarizationService,
} from "./services/summarization";
