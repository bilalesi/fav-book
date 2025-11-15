import { generateText } from "ai";
import {
  createLMStudioClient,
  getLMStudioConfig,
  createAIServiceError,
} from "../client";
import {
  buildSummarizationPrompt,
  buildKeywordExtractionPrompt,
  buildTagExtractionPrompt,
  parseSummarizationResponse,
  parseKeywordResponse,
  parseTagResponse,
} from "../prompts/summarization";
import type {
  SummarizationService,
  SummaryOptions,
  SummaryResult,
  LMStudioConfig,
} from "../types";

/**
 * Implementation of the SummarizationService using LM Studio
 */
export class LMStudioSummarizationService implements SummarizationService {
  private client: ReturnType<typeof createLMStudioClient>;
  private config: LMStudioConfig;

  constructor(config?: Partial<LMStudioConfig>) {
    this.config = {
      ...getLMStudioConfig(),
      ...config,
    };
    this.client = createLMStudioClient(config);
  }

  /**
   * Generate a summary with keywords and tags from content
   */
  async generateSummary(
    content: string,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error("Content cannot be empty");
      }

      // Truncate content if too long (to avoid token limits)
      const maxContentLength = 10000; // ~2500 tokens
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      // Build prompt
      const prompt = buildSummarizationPrompt(truncatedContent, options);

      // Generate text using AI SDK
      const { text, usage } = await generateText({
        model: this.client(this.config.model),
        prompt,
        maxTokens: options?.maxLength
          ? Math.min(this.config.maxTokens, options.maxLength * 2)
          : this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      });

      // Parse and validate response
      const parsed = parseSummarizationResponse(text);

      return {
        summary: parsed.summary,
        keywords: parsed.keywords,
        tags: parsed.tags,
        tokensUsed: usage.totalTokens,
      };
    } catch (error) {
      throw createAIServiceError(error, "Failed to generate summary");
    }
  }

  /**
   * Extract keywords from content
   */
  async extractKeywords(
    content: string,
    count: number = 10
  ): Promise<string[]> {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error("Content cannot be empty");
      }

      // Truncate content if too long
      const maxContentLength = 10000;
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      // Build prompt
      const prompt = buildKeywordExtractionPrompt(truncatedContent, count);

      // Generate text using AI SDK
      const { text } = await generateText({
        model: this.client(this.config.model),
        prompt,
        maxTokens: 500, // Keywords should be short
        temperature: this.config.temperature,
      });

      // Parse and validate response
      return parseKeywordResponse(text);
    } catch (error) {
      throw createAIServiceError(error, "Failed to extract keywords");
    }
  }

  /**
   * Extract semantic tags from content
   */
  async extractTags(content: string, count: number = 8): Promise<string[]> {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new Error("Content cannot be empty");
      }

      // Truncate content if too long
      const maxContentLength = 10000;
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      // Build prompt
      const prompt = buildTagExtractionPrompt(truncatedContent, count);

      // Generate text using AI SDK
      const { text } = await generateText({
        model: this.client(this.config.model),
        prompt,
        maxTokens: 300, // Tags should be short
        temperature: this.config.temperature,
      });

      // Parse and validate response
      return parseTagResponse(text);
    } catch (error) {
      throw createAIServiceError(error, "Failed to extract tags");
    }
  }
}

/**
 * Create a default summarization service instance
 */
export function createSummarizationService(
  config?: Partial<LMStudioConfig>
): SummarizationService {
  return new LMStudioSummarizationService(config);
}
