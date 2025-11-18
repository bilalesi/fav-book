/**
 * Content retrieval service for Restate workflows
 *
 * Fetches full content from URLs for different platforms
 * Handles Twitter, LinkedIn, and generic URLs
 */

import * as restate from "@restatedev/restate-sdk";
import type { Platform } from "@favy/shared";
import { throwAppropriateError } from "../lib/errors";
import { createWorkflowLogger } from "../lib/logger";

/**
 * Input for content retrieval service
 */
export interface ContentRetrievalInput {
  url: string;
  platform: Platform;
  fallbackContent: string;
  bookmarkId: string;
  workflowId: string;
  userId: string;
}

/**
 * Output from content retrieval service
 */
export interface ContentRetrievalOutput {
  content: string;
  success: boolean;
}

/**
 * Content retrieval service
 * Wraps external API calls in ctx.run() for durability
 */
export const contentRetrievalService = restate.service({
  name: "ContentRetrievalService",
  handlers: {
    retrieve: async (
      ctx: restate.Context,
      input: ContentRetrievalInput
    ): Promise<ContentRetrievalOutput> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Starting content retrieval", {
        url: input.url,
        platform: input.platform,
      });

      try {
        // Validate URL using ctx.run() for durability
        const isValid = await ctx.run("validate-url", async () => {
          return isValidUrl(input.url);
        });

        if (!isValid) {
          throw new Error(`Invalid URL: ${input.url}`);
        }

        // Route to appropriate handler based on platform
        let content: string;
        switch (input.platform) {
          case "TWITTER":
            content = await retrieveTwitterContent(
              ctx,
              input.url,
              input.fallbackContent,
              logger
            );
            break;
          case "LINKEDIN":
            content = await retrieveLinkedInContent(
              ctx,
              input.url,
              input.fallbackContent,
              logger
            );
            break;
          case "GENERIC_URL":
            content = await retrieveGenericContent(
              ctx,
              input.url,
              input.fallbackContent,
              logger
            );
            break;
          default:
            throw new Error(`Unsupported platform: ${input.platform}`);
        }

        logger.info("Content retrieval completed", {
          contentLength: content.length,
        });

        return {
          content,
          success: true,
        };
      } catch (error) {
        logger.error("Content retrieval failed", error as Error, {
          url: input.url,
          platform: input.platform,
        });

        // Return fallback content on error instead of throwing
        return {
          content: input.fallbackContent,
          success: false,
        };
      }
    },
  },
});

/**
 * Retrieves content from Twitter URLs
 */
async function retrieveTwitterContent(
  ctx: restate.Context,
  url: string,
  fallbackContent: string,
  logger: any
): Promise<string> {
  return await ctx.run("retrieve-twitter-content", async () => {
    // Twitter content retrieval would require:
    // 1. Twitter API credentials
    // 2. Tweet ID extraction from URL
    // 3. API call to fetch tweet details
    // 4. Extraction of full text, including thread if applicable

    // For now, we use the fallback content which was already captured
    logger.info("Twitter content retrieval: using fallback content", { url });
    return fallbackContent;
  });
}

/**
 * Retrieves content from LinkedIn URLs
 */
async function retrieveLinkedInContent(
  ctx: restate.Context,
  url: string,
  fallbackContent: string,
  logger: any
): Promise<string> {
  return await ctx.run("retrieve-linkedin-content", async () => {
    // LinkedIn content retrieval would require:
    // 1. LinkedIn API credentials
    // 2. Post ID extraction from URL
    // 3. API call to fetch post details
    // 4. Extraction of full text and comments if needed

    // For now, we use the fallback content which was already captured
    logger.info("LinkedIn content retrieval: using fallback content", { url });
    return fallbackContent;
  });
}

/**
 * Retrieves content from generic URLs
 */
async function retrieveGenericContent(
  ctx: restate.Context,
  url: string,
  fallbackContent: string,
  logger: any
): Promise<string> {
  return await ctx.run("retrieve-generic-content", async () => {
    try {
      // Set timeout for fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BookmarkBot/1.0; +https://example.com/bot)",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";

      // Only process HTML content
      if (!contentType.includes("text/html")) {
        logger.info("Non-HTML content type, using fallback", {
          url,
          contentType,
        });
        return fallbackContent;
      }

      const html = await response.text();
      const extractedContent = extractTextFromHtml(html);

      // If extraction yields meaningful content, use it
      if (extractedContent.length > 100) {
        logger.info("Successfully extracted content from URL", {
          url,
          contentLength: extractedContent.length,
        });
        return extractedContent;
      }

      logger.info("Extracted content too short, using fallback", {
        url,
        extractedLength: extractedContent.length,
      });
      return fallbackContent;
    } catch (error) {
      const err = error as Error;

      if (err.name === "AbortError") {
        logger.error("Content retrieval timeout", undefined, { url });
      } else {
        logger.error("Failed to retrieve generic content", err, { url });
      }

      return fallbackContent;
    }
  });
}

/**
 * Extracts text content from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    ""
  );
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Remove common boilerplate patterns
  text = removeBoilerplate(text);

  return text;
}

/**
 * Decodes common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
    "&mdash;": "—",
    "&ndash;": "–",
    "&hellip;": "…",
  };

  return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => {
    return entities[match.toLowerCase()] || match;
  });
}

/**
 * Removes common boilerplate text patterns
 */
function removeBoilerplate(text: string): string {
  // Remove cookie notices, privacy policies, etc.
  const boilerplatePatterns = [
    /we use cookies/gi,
    /accept cookies/gi,
    /privacy policy/gi,
    /terms of service/gi,
    /subscribe to our newsletter/gi,
    /sign up for/gi,
  ];

  let cleaned = text;
  for (const pattern of boilerplatePatterns) {
    // Remove sentences containing boilerplate
    cleaned = cleaned.replace(
      new RegExp(`[^.!?]*${pattern.source}[^.!?]*[.!?]`, "gi"),
      ""
    );
  }

  return cleaned.trim();
}

/**
 * Validates if a string is a valid URL
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
