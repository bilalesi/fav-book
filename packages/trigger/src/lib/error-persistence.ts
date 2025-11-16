/**
 * Error persistence service for storing workflow errors in the database
 * Provides functions to log, retrieve, and manage error records
 */

import prisma from "@favy/db";
import type { WorkflowError, WorkflowStep } from "../types";
import { ErrorType } from "../types";

/**
 * Persists a workflow error to the database
 * @param bookmarkId - The bookmark being processed
 * @param workflowId - The workflow run ID
 * @param error - The workflow error to persist
 * @returns The created error log record
 */
export async function logWorkflowError(
  bookmarkId: string,
  workflowId: string,
  error: WorkflowError
): Promise<any> {
  try {
    return await prisma.workflowErrorLog.create({
      data: {
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
      },
    });
  } catch (err) {
    // Log to console if database write fails
    console.error("Failed to persist workflow error:", err);
    console.error("Original error:", error);
    return null;
  }
}

/**
 * Persists multiple workflow errors in a batch
 * @param bookmarkId - The bookmark being processed
 * @param workflowId - The workflow run ID
 * @param errors - Array of workflow errors to persist
 */
export async function logWorkflowErrors(
  bookmarkId: string,
  workflowId: string,
  errors: WorkflowError[]
): Promise<void> {
  if (!errors || errors.length === 0) {
    return;
  }

  try {
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
  } catch (err) {
    console.error("Failed to persist workflow errors:", err);
  }
}

/**
 * Increments the retry count for an error
 * @param errorLogId - The error log ID
 */
export async function incrementErrorRetryCount(
  errorLogId: string
): Promise<void> {
  try {
    await prisma.workflowErrorLog.update({
      where: { id: errorLogId },
      data: {
        retryCount: {
          increment: 1,
        },
      },
    });
  } catch (err) {
    console.error("Failed to increment error retry count:", err);
  }
}

/**
 * Marks an error as resolved
 * @param errorLogId - The error log ID
 */
