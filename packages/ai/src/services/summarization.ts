import { generateObject } from "ai";
import { z } from "zod";
import {
  createLMStudioClient,
  getLMStudioConfig,
  createAIServiceError,
} from "../client";
import {
  buildSummarizationPrompt,
  buildKeywordExtractionPrompt,
  buildTagExtractionPrompt,
  summarizationSchema,
  keywordSchema,
  tagSchema,
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

      // Generate structured output using AI SDK 6
      const result = await generateObject({
        model: this.client,
        schema: summarizationSchema,
        prompt,
        maxOutputTokens: options?.maxLength
          ? Math.min(this.config.maxTokens, options.maxLength * 2)
          : this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        mode: "json",
        system:
          "Please generate only the JSON output. DO NOT provide any preamble.",
      });

      // Type the result using Zod inference
      type SummarizationResult = z.infer<typeof summarizationSchema>;
      const data = result.object as SummarizationResult;

      console.log("# # generateSummary # object, usage:", data, result.usage);

      return {
        summary: data.summary,
        keywords: data.keywords,
        tags: data.tags,
        tokensUsed: result.usage.totalTokens,
      };
    } catch (error) {
      console.log("# # generateSummary # error:", error);
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

      // Generate structured output using AI SDK 6
      const result = await generateObject({
        model: this.client,
        schema: keywordSchema,
        prompt,
        maxOutputTokens: 500, // Keywords should be short
        temperature: this.config.temperature,
      });

      type KeywordResult = z.infer<typeof keywordSchema>;
      const data = result.object as KeywordResult;
      return data.keywords;
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

      // Generate structured output using AI SDK 6
      const result = await generateObject({
        model: this.client,
        schema: tagSchema,
        prompt,
        maxOutputTokens: 300, // Tags should be short
        temperature: this.config.temperature,
      });

      type TagResult = z.infer<typeof tagSchema>;
      const data = result.object as TagResult;
      return data.tags;
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
