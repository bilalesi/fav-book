import { z } from "zod";
import type { SummaryOptions } from "../types";

/**
 * Create a dynamic summarization schema with allowed tag IDs
 */
export function createSummarizationSchema(
  allowedTags: Array<{ id: string; name: string }>
) {
  return z.object({
    summary: z
      .string()
      .describe("A concise summary highlighting the main points and key ideas"),
    keywords: z
      .array(z.string())
      .min(3)
      .max(10)
      .describe("Relevant keywords that capture the core topics"),
    tags: z
      .array(
        z.union(
          allowedTags.map((t) =>
            z.object({
              id: z.literal(t.id),
              name: z.literal(t.name),
            })
          )
        )
      )
      .describe("Category tags selected from the allowed list"),
  });
}

// Default schema for backward compatibility
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
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .min(1)
    .max(8)
    .describe("Semantic tags for categorization"),
});

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
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .min(2)
    .max(8)
    .describe("Semantic tags for categorization"),
});

/**
 * Build a prompt for generating a summary with keywords and tags
 */
export function buildSummarizationPrompt(
  input: string,
  options?: SummaryOptions,
  allowedTags?: Array<{ id: string; name: string }>
): string {
  const maxLength = options?.maxLength || 1000;
  const keywordCount = options?.keywordCount || 8;
  const tagCount = options?.tagCount || 3;

  // Format allowed tags as a clear list
  const tagsList = allowedTags
    ? allowedTags
        .map((tag) => `  - id: "${tag.id}", name: "${tag.name}"`)
        .join("\n")
    : "No tags available";

  return `You are an expert information extractor.

Task:
Analyze the content from the following tweet or URL and provide:

1. A highly informative summary (up to ${maxLength} words) including:
   - Main claim or message
   - Supporting facts, context, key numbers, names, and dates
   - Any calls to action, opinions, or implications

2. ${keywordCount} high-value keywords:
   - Reflect important entities, topics, technologies, people, or events
   - Use single words or short phrases

3. Between 1 and ${tagCount} category tags:
   - You MUST select ONLY from the allowed tags list below
   - Return the EXACT id and name as shown in the list
   - Choose tags that best match the content's topic
   - If no tags match well, select the closest 1-2 tags
   - Filter out undefined or null tags
   - Return empty array if the tags contains nullish values
   - DO NOT create new tags or modify the names

ALLOWED TAGS (you must choose from these ONLY):
${tagsList}

Content:
${input}

CRITICAL: Your "tags" array must contain objects with "id" and "name" fields that EXACTLY match entries from the ALLOWED TAGS list above. Do not invent new tags.

Guidelines:
- Maximize useful information density
- If the content lacks details or is incomplete, infer meaning from context
- Do NOT add information not supported by the content`;
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
