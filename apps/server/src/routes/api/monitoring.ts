import { ProcessingStatus, prisma } from "@favy/db";
import { DictAiProvider, DictProcessingStatus } from "@favy/shared";
import ky from "ky";
import { ResultAsync } from "neverthrow";
import pprops from "p-props";
import { match, P } from "ts-pattern";
import { z } from "zod";

import { protected_middleware } from "@/middleware/protected";

/**
 * Monitoring API router
 * Provides endpoints for metrics, dashboard data, and alerting
 */
export const monitoring_router = {
	dashboard: protected_middleware.handler(async () => {
		const now = new Date();
		const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
		const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		const { todayStats, weekStats, monthStats, activeCount, queueDepth } =
			await pprops({
				todayStats: getWorkflowStats(oneDayAgo, now),
				weekStats: getWorkflowStats(oneWeekAgo, now),
				monthStats: getWorkflowStats(oneMonthAgo, now),
				activeCount: getActiveWorkflowCount(),
				queueDepth: getQueueDepth(),
			});

		return {
			today: todayStats,
			week: weekStats,
			month: monthStats,
			active: activeCount,
			queue: queueDepth,
		};
	}),

	performance: protected_middleware
		.input(z.object({ hours: z.number().optional().default(24) }))
		.handler(async ({ input }) => {
			const hours = input.hours;
			const since = new Date(Date.now() - hours * 60 * 60 * 1000);

			const { byPlatform, statusDistribution } = await pprops({
				byPlatform: prisma.bookmarkPost.groupBy({
					by: ["platform"],
					where: { savedAt: { gte: since } },
					_count: true,
				}),
				statusDistribution: prisma.bookmarkEnrichment.groupBy({
					by: ["processingStatus"],
					where: { createdAt: { gte: since } },
					_count: true,
				}),
			});

			return {
				byPlatform,
				statusDistribution,
				timeRange: {
					hours,
					since,
				},
			};
		}),

	errors: protected_middleware
		.input(
			z.object({
				limit: z.number().optional().default(50),
				offset: z.number().optional().default(0),
			}),
		)
		.handler(async ({ input }) => {
			const limit = input.limit;
			const offset = input.offset;

			const { errors, total } = await pprops({
				errors: prisma.bookmarkEnrichment.findMany({
					where: {
						processingStatus: "FAILED",
					},
					select: {
						id: true,
						errorMessage: true,
						createdAt: true,
						workflowId: true,
						bookmarkPost: {
							select: {
								id: true,
								postUrl: true,
								platform: true,
								savedAt: true,
							},
						},
					},
					orderBy: {
						createdAt: "desc",
					},
					take: limit,
					skip: offset,
				}),
				total: prisma.bookmarkEnrichment.count({
					where: {
						processingStatus: ProcessingStatus.FAILED,
					},
				}),
			});

			const transformedErrors = errors.map((e) => ({
				id: e.bookmarkPost.id,
				postUrl: e.bookmarkPost.postUrl,
				platform: e.bookmarkPost.platform,
				savedAt: e.bookmarkPost.savedAt,
				errorMessage: e.errorMessage,
				workflowId: e.workflowId,
			}));

			return {
				errors: transformedErrors,
				total,
				limit,
				offset,
			};
		}),

	queue: protected_middleware.handler(async () => {
		const { pending, processing, backlog } = await pprops({
			pending: prisma.bookmarkEnrichment.count({
				where: { processingStatus: ProcessingStatus.PENDING },
			}),
			processing: prisma.bookmarkEnrichment.count({
				where: { processingStatus: ProcessingStatus.PROCESSING },
			}),
			backlog: getBacklogStats(),
		});

		return {
			pending,
			processing,
			total: pending + processing,
			backlog,
		};
	}),

	storage: protected_middleware.handler(async ({ context }) => {
		const userId = context.session.user.id;

		const result = await prisma.downloadedMedia.aggregate({
			where: { bookmarkPost: { userId } },
			_sum: { fileSize: true },
			_count: true,
		});

		const totalBytes = Number(result._sum.fileSize || 0);
		const maxBytes = getMaxStorageBytes();
		const usagePercent = (totalBytes / maxBytes) * 100;

		const byType = await prisma.downloadedMedia.groupBy({
			by: ["type"],
			where: { bookmarkPost: { userId } },
			_sum: { fileSize: true },
			_count: true,
		});

		return {
			totalBytes,
			maxBytes,
			usagePercent,
			fileCount: result._count,
			byType: byType.map((t) => ({
				type: t.type,
				_count: t._count,
				_sum: { fileSize: t._sum.fileSize },
			})),
		};
	}),

	timeline: protected_middleware
		.input(
			z.object({
				hours: z.number().optional().default(24),
				interval: z.number().optional().default(60),
			}),
		)
		.handler(async ({ input }) => {
			const hours = input.hours;
			const interval = input.interval;
			const since = new Date(Date.now() - hours * 60 * 60 * 1000);
			const timeline = await getWorkflowTimeline(since, interval);

			return {
				timeline,
				timeRange: {
					hours,
					interval,
					since,
				},
			};
		}),

	probe_health: protected_middleware.handler(async () => {
		const aiProvider = (
			process.env.AI_PROVIDER || DictAiProvider.OLLAMA
		).toLowerCase();
		const props = await pprops({
			restate: probe_restate_health(),
			ai:
				aiProvider === DictAiProvider.OLLAMA
					? probe_ollama_health()
					: probe_lmstudio_health(),
			cobalt: probe_cobalt_health(),
			storage: probe_storage_health(),
			database: probe_database_health(),
		});

		const health = {
			...props,
			[aiProvider]: props.ai,
		};

		const allHealthy = Object.values(health).every(() => true);

		return {
			healthy: allHealthy,
			services: health,
			timestamp: new Date(),
		};
	}),

	restate_stats: protected_middleware.handler(async () => {
		return (
			await ResultAsync.fromPromise(
				(async () => {
					const restateAdminUrl =
						process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070";

					const { deploymentsRes, servicesRes } = await pprops({
						deploymentsRes: ky
							.get(`${restateAdminUrl}/deployments`, {
								signal: AbortSignal.timeout(5000),
							})
							.json(),
						servicesRes: ky
							.get(`${restateAdminUrl}/services`, {
								signal: AbortSignal.timeout(5000),
							})
							.json(),
					});

					const deployments: any = deploymentsRes ?? { deployments: [] };
					const services: any = servicesRes ?? { services: [] };

					return {
						deployments: deployments.deployments || [],
						services: services.services || [],
						deploymentsCount: deployments.deployments?.length || 0,
						servicesCount: services.services?.length || 0,
					};
				})(),
				(error) => ({
					deployments: [],
					services: [],
					deploymentsCount: 0,
					servicesCount: 0,
					error: error instanceof Error ? error.message : "Unknown error",
				}),
			)
		)._unsafeUnwrap();
	}),

	service_config: protected_middleware.handler(async () => {
		const aiProvider = (process.env.AI_PROVIDER || "ollama").toLowerCase();
		const aiProviderUrl =
			aiProvider === "ollama"
				? process.env.OLLAMA_API_URL || "http://localhost:11434/api"
				: process.env.LM_STUDIO_API_URL || "http://localhost:1234/v1";
		const aiModel =
			aiProvider === "ollama"
				? process.env.OLLAMA_MODEL || "llama3.2:3b"
				: process.env.LM_STUDIO_MODEL || "llama-3.2-3b-instruct";

		const workflowOrchestrator = "restate";
		const workflowUrl =
			workflowOrchestrator === "restate"
				? process.env.RESTATE_RUNTIME_ENDPOINT || "http://localhost:8080"
				: process.env.TRIGGER_API_URL || "http://localhost:8030";

		const aiCheckUrl =
			aiProvider === "ollama"
				? `${aiProviderUrl}/tags`
				: `${aiProviderUrl}/models`;
		const workflowCheckUrl =
			process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070";

		const { aiHealthy, workflowHealthy } = (
			await ResultAsync.fromPromise(
				pprops({
					aiHealthy: (
						await ky.get(`${aiCheckUrl}`, { signal: AbortSignal.timeout(5000) })
					).ok,
					workflowHealthy: (
						await ky.get(`${workflowCheckUrl}`, {
							signal: AbortSignal.timeout(5000),
						})
					).ok,
				}),
				() => ({
					aiHealthy: false,
					workflowHealthy: false,
				}),
			)
		)._unsafeUnwrap();

		return {
			ai: {
				provider: aiProvider,
				url: aiProviderUrl,
				model: aiModel,
				healthy: aiHealthy,
			},
			workflow: {
				orchestrator: workflowOrchestrator,
				url: workflowUrl,
				healthy: workflowHealthy,
			},
		};
	}),
};

