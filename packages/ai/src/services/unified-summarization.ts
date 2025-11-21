import { z } from "zod";
import prisma from "@favy/db";

import type { AIProviderClient } from "../providers";
import {
  build_summarization_prompt,
  build_keyword_extraction_prompt,
  make_summarization_schema,
  keywordSchema,
} from "../prompts/summarization";
import type {
  ISummarizationService,
  ISummaryOptions,
  ISummaryResult,
  ProviderConfig,
} from "../types";
import { AIServiceError, AIErrorCode } from "../types";

/**
 * Unified summarization service that works with any AIProviderClient implementation.
 * This service provides consistent summarization and keyword extraction capabilities
 * regardless of the underlying provider (LMStudio, Ollama, etc.).
 */
export class UnifiedSummarizationService implements ISummarizationService {
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
  async make_summary(
    content: string,
    options?: ISummaryOptions
  ): Promise<ISummaryResult> {
    try {
      const maxContentLength = 10000; // ~2500 tokens
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      const allowedTags = (await prisma.category.findMany()).map((v) => ({
        id: v.id,
        name: v.name,
      }));

      console.log(
        `[${this.config.provider}] generateSummary: allowedTags:`,
        allowedTags.length,
        "tags"
      );

      const prompt = build_summarization_prompt(
        truncatedContent,
        options,
        allowedTags
      );

      const dynamicSchema = make_summarization_schema(allowedTags);

      const result = await this.client.make_typed_output({
        prompt,
        schema: dynamicSchema,
        systemPrompt:
          "You must return valid JSON. Select category tags ONLY from the provided allowed list using the exact id and name values. DO NOT create new tags.",
        maxTokens: options?.maxLength
          ? Math.min(this.config.maxTokens, options.maxLength * 2)
          : this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
      });

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

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        `Failed to generate summary: ${error instanceof Error ? error.message : String(error)
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
  async extract_keywords(
    content: string,
    count: number = 10
  ): Promise<string[]> {
    try {
      const maxContentLength = 10000;
      const truncatedContent =
        content.length > maxContentLength
          ? content.substring(0, maxContentLength) + "..."
          : content;

      const prompt = build_keyword_extraction_prompt(truncatedContent, count);
      const result = await this.client.make_typed_output({
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

      if (error instanceof AIServiceError) {
        throw error;
      }

      throw new AIServiceError(
        `Failed to extract keywords: ${error instanceof Error ? error.message : String(error)
        }`,
        AIErrorCode.INVALID_RESPONSE,
        false,
        this.config.provider
      );
    }
  }
}
