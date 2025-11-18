/**
 * Structured logging utilities for Restate workflows
 *
 * Provides consistent logging with correlation IDs and workflow context
 */

import { randomUUID } from "node:crypto";

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Base log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  workflowId?: string;
  bookmarkId?: string;
  userId?: string;
  step?: string;
  duration?: number;
  error?: {
    type: string;
    message: string;
    stack?: string;
  };
  [key: string]: any;
}

/**
 * Workflow context for logging
 */
export interface WorkflowContext {
  workflowId: string;
  bookmarkId: string;
  userId: string;
  correlationId?: string;
}

/**
 * Logger class with correlation ID support
 */
export class Logger {
  private correlationId: string;
  private context: Partial<WorkflowContext>;

  constructor(context?: Partial<WorkflowContext>) {
    this.correlationId = context?.correlationId || randomUUID();
    this.context = context || {};
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: Partial<WorkflowContext>): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
      correlationId: this.correlationId,
    });
  }

  /**
   * Logs a debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.log("debug", message, meta);
  }

  /**
   * Logs an info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.log("info", message, meta);
  }

  /**
   * Logs a warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.log("warn", message, meta);
  }

  /**
   * Logs an error message
   */
  error(message: string, error?: Error, meta?: Record<string, any>): void {
    const errorMeta = error
      ? {
          error: {
            type: error.name,
            message: error.message,
            stack: error.stack,
          },
        }
      : {};

    this.log("error", message, { ...meta, ...errorMeta });
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, any>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      ...this.context,
      ...meta,
    };

    // Output as JSON for structured logging
    console.log(JSON.stringify(entry));
  }

  /**
   * Gets the correlation ID for this logger
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Gets the current context
   */
  getContext(): Partial<WorkflowContext> {
    return { ...this.context };
  }
}

/**
 * Creates a logger for workflow execution
 *
 * @param context - Workflow context
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * const logger = createWorkflowLogger({
 *   workflowId: "wf-123",
 *   bookmarkId: "bm-456",
 *   userId: "user-789"
 * });
 * logger.info("Workflow started");
 * ```
 */
export function createWorkflowLogger(context: WorkflowContext): Logger {
  return new Logger(context);
}

/**
 * Performance timer for measuring step duration
 */
export class PerformanceTimer {
  private startTime: number;
  private stepName: string;
  private logger: Logger;

  constructor(stepName: string, logger: Logger) {
    this.stepName = stepName;
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * Ends the timer and logs the duration
   *
   * @param success - Whether the step succeeded
   * @param meta - Additional metadata to log
   */
  end(success: boolean, meta?: Record<string, any>): void {
    const duration = Date.now() - this.startTime;
    const message = success
      ? `Step ${this.stepName} completed`
      : `Step ${this.stepName} failed`;

    if (success) {
      this.logger.info(message, { step: this.stepName, duration, ...meta });
    } else {
      this.logger.error(message, undefined, {
        step: this.stepName,
        duration,
        ...meta,
      });
    }
  }

  /**
   * Gets the elapsed time in milliseconds
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Creates a performance timer for a workflow step
 *
 * @param stepName - Name of the step being timed
 * @param logger - Logger instance
 * @returns PerformanceTimer instance
 *
 * @example
 * ```typescript
 * const timer = startTimer("content-retrieval", logger);
 * try {
 *   await fetchContent();
 *   timer.end(true);
 * } catch (error) {
 *   timer.end(false, { error: error.message });
 *   throw error;
 * }
 * ```
 */
export function startTimer(stepName: string, logger: Logger): PerformanceTimer {
  return new PerformanceTimer(stepName, logger);
}

/**
 * Logs workflow start
 *
 * @param logger - Logger instance
 * @param input - Workflow input parameters
 */
export function logWorkflowStart(
  logger: Logger,
  input: Record<string, any>
): void {
  logger.info("Workflow started", {
    input: {
      bookmarkId: input.bookmarkId,
      userId: input.userId,
      platform: input.platform,
      url: input.url,
      enableMediaDownload: input.enableMediaDownload,
    },
  });
}

/**
 * Logs workflow completion
 *
 * @param logger - Logger instance
 * @param success - Whether workflow succeeded
 * @param duration - Total execution time in milliseconds
 * @param result - Result summary
 */
export function logWorkflowCompletion(
  logger: Logger,
  success: boolean,
  duration: number,
  result?: Record<string, any>
): void {
  const status = success ? "completed" : "failed";
  logger.info(`Workflow ${status}`, {
    status,
    duration,
    result: result
      ? {
          success: result.success,
          hasErrors: result.errors && result.errors.length > 0,
          errorCount: result.errors?.length || 0,
          tokensUsed: result.tokensUsed,
        }
      : undefined,
  });
}

/**
 * Logs step start
 *
 * @param logger - Logger instance
 * @param stepName - Name of the step
 */
export function logStepStart(logger: Logger, stepName: string): void {
  logger.info(`Step ${stepName} started`, { step: stepName });
}

/**
 * Logs step completion
 *
 * @param logger - Logger instance
 * @param stepName - Name of the step
 * @param duration - Step execution time in milliseconds
 * @param result - Result summary
 */
export function logStepCompletion(
  logger: Logger,
  stepName: string,
  duration: number,
  result?: Record<string, any>
): void {
  logger.info(`Step ${stepName} completed`, {
    step: stepName,
    duration,
    result,
  });
}

/**
 * Logs step failure
 *
 * @param logger - Logger instance
 * @param stepName - Name of the step
 * @param error - Error that occurred
 * @param duration - Step execution time in milliseconds
 */
export function logStepFailure(
  logger: Logger,
  stepName: string,
  error: Error,
  duration: number
): void {
  logger.error(`Step ${stepName} failed`, error, {
    step: stepName,
    duration,
  });
}
