import { z } from "zod";
import prisma from "@favy/db";

import type { AIProviderClient } from "../providers";
import {
  buildSummarizationPrompt,
  buildKeywordExtractionPrompt,
  createSummarizationSchema,
  keywordSchema,
} from "../prompts/summarization";
import type {
  SummarizationService,
  SummaryOptions,
  SummaryResult,
  ProviderConfig,
} from "../types";
import { AIServiceError, AIErrorCode } from "../types";

/**
 * Unified summarization service that works with any AIProviderClient implementation.
 * This service provides consistent summarization and keyword extraction capabilities
 * regardless of the underlying provider (LMStudio, Ollama, etc.).
 */
export class UnifiedSummarizationService implements SummarizationService {
  private client: AIProviderClient;
  private config: ProviderConfig;

  /**
   * Create a new UnifiedSummarizationService
   * @param client - The AI provider client to use for generation
   * @param config - Provider configuration
   */
  constructor(client: AIProviderClient, config: ProviderConfig) {
    this.client = client;
    this.config = config;
  }

  /**
   * Generate a summary with keywords and tags from content
   * @param content - The content to summarize
   * @param options - Optional summarization options
   * @returns Promise with summary result including keywords and tags
   */
  async generateSummary(
    content: string,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new AIServiceError(
          "Content cannot be empty",
          AIErrorCode.INVALID_INPUT,
          false,
          this.config.provider
        );
      }

      // Truncate content if too long
      const maxContentLength = 10000; // ~2500 tokens
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      // Fetch allowed categories from database
      const allowedTags = (await prisma.category.findMany()).map((v) => ({
        id: v.id,
        name: v.name,
      }));

      console.log(
        `[${this.config.provider}] generateSummary: allowedTags:`,
        allowedTags.length,
        "tags"
      );

      // Build prompt with allowed tags
      const prompt = buildSummarizationPrompt(
        truncatedContent,
        options,
        allowedTags
      );

      // Create dynamic schema with allowed tag IDs for strict validation
      const dynamicSchema = createSummarizationSchema(allowedTags);

      // Generate structured output using the provider client
      const result = await this.client.generateStructuredOutput({
        prompt,
        schema: dynamicSchema,
        systemPrompt:
          "You must return valid JSON. Select category tags ONLY from the provided allowed list using the exact id and name values. DO NOT create new tags.",
        maxTokens: options?.maxLength
          ? Math.min(this.config.maxTokens, options.maxLength * 2)
          : this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      });

      // Type the result
      const data = result.object as {
        summary: string;
        keywords: string[];
        tags: Array<{ id: string; name: string }>;
      };

      console.log(`[${this.config.provider}] generateSummary: result:`, {
        summaryLength: data.summary.length,
        keywordsCount: data.keywords.length,
        tagsCount: data.tags.length,
        selectedTags: data.tags.map((t) => t.name),
        tokensUsed: result.usage.totalTokens,
      });

      return {
        summary: data.summary,
        keywords: data.keywords,
        tags: data.tags,
        tokensUsed: result.usage.totalTokens,
      };
    } catch (error) {
      console.error(`[${this.config.provider}] generateSummary: error:`, error);

      // If it's already an AIServiceError, rethrow it
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Otherwise, wrap it in an AIServiceError
      throw new AIServiceError(
        `Failed to generate summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AIErrorCode.INVALID_RESPONSE,
        false,
        this.config.provider
      );
    }
  }

  /**
   * Extract keywords from content
   * @param content - The content to extract keywords from
   * @param count - Number of keywords to extract (default: 10)
   * @returns Promise with array of keyword strings
   */
  async extractKeywords(
    content: string,
    count: number = 10
  ): Promise<string[]> {
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new AIServiceError(
          "Content cannot be empty",
          AIErrorCode.INVALID_INPUT,
          false,
          this.config.provider
        );
      }

      // Truncate content if too long
      const maxContentLength = 10000;
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      // Build prompt
      const prompt = buildKeywordExtractionPrompt(truncatedContent, count);

      // Generate structured output using the provider client
      const result = await this.client.generateStructuredOutput({
        prompt,
        schema: keywordSchema,
        maxTokens: 500, // Keywords should be short
        temperature: this.config.temperature,
      });

      type KeywordResult = z.infer<typeof keywordSchema>;
      const data = result.object as KeywordResult;

      console.log(
        `[${this.config.provider}] extractKeywords: extracted ${data.keywords.length} keywords`
      );

      return data.keywords;
    } catch (error) {
      console.error(`[${this.config.provider}] extractKeywords: error:`, error);

      // If it's already an AIServiceError, rethrow it
      if (error instanceof AIServiceError) {
        throw error;
      }

      // Otherwise, wrap it in an AIServiceError
      throw new AIServiceError(
        `Failed to extract keywords: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AIErrorCode.INVALID_RESPONSE,
        false,
        this.config.provider
      );
    }
  }
}
