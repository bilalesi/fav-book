/**
 * Structured logging utilities for bookmark enrichment workflows
 * Provides consistent logging with correlation IDs, performance metrics, and error tracking
 */

import { logger as triggerLogger } from "@trigger.dev/sdk/v3";
import type { WorkflowStep, ErrorType } from "../types";
import { formatErrorForLogging } from "./errors";

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Base context for all logs
 */
export interface LogContext {
  /** Bookmark ID being processed */
  bookmarkId?: string;
  /** Workflow run ID from Trigger.dev */
  workflowId?: string;
  /** User ID who owns the bookmark */
  userId?: string;
  /** Current workflow step */
  step?: WorkflowStep;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Performance metrics for logging
 */
export interface PerformanceMetrics {
  /** Duration in milliseconds */
  durationMs: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime: number;
  /** Memory usage in bytes (if available) */
  memoryUsed?: number;
  /** Tokens used for LLM operations */
  tokensUsed?: number;
}

/**
 * Structured logger class with correlation ID support
 */
export class StructuredLogger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: LogContext): StructuredLogger {
    return new StructuredLogger({
      ...this.context,
      ...additionalContext,
    });
  }

  /**
   * Updates the logger context
   */
  updateContext(updates: Partial<LogContext>): void {
    this.context = {
      ...this.context,
      ...updates,
    };
  }

  /**
   * Logs a debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Logs an info message
   */
  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error, data?: Record<string, any>): void {
    const errorData = error ? formatErrorForLogging(error, data) : data;
    this.log(LogLevel.ERROR, message, errorData);
  }

  /**
   * Logs a workflow step start
   */
  stepStart(step: WorkflowStep, data?: Record<string, any>): number {
    const startTime = Date.now();
    this.info(`Starting step: ${step}`, {
      ...data,
      step,
      startTime,
      event: "step_start",
    });
    return startTime;
  }

  /**
   * Logs a workflow step completion
   */
  stepComplete(
    step: WorkflowStep,
    startTime: number,
    data?: Record<string, any>
  ): void {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    this.info(`Completed step: ${step}`, {
      ...data,
      step,
      startTime,
      endTime,
      durationMs,
      event: "step_complete",
    });
  }

  /**
   * Logs a workflow step failure
   */
  stepFailed(
    step: WorkflowStep,
    startTime: number,
    error: Error,
    data?: Record<string, any>
  ): void {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    this.error(`Failed step: ${step}`, error, {
      ...data,
      step,
      startTime,
      endTime,
      durationMs,
      event: "step_failed",
    });
  }

  /**
   * Logs performance metrics
   */
  logMetrics(
    operation: string,
    metrics: PerformanceMetrics,
    data?: Record<string, any>
  ): void {
    this.info(`Performance metrics: ${operation}`, {
      ...data,
      operation,
      ...metrics,
      event: "performance_metrics",
    });
  }

  /**
   * Logs a retry attempt
   */
  logRetry(
    step: WorkflowStep,
    attemptNumber: number,
    error: Error,
    delayMs: number,
    data?: Record<string, any>
  ): void {
    this.warn(`Retrying step: ${step}`, {
      ...data,
      step,
      attemptNumber,
      delayMs,
      error: error.message,
      errorType: formatErrorForLogging(error).errorType,
      event: "retry_attempt",
    });
  }

  /**
   * Logs workflow start
   */
  workflowStart(data?: Record<string, any>): number {
    const startTime = Date.now();
    this.info("Workflow started", {
      ...data,
      startTime,
      event: "workflow_start",
    });
    return startTime;
  }

  /**
   * Logs workflow completion
   */
  workflowComplete(
    startTime: number,
    success: boolean,
    data?: Record<string, any>
  ): void {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    this.info("Workflow completed", {
      ...data,
      success,
      startTime,
      endTime,
      durationMs,
      event: "workflow_complete",
    });
  }

  /**
   * Logs workflow failure
   */
  workflowFailed(
    startTime: number,
    error: Error,
    data?: Record<string, any>
  ): void {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    this.error("Workflow failed", error, {
      ...data,
      startTime,
      endTime,
      durationMs,
      event: "workflow_failed",
    });
  }

  /**
   * Internal log method that formats and sends logs
   */
  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...data,
    };

    // Use Trigger.dev logger with appropriate level
    switch (level) {
      case LogLevel.DEBUG:
        triggerLogger.debug(message, logData);
        break;
      case LogLevel.INFO:
        triggerLogger.info(message, logData);
        break;
      case LogLevel.WARN:
        triggerLogger.warn(message, logData);
        break;
      case LogLevel.ERROR:
        triggerLogger.error(message, logData);
        break;
    }
  }
}

