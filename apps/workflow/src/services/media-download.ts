/**
 * Media download service for Restate workflows
 *
 * Downloads media files from URLs using Cobalt API
 */

import * as restate from "@restatedev/restate-sdk";
import { raise_appropriate_error } from "../lib/errors";
import { create_workflow_logger } from "../lib/logger";
import type { IDownloadResult } from "../types";

export interface IMediaDownloadInput {
	url: string;
	bookmarkId: string;
	workflowId: string;
	userId: string;
	maxSizeMB?: number;
	quality?: string;
}

export const media_download_service = restate.service({
	name: "media_download_service",
	handlers: {
		download: async (
			ctx: restate.Context,
			input: IMediaDownloadInput,
		): Promise<IDownloadResult> => {
			const logger = create_workflow_logger({
				workflowId: input.workflowId,
				bookmarkId: input.bookmarkId,
				userId: input.userId,
			});

			const maxSizeMB = input.maxSizeMB || 500;

			logger.info("Starting media download", {
				url: input.url,
				maxSizeMB,
			});

			try {
				// Download media using ctx.run() for durability
				const result = await ctx.run("download-media", async () => {
					const { downloadMedia } = await import("@favy/media-downloader");

					// Calculate max size in bytes
					const maxSizeBytes = maxSizeMB * 1024 * 1024;

					// Download media
					return await downloadMedia(input.url, {
						maxSize: maxSizeBytes,
						quality: input.quality || "1080", // Default to 1080p
					});
				});

				if (!result.success) {
					throw new Error(result.error || "Media download failed");
				}

				logger.info("Media download completed successfully", {
					filePath: result.filePath,
					fileSize: result.metadata.fileSize,
					format: result.metadata.format,
					quality: result.metadata.quality,
					duration: result.metadata.duration,
				});

				return result;
			} catch (error) {
				logger.error("Media download failed", error as Error, {
					url: input.url,
				});

				// Re-throw with appropriate error handling
				raise_appropriate_error(error as Error, {
					step: "media-download",
					bookmarkId: input.bookmarkId,
					url: input.url,
				});
			}
		},
	},
});
