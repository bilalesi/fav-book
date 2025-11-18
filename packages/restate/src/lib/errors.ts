/**
 * Error handling utilities for Restate workflows
 *
 * Provides error classification and context preservation for proper
 * retry behavior in Restate workflows.
 */

import { TerminalError } from "@restatedev/restate-sdk";
import { ErrorType } from "../types";

/**
 * Classifies an error into an ErrorType based on its characteristics
 *
 * @param error - The error to classify
 * @returns The classified ErrorType
 *
 * @example
 * ```typescript
 * const error = new Error("Connection timeout");
 * const type = classifyError(error); // ErrorType.TIMEOUT
 * ```
 */
export function classifyError(error: Error): ErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors
  if (
    message.includes("network") ||
    message.includes("econnrefused") ||
    message.includes("enotfound") ||
    message.includes("connection") ||
    name.includes("networkerror")
  ) {
    return ErrorType.NETWORK_ERROR;
  }

  // Timeout errors
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    name.includes("timeouterror")
  ) {
    return ErrorType.TIMEOUT;
  }

  // Service unavailable
  if (
    message.includes("unavailable") ||
    message.includes("503") ||
    message.includes("service down")
  ) {
    return ErrorType.SERVICE_UNAVAILABLE;
  }

  // Rate limit errors
  if (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("too many requests")
  ) {
    return ErrorType.RATE_LIMIT;
  }

  // Authentication errors
  if (
    message.includes("auth") ||
    message.includes("unauthorized") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("forbidden")
  ) {
    return ErrorType.AUTHENTICATION_FAILED;
  }

  // Not found errors
  if (
    message.includes("not found") ||
    message.includes("404") ||
    message.includes("does not exist")
  ) {
    return ErrorType.NOT_FOUND;
  }

  // Invalid content/input errors
  if (
    message.includes("invalid") ||
    message.includes("malformed") ||
    message.includes("bad request") ||
    message.includes("400") ||
    message.includes("validation")
  ) {
    return ErrorType.INVALID_CONTENT;
  }

  // Quota exceeded
  if (
    message.includes("quota") ||
    message.includes("limit exceeded") ||
    message.includes("insufficient")
  ) {
    return ErrorType.QUOTA_EXCEEDED;
  }

  // Default to unknown
  return ErrorType.UNKNOWN;
}

/**
 * Determines if an error should be retried based on its type
 *
 * Retryable errors: NETWORK_ERROR, TIMEOUT, SERVICE_UNAVAILABLE, RATE_LIMIT
 * Terminal errors: All others
 *
 * @param error - The error to check, or an ErrorType
 * @returns true if the error should be retried
 *
 * @example
 * ```typescript
 * const error = new Error("Connection timeout");
 * if (isRetryableError(error)) {
 *   throw error; // Let Restate retry
 * } else {
 *   throw new TerminalError(error.message); // Stop retrying
 * }
 * ```
 */
export function isRetryableError(error: Error | ErrorType): boolean {
  const retryableTypes: ErrorType[] = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT,
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorType.RATE_LIMIT,
  ];

  if (error instanceof Error) {
    const errorType = classifyError(error);
    return retryableTypes.includes(errorType);
  }

  return retryableTypes.includes(error as ErrorType);
}

/**
 * Wraps an error appropriately for Restate based on whether it's retryable
 *
 * - Retryable errors: Throws standard Error (Restate will retry)
 * - Terminal errors: Throws TerminalError (Restate will not retry)
 *
 * @param error - The error to wrap
 * @param context - Additional context to include with the error
 * @throws Error for retryable errors
 * @throws TerminalError for terminal errors
 *
 * @example
 * ```typescript
 * try {
 *   await externalApiCall();
 * } catch (error) {
 *   throwAppropriateError(error, { step: "content-retrieval", bookmarkId: "123" });
 * }
 * ```
 */
export function throwAppropriateError(
  error: Error,
  context?: Record<string, any>
): never {
  const errorType = classifyError(error);
  const contextStr = context ? ` Context: ${JSON.stringify(context)}` : "";
  const message = `${error.message}${contextStr}`;

  if (isRetryableError(errorType)) {
    // Retryable error - throw standard Error
    const retryableError = new Error(message);
    retryableError.name = error.name;
    retryableError.stack = error.stack;
    throw retryableError;
  } else {
    // Terminal error - throw TerminalError to prevent retry
    const terminalError = new TerminalError(message, {
      errorCode: errorType,
      ...context,
    });
    // Store original error name in the cause field
    (terminalError as any).originalError = error.name;
    throw terminalError;
  }
}

/**
 * Creates a TerminalError with preserved context
 *
 * Use this for business logic failures that should not be retried
 *
 * @param message - Error message
 * @param context - Additional context to include
 * @returns TerminalError instance
 *
 * @example
 * ```typescript
 * if (!isValidInput(data)) {
 *   throw createTerminalError("Invalid input data", { data, reason: "missing required field" });
 * }
 * ```
 */
export function createTerminalError(
  message: string,
  context?: Record<string, any>
): TerminalError {
  return new TerminalError(message, context);
}

/**
 * Preserves error context when re-throwing
 *
 * @param error - Original error
 * @param additionalContext - Additional context to add
 * @returns New error with preserved and additional context
 *
 * @example
 * ```typescript
 * try {
 *   await processBookmark(id);
 * } catch (error) {
 *   throw preserveErrorContext(error, { bookmarkId: id, step: "processing" });
 * }
 * ```
 */
export function preserveErrorContext(
  error: Error,
  additionalContext: Record<string, any>
): Error {
  const newError = new Error(error.message);
  newError.name = error.name;
  newError.stack = error.stack;

  // Attach context as a property
  (newError as any).context = {
    ...(error as any).context,
    ...additionalContext,
  };

  return newError;
}

/**
 * Extracts context from an error if available
 *
 * @param error - Error to extract context from
 * @returns Context object or empty object if none exists
 */
export function getErrorContext(error: Error): Record<string, any> {
  return (error as any).context || {};
}