async function getWorkflowStats(from: Date, to: Date) {
	const { total, completed, failed, ...props } = await pprops({
		total: prisma.bookmarkEnrichment.count({
			where: { createdAt: { gte: from, lte: to } },
		}),
		completed: prisma.bookmarkEnrichment.count({
			where: {
				createdAt: { gte: from, lte: to },
				processingStatus: ProcessingStatus.COMPLETED,
			},
		}),
		failed: prisma.bookmarkEnrichment.count({
			where: {
				createdAt: { gte: from, lte: to },
				processingStatus: ProcessingStatus.FAILED,
			},
		}),
		partialSuccess: prisma.bookmarkEnrichment.count({
			where: {
				createdAt: { gte: from, lte: to },
				processingStatus: ProcessingStatus.PARTIAL_SUCCESS,
			},
		}),
		pending: prisma.bookmarkEnrichment.count({
			where: {
				createdAt: { gte: from, lte: to },
				processingStatus: ProcessingStatus.PENDING,
			},
		}),
		processing: prisma.bookmarkEnrichment.count({
			where: {
				createdAt: { gte: from, lte: to },
				processingStatus: ProcessingStatus.PROCESSING,
			},
		}),
	});

	const successRate = total > 0 ? (completed / total) * 100 : 0;
	const failureRate = total > 0 ? (failed / total) * 100 : 0;

	return {
		total,
		completed,
		failed,
		successRate,
		failureRate,
		...props,
	};
}

