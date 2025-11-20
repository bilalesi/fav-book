/**
 * Summarization service for Restate workflows
 *
 * Generates AI summaries, keywords, and tags for bookmark content
 */

import * as restate from "@restatedev/restate-sdk";
import type { SummaryResult } from "../types";
import { throwAppropriateError } from "../lib/errors";
import { createWorkflowLogger } from "../lib/logger";

export interface SummarizationInput {
  content: string;
  bookmarkId: string;
  workflowId: string;
  userId: string;
  maxLength?: number;
}

export const summarizationService = restate.service({
  name: "SummarizationService",
  handlers: {
    summarize: async (
      ctx: restate.Context,
      input: SummarizationInput
    ): Promise<SummaryResult> => {
      const logger = createWorkflowLogger({
        workflowId: input.workflowId,
        bookmarkId: input.bookmarkId,
        userId: input.userId,
      });

      logger.info("Starting content summarization", {
        contentLength: input.content.length,
        contentPreview: input.content.substring(0, 200),
      });

      try {
        // Validate content
        if (!input.content || input.content.trim().length === 0) {
          throw new Error("Content cannot be empty");
        }

        // Call AI service within ctx.run() for durability
        const result = await ctx.run("call-ai-service", async () => {
          const { createSummarizationService } = await import("@favy/ai");
          const summarizationService = await createSummarizationService();

          logger.info("Calling AI service for summarization", {
            contentLength: input.content.length,
          });

          return await summarizationService.generateSummary(input.content, {
            maxLength:
              input.maxLength ||
              parseInt(process.env.MAX_SUMMARY_LENGTH || "500"),
          });
        });

        logger.info("Summarization completed successfully", {
          summaryLength: result.summary.length,
          keywordsCount: result.keywords.length,
          tagsCount: result.tags.length,
          tokensUsed: result.tokensUsed,
        });

        return result;
      } catch (error) {
        logger.error("Summarization failed", error as Error);

        // Re-throw with appropriate error handling
        throwAppropriateError(error as Error, {
          step: "summarization",
          bookmarkId: input.bookmarkId,
        });
      }
    },
  },
});
