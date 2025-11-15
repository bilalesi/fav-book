/**
 * URL Metadata Extractor
 *
 * Extracts metadata from URLs including title, description, favicon, and Open Graph data.
 * Implements 3-second timeout and uses domain name as fallback when extraction fails.
 */

export interface UrlMetadata {
  title?: string;
  description?: string;
  favicon?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  domain: string;
}

/**
 * Extract domain name from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Extract metadata from HTML content
 */
function parseHtmlMetadata(html: string, url: string): Partial<UrlMetadata> {
  const metadata: Partial<UrlMetadata> = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    metadata.title = titleMatch[1].trim();
  }

  // Extract meta description
  const descMatch = html.match(
    /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i
  );
  if (descMatch?.[1]) {
    metadata.description = descMatch[1].trim();
  }

  // Extract Open Graph title
  const ogTitleMatch = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  if (ogTitleMatch?.[1]) {
    metadata.ogTitle = ogTitleMatch[1].trim();
  }

  // Extract Open Graph description
  const ogDescMatch = html.match(
    /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i
  );
  if (ogDescMatch?.[1]) {
    metadata.ogDescription = ogDescMatch[1].trim();
  }

  // Extract Open Graph image
  const ogImageMatch = html.match(
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
  );
  if (ogImageMatch?.[1]) {
    metadata.ogImage = ogImageMatch[1].trim();
  }

  // Extract favicon
  const faviconMatch = html.match(
    /<link\s+[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i
  );
  if (faviconMatch?.[1]) {
    const faviconUrl = faviconMatch[1].trim();
    // Convert relative URLs to absolute
    if (faviconUrl.startsWith("//")) {
      metadata.favicon = `https:${faviconUrl}`;
    } else if (faviconUrl.startsWith("/")) {
      const urlObj = new URL(url);
      metadata.favicon = `${urlObj.protocol}//${urlObj.host}${faviconUrl}`;
    } else if (!faviconUrl.startsWith("http")) {
      const urlObj = new URL(url);
      metadata.favicon = `${urlObj.protocol}//${urlObj.host}/${faviconUrl}`;
    } else {
      metadata.favicon = faviconUrl;
    }
  }

  // Fallback: try to get favicon from root
  if (!metadata.favicon) {
    try {
      const urlObj = new URL(url);
      metadata.favicon = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    } catch {
      // Ignore error
    }
  }

  return metadata;
}

/**
 * Fetch URL with timeout
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = 3000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BookmarkBot/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    return html;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract metadata from a URL
 *
 * @param url - The URL to extract metadata from
 * @returns UrlMetadata object with extracted information
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */
export async function extractMetadata(url: string): Promise<UrlMetadata> {
  const domain = extractDomain(url);

  // Default metadata with domain as fallback
  const defaultMetadata: UrlMetadata = {
    domain,
    title: domain,
  };

  try {
    // Fetch HTML with 3-second timeout (Requirement 4.1)
    const html = await fetchWithTimeout(url, 3000);

    // Parse metadata from HTML
    const extracted = parseHtmlMetadata(html, url);

    // Merge extracted metadata with defaults
    return {
      ...defaultMetadata,
      ...extracted,
      // Use domain as fallback title if extraction failed (Requirement 4.2)
      title: extracted.title || extracted.ogTitle || domain,
      description: extracted.description || extracted.ogDescription,
    };
  } catch (error) {
    // Handle metadata extraction failures gracefully (Requirement 4.2, 4.5)
    // Log error for debugging
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Categorize error types for better debugging
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.warn(
          `[Metadata Extraction] Timeout after 3 seconds for ${url}`
        );
      } else if (errorMessage.includes("fetch")) {
        console.warn(
          `[Metadata Extraction] Network error for ${url}: ${errorMessage}`
        );
      } else if (errorMessage.includes("HTTP")) {
        console.warn(
          `[Metadata Extraction] HTTP error for ${url}: ${errorMessage}`
        );
      } else {
        console.warn(
          `[Metadata Extraction] Failed to extract metadata from ${url}: ${errorMessage}`
        );
      }
    }

    // Return default metadata with domain as fallback (Requirement 4.5)
    return defaultMetadata;
  }
}
