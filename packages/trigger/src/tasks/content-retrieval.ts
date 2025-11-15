import type { Platform } from "@my-better-t-app/shared";

/**
 * Content retrieval task
 * Fetches full content from URLs for different platforms
 * Handles Twitter, LinkedIn, and generic URLs
 */

/**
 * Retrieves full content from a URL based on the platform
 * @param url - The URL to fetch content from
 * @param platform - The platform type (TWITTER, LINKEDIN, GENERIC_URL)
 * @param fallbackContent - Content to use if retrieval fails
 * @returns The retrieved content or fallback content
 */
export async function retrieveContent(
  url: string,
  platform: Platform,
  fallbackContent: string
): Promise<string> {
  try {
    // Validate URL
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    // Route to appropriate handler based on platform
    switch (platform) {
      case "TWITTER":
        return await retrieveTwitterContent(url, fallbackContent);
      case "LINKEDIN":
        return await retrieveLinkedInContent(url, fallbackContent);
      case "GENERIC_URL":
        return await retrieveGenericContent(url, fallbackContent);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  } catch (error) {
    const err = error as Error;
    console.error("Content retrieval failed:", {
      url,
      platform,
      error: err.message,
    });

    // Return fallback content on error
    return fallbackContent;
  }
}

/**
 * Retrieves content from Twitter URLs
 * For now, returns the fallback content as Twitter API requires authentication
 * In production, this would use Twitter API or scraping service
 */
async function retrieveTwitterContent(
  url: string,
  fallbackContent: string
): Promise<string> {
  // Twitter content retrieval would require:
  // 1. Twitter API credentials
  // 2. Tweet ID extraction from URL
  // 3. API call to fetch tweet details
  // 4. Extraction of full text, including thread if applicable

  // For now, we use the fallback content which was already captured
  // during bookmark creation
  console.log("Twitter content retrieval: using fallback content", { url });
  return fallbackContent;
}

/**
 * Retrieves content from LinkedIn URLs
 * For now, returns the fallback content as LinkedIn requires authentication
 * In production, this would use LinkedIn API or scraping service
 */
async function retrieveLinkedInContent(
  url: string,
  fallbackContent: string
): Promise<string> {
  // LinkedIn content retrieval would require:
  // 1. LinkedIn API credentials
  // 2. Post ID extraction from URL
  // 3. API call to fetch post details
  // 4. Extraction of full text and comments if needed

  // For now, we use the fallback content which was already captured
  // during bookmark creation
  console.log("LinkedIn content retrieval: using fallback content", { url });
  return fallbackContent;
}

/**
 * Retrieves content from generic URLs
 * Fetches the page and extracts text content
 */
async function retrieveGenericContent(
  url: string,
  fallbackContent: string
): Promise<string> {
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
      console.log("Non-HTML content type, using fallback", {
        url,
        contentType,
      });
      return fallbackContent;
    }

    const html = await response.text();
    const extractedContent = extractTextFromHtml(html);

    // If extraction yields meaningful content, use it
    // Otherwise fall back to original content
    if (extractedContent.length > 100) {
      console.log("Successfully extracted content from URL", {
        url,
        contentLength: extractedContent.length,
      });
      return extractedContent;
    }

    console.log("Extracted content too short, using fallback", {
      url,
      extractedLength: extractedContent.length,
    });
    return fallbackContent;
  } catch (error) {
    const err = error as Error;

    if (err.name === "AbortError") {
      console.error("Content retrieval timeout", { url });
    } else {
      console.error("Failed to retrieve generic content", {
        url,
        error: err.message,
      });
    }

    return fallbackContent;
  }
}

/**
 * Extracts text content from HTML
 * Removes scripts, styles, and extracts meaningful text
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

/**
 * Checks if content is reachable (for validation purposes)
 */
export async function isContentReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BookmarkBot/1.0; +https://example.com/bot)",
      },
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
