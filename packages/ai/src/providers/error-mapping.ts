import { AIServiceError, AIErrorCode, type AIProvider } from "../types";

/**
 * Determine if an error is retryable based on its characteristics.
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("enotfound") ||
      message.includes("connection")
    ) {
      return true;
    }

    // Service unavailable
    if (message.includes("503") || message.includes("unavailable")) {
      return true;
    }

    // Rate limiting
    if (message.includes("429") || message.includes("rate limit")) {
      return true;
    }

    // Temporary failures
    if (message.includes("temporary") || message.includes("try again")) {
      return true;
    }
  }

  return false;
}

/**
 * Map a generic error to an appropriate AIErrorCode.
 * @param error - The error to map
 * @returns The appropriate AIErrorCode
 */
export function mapErrorToCode(error: unknown): AIErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes("econnrefused")) {
      return AIErrorCode.CONNECTION_REFUSED;
    }
    if (message.includes("timeout")) {
      return AIErrorCode.TIMEOUT_ERROR;
    }
    if (message.includes("network") || message.includes("enotfound")) {
      return AIErrorCode.NETWORK_ERROR;
    }

    // Service errors
    if (message.includes("503") || message.includes("unavailable")) {
      return AIErrorCode.SERVICE_UNAVAILABLE;
    }
    if (message.includes("429") || message.includes("rate limit")) {
      return AIErrorCode.RATE_LIMIT_EXCEEDED;
    }

    // Configuration errors
    if (message.includes("model") && message.includes("not found")) {
      return AIErrorCode.MODEL_NOT_FOUND;
    }
    if (message.includes("invalid") && message.includes("configuration")) {
      return AIErrorCode.INVALID_CONFIGURATION;
    }

    // Input errors
    if (message.includes("empty") || message.includes("invalid input")) {
      return AIErrorCode.INVALID_INPUT;
    }
    if (message.includes("too long") || message.includes("content length")) {
      return AIErrorCode.CONTENT_TOO_LONG;
    }

    // Response errors
    if (message.includes("schema") || message.includes("validation")) {
      return AIErrorCode.SCHEMA_VALIDATION_FAILED;
    }
    if (message.includes("invalid response") || message.includes("parse")) {
      return AIErrorCode.INVALID_RESPONSE;
    }
  }

  // Default to network error for unknown errors
  return AIErrorCode.NETWORK_ERROR;
}

/**
 * Create an AIServiceError from a generic error with provider context.
 * @param error - The original error
 * @param context - Context message describing what operation failed
 * @param provider - The AI provider that generated the error
 * @returns A properly formatted AIServiceError
 */
export function createAIServiceError(
  error: unknown,
  context: string,
  provider?: AIProvider
): AIServiceError {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  const retryable = isRetryableError(error);
  const code = mapErrorToCode(error);

  return new AIServiceError(
    `${context}: ${message}`,
    code,
    retryable,
    provider
  );
}

/**
 * Base error mapper for provider-specific errors.
 * Providers can extend this with their own specific error mappings.
 */
export abstract class BaseErrorMapper {
  constructor(protected readonly provider: AIProvider) {}

  /**
   * Map a provider-specific error to an AIServiceError.
   * @param error - The error to map
   * @param context - Context message
   * @returns AIServiceError with appropriate code and retry flag
   */
  abstract mapError(error: unknown, context: string): AIServiceError;

  /**
   * Common error mapping logic that can be used by all providers.
   * @param error - The error to map
   * @param context - Context message
   * @returns AIServiceError
   */
  protected mapCommonError(error: unknown, context: string): AIServiceError {
    return createAIServiceError(error, context, this.provider);
  }
}
