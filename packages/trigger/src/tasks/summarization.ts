import { logger } from "@trigger.dev/sdk";
import type { SummaryResult } from "../types";

/**
 * Summarization step - Generate AI summary, keywords, and tags
 * @param content - Content to summarize
 * @param bookmarkId - Bookmark ID for logging
 * @returns Summary result with summary, keywords, tags, and token usage
 * @throws Error if summarization fails
 */
export async function summarizeContent(
  content: string,
  bookmarkId: string
): Promise<SummaryResult> {
  logger.info("Starting content summarization", {
    bookmarkId,
    contentLength: content.length,
    contentPreview: content.substring(0, 200),
  });

  try {
    if (!content || content.trim().length === 0) {
      throw new Error("Content cannot be empty");
    }
    const { createSummarizationService } = await import("@favy/ai");
    const summarizationService = await createSummarizationService();

    logger.info("Calling AI service for summarization", {
      bookmarkId,
      contentLength: content.length,
    });

    const result = await summarizationService.generateSummary(content, {
      maxLength: parseInt(process.env.MAX_SUMMARY_LENGTH || "500"),
    });

    logger.info("Summarization completed successfully", {
      bookmarkId,
      summaryLength: result.summary.length,
      keywordsCount: result.keywords.length,
      tagsCount: result.tags.length,
      tokensUsed: result.tokensUsed,
    });

    return result;
  } catch (error) {
    const err = error as Error;
    logger.error("Summarization failed", {
      bookmarkId,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

/**
 * Update bookmark with summarization results
 * @param bookmarkId - Bookmark ID to update
 * @param summaryResult - Summary result to persist
 * @throws Error if database update fails
 */
export async function updateBookmarkSummary(
  bookmarkId: string,
  summaryResult: SummaryResult
): Promise<void> {
  logger.info("Updating bookmark with summary", {
    bookmarkId,
  });

  try {
    const prisma = (await import("@favy/db")).default;
    await prisma.bookmarkEnrichment.upsert({
      where: { bookmarkPostId: bookmarkId },
      create: {
        bookmarkPostId: bookmarkId,
        summary: summaryResult.summary,
        keywords: summaryResult.keywords,
        tags: summaryResult.tags,
        processingStatus: "COMPLETED",
        enrichedAt: new Date(),
      },
      update: {
        summary: summaryResult.summary,
        keywords: summaryResult.keywords,
        tags: summaryResult.tags,
        processingStatus: "COMPLETED",
        enrichedAt: new Date(),
      },
    });

    logger.info("Bookmark summary updated successfully", {
      bookmarkId,
    });
  } catch (error) {
    const err = error as Error;
    logger.error("Failed to update bookmark summary", {
      bookmarkId,
      error: err.message,
      stack: err.stack,
    });
    throw err;
  }
}
