/**
 * Shared error handling utilities for workflows
 */

import { ErrorType, type TErrorType } from "./types";

/**
 * Determines if an error is retryable based on its type
 */
export function isRetryableError(error: Error | TErrorType): boolean {
  const retryableTypes: TErrorType[] = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT,
    ErrorType.SERVICE_UNAVAILABLE,
    ErrorType.RATE_LIMIT,
  ];

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout")) return true;
    if (message.includes("network")) return true;
    if (message.includes("unavailable")) return true;
    if (message.includes("503")) return true;
    if (message.includes("429")) return true;
    return false;
  }

  return retryableTypes.includes(error as TErrorType);
}

/**
 * Classifies an error into an ErrorType
 */
export function classifyError(error: Error): TErrorType {
  const message = error.message.toLowerCase();

  if (message.includes("timeout")) return ErrorType.TIMEOUT;
  if (message.includes("network")) return ErrorType.NETWORK_ERROR;
  if (message.includes("unavailable") || message.includes("503"))
    return ErrorType.SERVICE_UNAVAILABLE;
  if (message.includes("rate limit") || message.includes("429"))
    return ErrorType.RATE_LIMIT;
  if (message.includes("not found") || message.includes("404"))
    return ErrorType.NOT_FOUND;
  if (message.includes("auth")) return ErrorType.AUTHENTICATION_FAILED;
  if (message.includes("invalid") || message.includes("malformed"))
    return ErrorType.INVALID_CONTENT;
  if (message.includes("quota")) return ErrorType.QUOTA_EXCEEDED;

  return ErrorType.UNKNOWN;
}
