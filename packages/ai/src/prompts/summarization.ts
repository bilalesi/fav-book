import type { SummaryOptions } from "../types";

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

Respond in JSON format with this exact structure:
{
  "summary": "Your summary here...",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "tags": ["tag1", "tag2", "tag3"]
}

Important:
- Keep the summary focused and informative
- Keywords should be single words or short phrases
- Tags should be broad categories that help organize content
- Ensure valid JSON format`;
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
${content}

Respond in JSON format:
{
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;
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
${content}

Respond in JSON format:
{
  "tags": ["tag1", "tag2", "tag3"]
}`;
}

/**
 * Parse and validate the LLM response for summarization
 */
export function parseSummarizationResponse(response: string): {
  summary: string;
  keywords: string[];
  tags: string[];
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.summary || typeof parsed.summary !== "string") {
      throw new Error("Invalid or missing summary");
    }

    if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
      throw new Error("Invalid or missing keywords");
    }

    if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) {
      throw new Error("Invalid or missing tags");
    }

    // Ensure all keywords and tags are strings
    const keywords = parsed.keywords
      .filter((k: unknown) => typeof k === "string" && k.trim().length > 0)
      .slice(0, 10);

    const tags = parsed.tags
      .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
      .slice(0, 8);

    if (keywords.length === 0) {
      throw new Error("No valid keywords found");
    }

    if (tags.length === 0) {
      throw new Error("No valid tags found");
    }

    return {
      summary: parsed.summary.trim(),
      keywords,
      tags,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse summarization response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Parse and validate the LLM response for keyword extraction
 */
export function parseKeywordResponse(response: string): string[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.keywords) || parsed.keywords.length === 0) {
      throw new Error("Invalid or missing keywords");
    }

    return parsed.keywords
      .filter((k: unknown) => typeof k === "string" && k.trim().length > 0)
      .slice(0, 10);
  } catch (error) {
    throw new Error(
      `Failed to parse keyword response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Parse and validate the LLM response for tag extraction
 */
export function parseTagResponse(response: string): string[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.tags) || parsed.tags.length === 0) {
      throw new Error("Invalid or missing tags");
    }

    return parsed.tags
      .filter((t: unknown) => typeof t === "string" && t.trim().length > 0)
      .slice(0, 8);
  } catch (error) {
    throw new Error(
      `Failed to parse tag response: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