async function getActiveWorkflowCount() {
	return await prisma.bookmarkEnrichment.count({
		where: {
			processingStatus: DictProcessingStatus.PROCESSING,
		},
	});
}

async function getQueueDepth() {
	return await prisma.bookmarkEnrichment.count({
		where: {
			processingStatus: {
				in: [DictProcessingStatus.PENDING, DictProcessingStatus.PROCESSING],
			},
		},
	});
}

async function getBacklogStats() {
	const oldest = await prisma.bookmarkEnrichment.findFirst({
		where: { processingStatus: DictProcessingStatus.PENDING },
		orderBy: { createdAt: "asc" },
		select: { createdAt: true },
	});

	if (!oldest) {
		return {
			oldestAge: 0,
			hasBacklog: false,
		};
	}

	const ageMs = Date.now() - oldest.createdAt.getTime();
	const ageMinutes = Math.floor(ageMs / 1000 / 60);

	return {
		oldestAge: ageMinutes,
		hasBacklog: ageMinutes > 5, // Backlog if oldest is > 5 minutes
	};
}

async function getWorkflowTimeline(since: Date, intervalMinutes: number) {
	// This would ideally use a time-series query
	// For now, we'll get hourly counts
	const enrichments = await prisma.bookmarkEnrichment.findMany({
		where: { createdAt: { gte: since } },
		select: { createdAt: true, processingStatus: true },
		orderBy: { createdAt: "asc" },
	});

	// Group by time intervals
	const intervals = new Map<number, any>();
	const intervalMs = intervalMinutes * 60 * 1000;

	for (const enrichment of enrichments) {
		const intervalKey = Math.floor(enrichment.createdAt.getTime() / intervalMs);

		if (!intervals.has(intervalKey)) {
			intervals.set(intervalKey, {
				timestamp: new Date(intervalKey * intervalMs),
				total: 0,
				completed: 0,
				failed: 0,
				processing: 0,
				pending: 0,
			});
		}

		const interval = intervals.get(intervalKey);
		interval.total++;

		match(enrichment.processingStatus)
			.with(
				P.union(
					DictProcessingStatus.COMPLETED,
					DictProcessingStatus.PARTIAL_SUCCESS,
				),
				() => interval.completed++,
			)
			.with(DictProcessingStatus.FAILED, () => interval.failed++)
			.with(DictProcessingStatus.PROCESSING, () => interval.processing++)
			.with(DictProcessingStatus.PENDING, () => interval.pending++)
			.otherwise(() => null);
	}

	return Array.from(intervals.values());
}

function getMaxStorageBytes(): number {
	const maxGB = Number.parseInt(process.env.MAX_STORAGE_GB || "100", 10);
	return maxGB * 1024 * 1024 * 1024;
}

async function probe_restate_health(): Promise<boolean> {
	const url = process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070";
	return (
		await ResultAsync.fromPromise(
			ky.get(url, { signal: AbortSignal.timeout(5000) }),
			() => false,
		)
	).isOk();
}

async function probe_lmstudio_health(): Promise<boolean> {
	const url = process.env.LM_STUDIO_API_URL || "";
	return (
		await ResultAsync.fromPromise(
			ky.get(url, { signal: AbortSignal.timeout(5000) }),
			() => false,
		)
	).isOk();
}

async function probe_ollama_health(): Promise<boolean> {
	const url =
		`${process.env.OLLAMA_API_URL}/version` || "http://localhost:11434/api";
	return (
		await ResultAsync.fromPromise(
			ky.get(url, { signal: AbortSignal.timeout(5000) }),
			() => false,
		)
	).isOk();
}

async function probe_cobalt_health(): Promise<boolean> {
	const url = process.env.COBALT_API_URL || "";
	return (
		await ResultAsync.fromPromise(
			ky.get(url, { signal: AbortSignal.timeout(5000) }),
			() => false,
		)
	).isOk();
}

// TODO: fix this shit function
async function probe_storage_health(): Promise<boolean> {
	try {
		await prisma.downloadedMedia.count({ take: 1 });
		return true;
	} catch {
		return false;
	}
}

async function probe_database_health(): Promise<boolean> {
	return (
		await ResultAsync.fromPromise(prisma.$queryRaw`SELECT 1`, () => false)
	).isOk();
}
