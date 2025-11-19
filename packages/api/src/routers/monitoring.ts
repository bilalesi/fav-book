import { z } from "zod";
import { protectedProcedure } from "../index";
import prisma from "@favy/db";
import { DictProcessingStatus } from "@favy/shared";

/**
 * Monitoring API router
 * Provides endpoints for metrics, dashboard data, and alerting
 */
export const monitoringRouter = {
  // Get dashboard statistics
  dashboard: protectedProcedure.handler(async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get workflow statistics
    const [todayStats, weekStats, monthStats, activeCount, queueDepth] =
      await Promise.all([
        getWorkflowStats(oneDayAgo, now),
        getWorkflowStats(oneWeekAgo, now),
        getWorkflowStats(oneMonthAgo, now),
        getActiveWorkflowCount(),
        getQueueDepth(),
      ]);

    return {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      active: activeCount,
      queue: queueDepth,
    };
  }),

  performance: protectedProcedure
    .input(z.object({ hours: z.number().optional().default(24) }))
    .handler(async ({ input }) => {
      const hours = input.hours;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Get average processing times by platform
      const byPlatform = await prisma.bookmarkPost.groupBy({
        by: ["platform"],
        where: {
          savedAt: {
            gte: since,
          },
        },
        _count: true,
      });

      // Get processing status distribution
      const statusDistribution = await prisma.bookmarkEnrichment.groupBy({
        by: ["processingStatus"],
        where: {
          createdAt: {
            gte: since,
          },
        },
        _count: true,
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

  errors: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .handler(async ({ input }) => {
      const limit = input.limit;
      const offset = input.offset;

      const [errors, total] = await Promise.all([
        prisma.bookmarkEnrichment.findMany({
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
        prisma.bookmarkEnrichment.count({
          where: {
            processingStatus: "FAILED",
          },
        }),
      ]);

      // Transform to match expected format
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

  queue: protectedProcedure.handler(async () => {
    const [pending, processing, backlog] = await Promise.all([
      prisma.bookmarkEnrichment.count({
        where: {
          processingStatus: "PENDING",
        },
      }),
      prisma.bookmarkEnrichment.count({
        where: {
          processingStatus: "PROCESSING",
        },
      }),
      getBacklogStats(),
    ]);

    return {
      pending,
      processing,
      total: pending + processing,
      backlog,
    };
  }),

  storage: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .handler(async ({ input: { userId } }) => {
      const result = await prisma.downloadedMedia.aggregate({
        where: { bookmarkPost: { userId } },
        _sum: {
          fileSize: true,
        },
        _count: true,
      });

      const totalBytes = Number(result._sum.fileSize || 0);
      const maxBytes = getMaxStorageBytes();
      const usagePercent = (totalBytes / maxBytes) * 100;

      const byType = await prisma.downloadedMedia.groupBy({
        by: ["type"],
        _sum: {
          fileSize: true,
        },
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

  timeline: protectedProcedure
    .input(
      z.object({
        hours: z.number().optional().default(24),
        interval: z.number().optional().default(60),
      })
    )
    .handler(async ({ input }) => {
      const hours = input.hours;
      const interval = input.interval;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Get workflow counts over time
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

  health: protectedProcedure.handler(async () => {
    const checks = await Promise.allSettled([
      checkRestateHealth(),
      checkLMStudioHealth(),
      checkCobaltHealth(),
      checkStorageHealth(),
      checkDatabaseHealth(),
    ]);

    const health = {
      restate: getCheckResult(checks[0]),
      lmStudio: getCheckResult(checks[1]),
      cobalt: getCheckResult(checks[2]),
      storage: getCheckResult(checks[3]),
      database: getCheckResult(checks[4]),
    };

    const allHealthy = Object.values(health).every((h) => h.healthy);

    return {
      healthy: allHealthy,
      services: health,
      timestamp: new Date(),
    };
  }),

  restateStats: protectedProcedure.handler(async () => {
    try {
      const restateAdminUrl =
        process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070";

      // Get deployments
      const deploymentsRes = await fetch(`${restateAdminUrl}/deployments`, {
        signal: AbortSignal.timeout(5000),
      });
      const deploymentsData: any = deploymentsRes.ok
        ? await deploymentsRes.json()
        : { deployments: [] };

      // Get services
      const servicesRes = await fetch(`${restateAdminUrl}/services`, {
        signal: AbortSignal.timeout(5000),
      });
      const servicesData: any = servicesRes.ok
        ? await servicesRes.json()
        : { services: [] };

      return {
        deployments: deploymentsData.deployments || [],
        services: servicesData.services || [],
        deploymentsCount: deploymentsData.deployments?.length || 0,
        servicesCount: servicesData.services?.length || 0,
      };
    } catch (error) {
      return {
        deployments: [],
        services: [],
        deploymentsCount: 0,
        servicesCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),
};

/**
 * Helper functions
 */

async function getWorkflowStats(from: Date, to: Date) {
  const [total, completed, failed, partialSuccess, pending, processing] =
    await Promise.all([
      prisma.bookmarkEnrichment.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      prisma.bookmarkEnrichment.count({
        where: {
          createdAt: { gte: from, lte: to },
          processingStatus: "COMPLETED",
        },
      }),
      prisma.bookmarkEnrichment.count({
        where: {
          createdAt: { gte: from, lte: to },
          processingStatus: "FAILED",
        },
      }),
      prisma.bookmarkEnrichment.count({
        where: {
          createdAt: { gte: from, lte: to },
          processingStatus: "PARTIAL_SUCCESS",
        },
      }),
      prisma.bookmarkEnrichment.count({
        where: {
          createdAt: { gte: from, lte: to },
          processingStatus: "PENDING",
        },
      }),
      prisma.bookmarkEnrichment.count({
        where: {
          createdAt: { gte: from, lte: to },
          processingStatus: "PROCESSING",
        },
      }),
    ]);

  const successRate = total > 0 ? (completed / total) * 100 : 0;
  const failureRate = total > 0 ? (failed / total) * 100 : 0;

  return {
    total,
    completed,
    failed,
    partialSuccess,
    pending,
    processing,
    successRate,
    failureRate,
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
  // Get oldest pending enrichment
  const oldest = await prisma.bookmarkEnrichment.findFirst({
    where: {
      processingStatus: DictProcessingStatus.PENDING,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      createdAt: true,
    },
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
    where: {
      createdAt: {
        gte: since,
      },
    },
    select: {
      createdAt: true,
      processingStatus: true,
    },
    orderBy: {
      createdAt: "asc",
    },
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

    switch (enrichment.processingStatus) {
      case DictProcessingStatus.COMPLETED:
      case DictProcessingStatus.PARTIAL_SUCCESS:
        interval.completed++;
        break;
      case DictProcessingStatus.FAILED:
        interval.failed++;
        break;
      case DictProcessingStatus.PROCESSING:
        interval.processing++;
        break;
      case DictProcessingStatus.PENDING:
        interval.pending++;
        break;
    }
  }

  return Array.from(intervals.values());
}

function getMaxStorageBytes(): number {
  const maxGB = parseInt(process.env.MAX_STORAGE_GB || "100");
  return maxGB * 1024 * 1024 * 1024;
}

async function checkRestateHealth(): Promise<boolean> {
  try {
    const restateAdminUrl =
      process.env.RESTATE_ADMIN_ENDPOINT || "http://localhost:9070";

    const response = await fetch(`${restateAdminUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkLMStudioHealth(): Promise<boolean> {
  try {
    const lmStudioUrl = process.env.LM_STUDIO_API_URL;
    if (!lmStudioUrl) return false;

    const response = await fetch(`${lmStudioUrl}/v1/models`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function checkCobaltHealth(): Promise<boolean> {
  try {
    const cobaltUrl = process.env.COBALT_API_URL;
    if (!cobaltUrl) return false;

    // Cobalt redirects /api/serverInfo to homepage, so just check if base URL responds
    const response = await fetch(cobaltUrl, {
      signal: AbortSignal.timeout(5000),
      redirect: "manual", // Don't follow redirects
    });
    // Accept any response (including redirects) as a sign the service is up
    return response.status < 500;
  } catch {
    return false;
  }
}

async function checkStorageHealth(): Promise<boolean> {
  try {
    // Check if we can query storage
    await prisma.downloadedMedia.count({ take: 1 });
    return true;
  } catch {
    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

function getCheckResult(result: PromiseSettledResult<boolean>): {
  healthy: boolean;
  error?: string;
} {
  if (result.status === "fulfilled") {
    return { healthy: result.value };
  }
  return {
    healthy: false,
    error: result.reason?.message || "Unknown error",
  };
}
