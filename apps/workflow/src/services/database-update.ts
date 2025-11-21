/**
 * Database update service for Restate workflows
 *
 * Persists enriched bookmark data to the database
 */

import * as restate from "@restatedev/restate-sdk";
import { ResultAsync } from "neverthrow";
import { raise_appropriate_error } from "../lib/errors";
import {
	DictDownloadStatus,
	type IMediaMetadata,
	type IUploadResult,
	type TProcessingStatus,
	type WorkflowError,
} from "../types";

export interface IBookmarkEnrichmentUpdateInput {
	bookmarkId: string;
	workflowId: string;
	userId: string;
	summary?: string;
	keywords?: string[];
	tags?: Array<{ id: string; name: string }>;
	status: TProcessingStatus;
	errors?: WorkflowError[];
}

export interface IMediaRecordInput {
	bookmarkId: string;
	workflowId: string;
	userId: string;
	metadata: IMediaMetadata;
	uploadResult: IUploadResult;
	originalUrl: string;
}

export interface IEnrichmentMediaUpdateInput {
	bookmarkId: string;
	workflowId: string;
	userId: string;
	status: TProcessingStatus;
	errors?: WorkflowError[];
}

export const database_update_service = restate.service({
	name: "database_update_service",
	handlers: {
		update_enrichment: async (
			ctx: restate.Context,
			input: IBookmarkEnrichmentUpdateInput,
		): Promise<void> => {
			return (
				await ResultAsync.fromPromise(
					(async () => {
						return await ctx.run("update-enrichment", async () => {
							const prisma = (await import("@favy/db")).default;
							const errorMessage = input.errors
								?.map((e) => `[${e.step}] ${e.message}`)
								.join("; ");

							await prisma.$transaction(async (tx) => {
								await tx.bookmarkEnrichment.upsert({
									where: { bookmarkPostId: input.bookmarkId },
									create: {
										bookmarkPostId: input.bookmarkId,
										summary: input.summary,
										keywords: input.keywords,
										tags: input.tags?.map((o) => o.name),
										processingStatus: input.status,
										workflowId: input.workflowId,
										enrichedAt: new Date(),
										errorMessage: errorMessage || null,
									},
									update: {
										summary: input.summary,
										keywords: input.keywords,
										tags: input.tags?.map((o) => o.name),
										processingStatus: input.status,
										workflowId: input.workflowId,
										enrichedAt: new Date(),
										errorMessage: errorMessage || null,
									},
								});

								if (input.tags?.length) {
									await tx.bookmarkPostCategory.createMany({
										data: input.tags?.map((o) => ({
											bookmarkPostId: input.bookmarkId,
											categoryId: o.id,
											assignedAt: new Date(),
										})),
										skipDuplicates: true,
									});
								}
							});
							if (input.errors && input.errors.length > 0) {
								await store_log_workflow_errors(
									input.bookmarkId,
									input.workflowId,
									input.errors,
								);
							}
						});
					})(),
					(error) => {
						return raise_appropriate_error(error as Error, {
							step: "database-update",
							bookmarkId: input.bookmarkId,
						});
					},
				)
			)._unsafeUnwrap();
		},

		create_media_record: async (
			ctx: restate.Context,
			input: IMediaRecordInput,
		): Promise<string> => {
			return (
				await ResultAsync.fromPromise(
					(async () => {
						const mediaId = await ctx.run("create-media-record", async () => {
							const prisma = (await import("@favy/db")).default;
							const mediaType =
								input.metadata.type === "video" ? "VIDEO" : "IMAGE";
							const mediaRecord = await prisma.downloadedMedia.create({
								data: {
									bookmarkPostId: input.bookmarkId,
									type: mediaType,
									originalUrl: input.originalUrl,
									storagePath: input.uploadResult.key,
									storageUrl: input.uploadResult.url,
									fileSize: BigInt(input.metadata.fileSize),
									duration: input.metadata.duration || null,
									quality: input.metadata.quality || null,
									format: input.metadata.format || null,
									width: input.metadata.width || null,
									height: input.metadata.height || null,
									downloadStatus: DictDownloadStatus.COMPLETED,
									downloadedAt: new Date(),
									metadata: input.metadata.thumbnailUrl
										? JSON.parse(
												JSON.stringify({
													thumbnailUrl: input.metadata.thumbnailUrl,
												}),
											)
										: null,
								},
							});
							return mediaRecord.id;
						});
						return mediaId;
					})(),
					(error) => {
						throw raise_appropriate_error(error as Error, {
							step: "create-media-record",
							bookmarkId: input.bookmarkId,
						});
					},
				)
			)._unsafeUnwrap();
		},

		update_enrichment_after_media: async (
			ctx: restate.Context,
			input: IEnrichmentMediaUpdateInput,
		): Promise<void> => {
			return (
				await ResultAsync.fromPromise(
					(async () => {
						return await ctx.run("update-enrichment-after-media", async () => {
							const prisma = (await import("@favy/db")).default;

							// Update only the processing status
							await prisma.bookmarkEnrichment.update({
								where: { bookmarkPostId: input.bookmarkId },
								data: {
									processingStatus: input.status,
								},
							});

							// Log any media-related errors
							if (input.errors && input.errors.length > 0) {
								await store_log_workflow_errors(
									input.bookmarkId,
									input.workflowId,
									input.errors,
								);
							}
						});
					})(),
					(error) => {
						return raise_appropriate_error(error as Error, {
							step: "update-enrichment-after-media",
							bookmarkId: input.bookmarkId,
						});
					},
				)
			)._unsafeUnwrap();
		},

		mark_media_failed: async (
			ctx: restate.Context,
			input: {
				bookmarkId: string;
				workflowId: string;
				userId: string;
				originalUrl: string;
				errorMessage: string;
			},
		): Promise<void> => {
			return (
				await ResultAsync.fromPromise(
					(async () => {
						await ctx.run("mark-media-failed", async () => {
							const prisma = (await import("@favy/db")).default;

							// Create failed media record
							await prisma.downloadedMedia.create({
								data: {
									bookmarkPostId: input.bookmarkId,
									type: "VIDEO", // Default type
									originalUrl: input.originalUrl,
									storagePath: "",
									storageUrl: null,
									fileSize: BigInt(0),
									downloadStatus: "FAILED",
									errorMessage: input.errorMessage,
								},
							});
						});
					})(),
					(error) => {
						throw raise_appropriate_error(error as Error, {
							step: "mark-media-failed",
							bookmarkId: input.bookmarkId,
						});
					},
				)
			)._unsafeUnwrap();
		},
	},
});

async function store_log_workflow_errors(
	bookmarkId: string,
	workflowId: string,
	errors: WorkflowError[],
): Promise<void> {
	try {
		const prisma = (await import("@favy/db")).default;

		await prisma.workflowErrorLog.createMany({
			data: errors.map((error) => ({
				bookmarkPostId: bookmarkId,
				workflowId,
				step: error.step,
				errorType: error.errorType as any,
				errorMessage: error.message,
				stackTrace: error.stackTrace,
				retryable: error.retryable,
				retryCount: 0,
				resolved: false,
				context: error.context || {},
				occurredAt: error.timestamp,
			})),
			skipDuplicates: true,
		});
	} catch (error) {
		console.error("Failed to log workflow errors:", error);
		// Don't throw - error logging failure should not fail the workflow
	}
}
