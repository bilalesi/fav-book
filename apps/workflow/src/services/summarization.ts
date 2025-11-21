/**
 * Summarization service for Restate workflows
 *
 * Generates AI summaries, keywords, and tags for bookmark content
 */

import * as restate from "@restatedev/restate-sdk";
import { ResultAsync } from "neverthrow";
import { raise_appropriate_error } from "../lib/errors";
import type { ISummaryResult } from "../types";

export interface ISummarizationInput {
	content: string;
	bookmarkId: string;
	workflowId: string;
	userId: string;
	maxLength?: number;
}

export const summarization_service = restate.service({
	name: "summarization_service",
	handlers: {
		summarize: async (
			ctx: restate.Context,
			input: ISummarizationInput,
		): Promise<ISummaryResult> => {
			return (
				await ResultAsync.fromPromise(
					(async () => {
						return await ctx.run("call-ai-service", async () => {
							const { make_summarization_service } = await import("@favy/ai");
							const summarizationService = await make_summarization_service();
							return await summarizationService.make_summary(input.content, {
								maxLength:
									input.maxLength ||
									Number.parseInt(process.env.MAX_SUMMARY_LENGTH || "500", 10),
							});
						});
					})(),
					(error) => {
						raise_appropriate_error(error as Error, {
							step: "summarization",
							bookmarkId: input.bookmarkId,
						});
					},
				)
			)._unsafeUnwrap();
		},
	},
});
