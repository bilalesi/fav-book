import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../index";
import prisma from "@favy/db";
import { getMetrics, getMetricsJSON } from "@favy/trigger/lib/metrics";
import { metricsTracker } from "@favy/trigger/lib/metrics-tracker";
import { testAlert, evaluateAllAlerts } from "@favy/trigger/lib/alerting";

/**
 * Monitoring API router
 * Provides endpoints for metrics, dashboard data, and alerting
 */
export const monitoringRouter = {
  // Get Prometheus metrics
  metrics: publicProcedure.handler(async () => {
    return await getMetrics();
  }),

  // Get metrics as JSON
  metricsJson: publicProcedure.handler(async () => {
    return await getMetricsJSON();
  }),

  // Get dashboard statistics
  dashboard: publicProcedure.handler(async () => {
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

    // Get current window stats from metrics tracker
    const currentWindow = metricsTracker.getStats();

    return {
      today: todayStats,
      week: weekStats,
      month: monthStats,
      active: activeCount,
      queue: queueDepth,
      currentWindow,
    };
  }),

  // Get performance metrics
  performance: publicProcedure
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

  // Get error list
  errors: publicProcedure
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

  // Get queue depth and backlog
  queue: publicProcedure.handler(async () => {
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

  // Get storage usage
  storage: publicProcedure.handler(async () => {
    const result = await prisma.downloadedMedia.aggregate({
      _sum: {
        fileSize: true,
      },
      _count: true,
    });

    const totalBytes = Number(result._sum.fileSize || 0);
    const maxBytes = getMaxStorageBytes();
    const usagePercent = (totalBytes / maxBytes) * 100;

    // Get breakdown by media type
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
      byType,
    };
  }),

  // Get workflow timeline (for charts)
  timeline: publicProcedure
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

  // Test alert delivery
  testAlert: publicProcedure.handler(async () => {
    await testAlert();
    return { success: true, message: "Test alert sent" };
  }),

  // Manually trigger alert evaluation
  evaluateAlerts: publicProcedure.handler(async () => {
    await evaluateAllAlerts();
    return { success: true, message: "Alert evaluation completed" };
  }),

  // Get system health
  health: publicProcedure.handler(async () => {
    const checks = await Promise.allSettled([
      checkTriggerDevHealth(),
      checkLMStudioHealth(),
      checkCobaltHealth(),
      checkStorageHealth(),
      checkDatabaseHealth(),
    ]);

    const health = {
      triggerDev: getCheckResult(checks[0]),
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
      processingStatus: "PROCESSING",
    },
  });
}

async function getQueueDepth() {
  return await prisma.bookmarkEnrichment.count({
    where: {
      processingStatus: {
        in: ["PENDING", "PROCESSING"],
      },
    },
  });
}

async function getBacklogStats() {
  // Get oldest pending enrichment
  const oldest = await prisma.bookmarkEnrichment.findFirst({
    where: {
      processingStatus: "PENDING",
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
      case "COMPLETED":
      case "PARTIAL_SUCCESS":
        interval.completed++;
        break;
      case "FAILED":
        interval.failed++;
        break;
      case "PROCESSING":
        interval.processing++;
        break;
      case "PENDING":
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

async function checkTriggerDevHealth(): Promise<boolean> {
  try {
    const apiUrl = process.env.TRIGGER_API_URL;
    if (!apiUrl) return false;

    // Try to reach the base URL instead of the health endpoint which requires auth
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
    });
    // Accept any response (including redirects) as a sign the service is up
    return response.status < 500;
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