/**
 * Creates a logger instance with initial context
 */
export function createLogger(context: LogContext = {}): StructuredLogger {
  return new StructuredLogger(context);
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private startMemory?: number;

  constructor() {
    this.startTime = Date.now();

    // Capture memory usage if available
    if (typeof process !== "undefined" && process.memoryUsage) {
      this.startMemory = process.memoryUsage().heapUsed;
    }
  }

  /**
   * Gets the elapsed time and memory metrics
   */
  getMetrics(): PerformanceMetrics {
    const endTime = Date.now();
    const durationMs = endTime - this.startTime;

    const metrics: PerformanceMetrics = {
      durationMs,
      startTime: this.startTime,
      endTime,
    };

    // Calculate memory delta if available
    if (
      this.startMemory !== undefined &&
      typeof process !== "undefined" &&
      process.memoryUsage
    ) {
      const endMemory = process.memoryUsage().heapUsed;
      metrics.memoryUsed = endMemory - this.startMemory;
    }

    return metrics;
  }

  /**
   * Logs the metrics with a logger
   */
  logMetrics(
    logger: StructuredLogger,
    operation: string,
    additionalData?: Record<string, any>
  ): void {
    const metrics = this.getMetrics();
    logger.logMetrics(operation, metrics, additionalData);
  }
}

/**
 * Correlation ID generator for tracking related operations
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Formats duration in a human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}

/**
 * Formats memory size in a human-readable format
 */
export function formatMemorySize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Sanitizes sensitive data from logs
 */
export function sanitizeLogData(
  data: Record<string, any>
): Record<string, any> {
  const sensitiveKeys = [
    "password",
    "token",
    "apiKey",
    "secret",
    "authorization",
    "cookie",
    "session",
  ];

  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Creates a log context from workflow input
 */
export function createWorkflowLogContext(
  bookmarkId: string,
  userId: string,
  workflowId?: string
): LogContext {
  return {
    bookmarkId,
    userId,
    workflowId: workflowId || generateCorrelationId(),
  };
}

/**
 * Log aggregation helper for batch operations
 */
export class BatchLogger {
  private logs: Array<{
    level: LogLevel;
    message: string;
    data?: Record<string, any>;
  }> = [];
  private logger: StructuredLogger;

  constructor(logger: StructuredLogger) {
    this.logger = logger;
  }

  /**
   * Adds a log entry to the batch
   */
  add(level: LogLevel, message: string, data?: Record<string, any>): void {
    this.logs.push({ level, message, data });
  }

  /**
   * Flushes all batched logs
   */
  flush(): void {
    for (const log of this.logs) {
      switch (log.level) {
        case LogLevel.DEBUG:
          this.logger.debug(log.message, log.data);
          break;
        case LogLevel.INFO:
          this.logger.info(log.message, log.data);
          break;
        case LogLevel.WARN:
          this.logger.warn(log.message, log.data);
          break;
        case LogLevel.ERROR:
          this.logger.error(log.message, undefined, log.data);
          break;
      }
    }
    this.logs = [];
  }

  /**
   * Gets the number of batched logs
   */
  size(): number {
    return this.logs.length;
  }
}