export async function markErrorResolved(errorLogId: string): Promise<void> {
  try {
    await prisma.workflowErrorLog.update({
      where: { id: errorLogId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to mark error as resolved:", err);
  }
}

/**
 * Marks all errors for a bookmark as resolved
 * @param bookmarkId - The bookmark ID
 */
export async function markBookmarkErrorsResolved(
  bookmarkId: string
): Promise<void> {
  try {
    await prisma.workflowErrorLog.updateMany({
      where: {
        bookmarkPostId: bookmarkId,
        resolved: false,
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("Failed to mark bookmark errors as resolved:", err);
  }
}

/**
 * Retrieves all errors for a bookmark
 * @param bookmarkId - The bookmark ID
 * @param includeResolved - Whether to include resolved errors
 * @returns Array of error log records
 */
export async function getBookmarkErrors(
  bookmarkId: string,
  includeResolved = false
): Promise<any[]> {
  try {
    return await prisma.workflowErrorLog.findMany({
      where: {
        bookmarkPostId: bookmarkId,
        ...(includeResolved ? {} : { resolved: false }),
      },
      orderBy: {
        occurredAt: "desc",
      },
    });
  } catch (err) {
    console.error("Failed to retrieve bookmark errors:", err);
    return [];
  }
}

/**
 * Retrieves errors for a specific workflow run
 * @param workflowId - The workflow run ID
 * @returns Array of error log records
 */
export async function getWorkflowErrors(workflowId: string): Promise<any[]> {
  try {
    return await prisma.workflowErrorLog.findMany({
      where: {
        workflowId,
      },
      orderBy: {
        occurredAt: "asc",
      },
    });
  } catch (err) {
    console.error("Failed to retrieve workflow errors:", err);
    return [];
  }
}

/**
 * Retrieves errors by type
 * @param errorType - The error type to filter by
 * @param limit - Maximum number of errors to return
 * @returns Array of error log records
 */
export async function getErrorsByType(
  errorType: ErrorType,
  limit = 100
): Promise<any[]> {
  try {
    return await prisma.workflowErrorLog.findMany({
      where: {
        errorType: errorType as any,
        resolved: false,
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: limit,
    });
  } catch (err) {
    console.error("Failed to retrieve errors by type:", err);
    return [];
  }
}

/**
 * Retrieves errors by workflow step
 * @param step - The workflow step to filter by
 * @param limit - Maximum number of errors to return
 * @returns Array of error log records
 */
export async function getErrorsByStep(
  step: WorkflowStep,
  limit = 100
): Promise<any[]> {
  try {
    return await prisma.workflowErrorLog.findMany({
      where: {
        step: step as any,
        resolved: false,
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: limit,
    });
  } catch (err) {
    console.error("Failed to retrieve errors by step:", err);
    return [];
  }
}

/**
 * Gets error statistics for monitoring
 * @param since - Start date for statistics
 * @returns Error statistics object
 */
export async function getErrorStatistics(since?: Date) {
  try {
    const whereClause = since ? { occurredAt: { gte: since } } : {};

    const [totalErrors, unresolvedErrors, errorsByType, errorsByStep] =
      await Promise.all([
        prisma.workflowErrorLog.count({ where: whereClause }),
        prisma.workflowErrorLog.count({
          where: { ...whereClause, resolved: false },
        }),
        prisma.workflowErrorLog.groupBy({
          by: ["errorType"],
          where: whereClause,
          _count: true,
        }),
        prisma.workflowErrorLog.groupBy({
          by: ["step"],
          where: whereClause,
          _count: true,
        }),
      ]);

    return {
      totalErrors,
      unresolvedErrors,
      resolvedErrors: totalErrors - unresolvedErrors,
      errorsByType: errorsByType.map((item) => ({
        type: item.errorType,
        count: item._count,
      })),
      errorsByStep: errorsByStep.map((item) => ({
        step: item.step,
        count: item._count,
      })),
    };
  } catch (err) {
    console.error("Failed to retrieve error statistics:", err);
    return {
      totalErrors: 0,
      unresolvedErrors: 0,
      resolvedErrors: 0,
      errorsByType: [],
      errorsByStep: [],
    };
  }
}

/**
 * Cleans up old resolved errors
 * @param olderThan - Delete errors older than this date
 * @returns Number of deleted records
 */
export async function cleanupOldErrors(olderThan: Date): Promise<number> {
  try {
    const result = await prisma.workflowErrorLog.deleteMany({
      where: {
        resolved: true,
        resolvedAt: {
          lt: olderThan,
        },
      },
    });

    return result.count;
  } catch (err) {
    console.error("Failed to cleanup old errors:", err);
    return 0;
  }
}

/**
 * Logs performance metrics for a workflow operation
 * @param bookmarkId - The bookmark being processed
 * @param workflowId - The workflow run ID
 * @param step - The workflow step
 * @param operation - The operation name
 * @param durationMs - Duration in milliseconds
 * @param success - Whether the operation succeeded
 * @param metadata - Additional metadata
 */
export async function logWorkflowMetrics(
  bookmarkId: string,
  workflowId: string,
  step: string,
  operation: string,
  durationMs: number,
  success: boolean,
  metadata?: {
    memoryUsedBytes?: number;
    tokensUsed?: number;
    errorType?: string;
    [key: string]: any;
  }
): Promise<void> {
  try {
    await prisma.workflowMetrics.create({
      data: {
        bookmarkPostId: bookmarkId,
        workflowId,
        step,
        operation,
        durationMs,
        memoryUsedBytes: metadata?.memoryUsedBytes,
        tokensUsed: metadata?.tokensUsed,
        success,
        errorType: metadata?.errorType,
        metadata: metadata || {},
      },
    });
  } catch (err) {
    console.error("Failed to log workflow metrics:", err);
  }
}

/**
 * Retrieves performance metrics for analysis
 * @param bookmarkId - Optional bookmark ID to filter by
 * @param since - Start date for metrics
 * @returns Array of metric records
 */
export async function getWorkflowMetrics(
  bookmarkId?: string,
  since?: Date
): Promise<any[]> {
  try {
    const whereClause: any = {};
    if (bookmarkId) {
      whereClause.bookmarkPostId = bookmarkId;
    }
    if (since) {
      whereClause.recordedAt = { gte: since };
    }

    return await prisma.workflowMetrics.findMany({
      where: whereClause,
      orderBy: {
        recordedAt: "desc",
      },
      take: 1000,
    });
  } catch (err) {
    console.error("Failed to retrieve workflow metrics:", err);
    return [];
  }
}

/**
 * Gets aggregated performance statistics
 * @param since - Start date for statistics
 * @returns Performance statistics object
 */
export async function getPerformanceStatistics(since?: Date) {
  try {
    const whereClause = since ? { recordedAt: { gte: since } } : {};

    const metrics = await prisma.workflowMetrics.findMany({
      where: whereClause,
    });

    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDurationMs: 0,
        totalTokensUsed: 0,
        byStep: {},
        byOperation: {},
      };
    }

    const successCount = metrics.filter((m) => m.success).length;
    const totalDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0);
    const totalTokens = metrics.reduce(
      (sum, m) => sum + (m.tokensUsed || 0),
      0
    );

    const byStep: Record<string, any> = {};
    const byOperation: Record<string, any> = {};

    for (const metric of metrics) {
      // Aggregate by step
      if (!byStep[metric.step]) {
        byStep[metric.step] = {
          count: 0,
          successCount: 0,
          totalDuration: 0,
          avgDuration: 0,
        };
      }
      byStep[metric.step].count++;
      if (metric.success) byStep[metric.step].successCount++;
      byStep[metric.step].totalDuration += metric.durationMs;

      // Aggregate by operation
      if (!byOperation[metric.operation]) {
        byOperation[metric.operation] = {
          count: 0,
          successCount: 0,
          totalDuration: 0,
          avgDuration: 0,
        };
      }
      byOperation[metric.operation].count++;
      if (metric.success) byOperation[metric.operation].successCount++;
      byOperation[metric.operation].totalDuration += metric.durationMs;
    }

    // Calculate averages
    for (const step in byStep) {
      byStep[step].avgDuration =
        byStep[step].totalDuration / byStep[step].count;
      byStep[step].successRate =
        (byStep[step].successCount / byStep[step].count) * 100;
    }

    for (const operation in byOperation) {
      byOperation[operation].avgDuration =
        byOperation[operation].totalDuration / byOperation[operation].count;
      byOperation[operation].successRate =
        (byOperation[operation].successCount / byOperation[operation].count) *
        100;
    }

    return {
      totalOperations: metrics.length,
      successRate: (successCount / metrics.length) * 100,
      averageDurationMs: totalDuration / metrics.length,
      totalTokensUsed: totalTokens,
      byStep,
      byOperation,
    };
  } catch (err) {
    console.error("Failed to retrieve performance statistics:", err);
    return {
      totalOperations: 0,
      successRate: 0,
      averageDurationMs: 0,
      totalTokensUsed: 0,
      byStep: {},
      byOperation: {},
    };
  }
}
