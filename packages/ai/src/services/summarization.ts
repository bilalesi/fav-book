import { generateObject } from "ai";
import { z } from "zod";
import prisma from "@favy/db";

import { createLMStudioClient, createAIServiceError } from "../client";
import { getLMStudioConfig } from "../config";
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
  LMStudioConfig,
} from "../types";

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

  async generateSummary(
    content: string,
    options?: SummaryOptions
  ): Promise<SummaryResult> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error("Content cannot be empty");
      }

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
        "# # generateSummary # allowedTags:",
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

      const result = await generateObject({
        model: this.client,
        schema: dynamicSchema,
        prompt,
        maxOutputTokens: options?.maxLength
          ? Math.min(this.config.maxTokens, options.maxLength * 2)
          : this.config.maxTokens,
        temperature: options?.temperature ?? this.config.temperature,
        mode: "json",
        system:
          "You must return valid JSON. Select category tags ONLY from the provided allowed list using the exact id and name values. DO NOT create new tags.",
      });

      // Type the result
      const data = result.object as {
        summary: string;
        keywords: string[];
        tags: Array<{ id: string; name: string }>;
      };

      console.log("# # generateSummary # result:", {
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
      console.log("# # generateSummary # error:", error);
      throw createAIServiceError(
        error,
        "Failed to generate summary",
        "lmstudio"
      );
    }
  }

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
      throw createAIServiceError(
        error,
        "Failed to extract keywords",
        "lmstudio"
      );
    }
  }
}

export function createSummarizationService(
  config?: Partial<LMStudioConfig>
): SummarizationService {
  return new LMStudioSummarizationService(config);
}
