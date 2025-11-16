import { z } from "zod";
import type { SummaryOptions } from "../types";

/**
 * Zod schema for summarization response
 */
export const summarizationSchema = z.object({
  summary: z
    .string()
    .describe("A concise summary highlighting the main points and key ideas"),
  keywords: z
    .array(z.string())
    .min(3)
    .max(10)
    .describe("Relevant keywords that capture the core topics"),
  tags: z
    .array(z.string())
    .min(2)
    .max(8)
    .describe("Semantic tags for categorization"),
});

/**
 * Zod schema for keyword extraction response
 */
export const keywordSchema = z.object({
  keywords: z
    .array(z.string())
    .min(3)
    .max(10)
    .describe("Relevant keywords from the content"),
});

/**
 * Zod schema for tag extraction response
 */
export const tagSchema = z.object({
  tags: z
    .array(z.string())
    .min(2)
    .max(8)
    .describe("Semantic tags for categorization"),
});

/**
 * Build a prompt for generating a summary with keywords and tags
 */
export function buildSummarizationPrompt(
  content: string,
  options?: SummaryOptions
): string {
  const maxLength = options?.maxLength || 500;
  const keywordCount = options?.keywordCount || 10;
  const tagCount = options?.tagCount || 8;

  return `Analyze the following content and provide:
1. A concise summary (maximum ${maxLength} words) highlighting the main points and key ideas
2. Between 3 and ${keywordCount} relevant keywords that capture the core topics
3. Between 2 and ${tagCount} semantic tags for categorization

Content:
${content}

Important:
- Keep the summary focused and informative
- Keywords should be single words or short phrases
- Tags should be broad categories that help organize content`;
}

/**
 * Build a prompt for extracting keywords only
 */
export function buildKeywordExtractionPrompt(
  content: string,
  count: number = 10
): string {
  return `Extract between 3 and ${count} relevant keywords from the following content. Keywords should be single words or short phrases that capture the core topics.

Content:
${content}`;
}

/**
 * Build a prompt for extracting tags only
 */
export function buildTagExtractionPrompt(
  content: string,
  count: number = 8
): string {
  return `Extract between 2 and ${count} semantic tags from the following content. Tags should be broad categories that help organize and categorize the content.

Content:
${content}`;
}
