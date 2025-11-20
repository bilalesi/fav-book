import { BaseErrorMapper } from "./error-mapping";
import { AIServiceError, AIErrorCode } from "../types";

/**
 * LMStudio-specific error mapper.
 * Maps LMStudio errors to standard AIServiceError codes.
 */
export class LMStudioErrorMapper extends BaseErrorMapper {
  constructor() {
    super("lmstudio");
  }

  /**
   * Map LMStudio-specific errors to AIServiceError.
   * @param error - The error to map
   * @param context - Context message
   * @returns AIServiceError with appropriate code and retry flag
   */
  mapError(error: unknown, context: string): AIServiceError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Network errors (retryable)
      if (message.includes("econnrefused")) {
        return new AIServiceError(
          `${context}: LMStudio server is not running or not reachable`,
          AIErrorCode.CONNECTION_REFUSED,
          true,
          this.provider
        );
      }

      if (message.includes("timeout") || message.includes("timed out")) {
        return new AIServiceError(
          `${context}: Request to LMStudio timed out`,
          AIErrorCode.TIMEOUT_ERROR,
          true,
          this.provider
        );
      }

      if (
        message.includes("network") ||
        message.includes("enotfound") ||
        message.includes("fetch failed")
      ) {
        return new AIServiceError(
          `${context}: Network error connecting to LMStudio`,
          AIErrorCode.NETWORK_ERROR,
          true,
          this.provider
        );
      }

      // Service errors (retryable)
      if (message.includes("503") || message.includes("service unavailable")) {
        return new AIServiceError(
          `${context}: LMStudio service is temporarily unavailable`,
          AIErrorCode.SERVICE_UNAVAILABLE,
          true,
          this.provider
        );
      }

      if (message.includes("429") || message.includes("rate limit")) {
        return new AIServiceError(
          `${context}: LMStudio rate limit exceeded`,
          AIErrorCode.RATE_LIMIT_EXCEEDED,
          true,
          this.provider
        );
      }

      // Configuration errors (non-retryable)
      if (message.includes("model") && message.includes("not found")) {
        return new AIServiceError(
          `${context}: Model not found in LMStudio`,
          AIErrorCode.MODEL_NOT_FOUND,
          false,
          this.provider
        );
      }

      if (
        message.includes("invalid") &&
        (message.includes("configuration") || message.includes("config"))
      ) {
        return new AIServiceError(
          `${context}: Invalid LMStudio configuration`,
          AIErrorCode.INVALID_CONFIGURATION,
          false,
          this.provider
        );
      }

      // Input errors (non-retryable)
      if (
        message.includes("empty") ||
        message.includes("invalid input") ||
        message.includes("content cannot be empty")
      ) {
        return new AIServiceError(
          `${context}: Invalid input provided`,
          AIErrorCode.INVALID_INPUT,
          false,
          this.provider
        );
      }

      if (
        message.includes("too long") ||
        message.includes("content length") ||
        message.includes("exceeds maximum")
      ) {
        return new AIServiceError(
          `${context}: Content exceeds maximum length`,
          AIErrorCode.CONTENT_TOO_LONG,
          false,
          this.provider
        );
      }

      // Response errors
      if (
        message.includes("schema") ||
        message.includes("validation failed") ||
        message.includes("does not match")
      ) {
        return new AIServiceError(
          `${context}: Response schema validation failed`,
          AIErrorCode.SCHEMA_VALIDATION_FAILED,
          false,
          this.provider
        );
      }

      if (
        message.includes("invalid response") ||
        message.includes("parse") ||
        message.includes("json")
      ) {
        return new AIServiceError(
          `${context}: Invalid response from LMStudio`,
          AIErrorCode.INVALID_RESPONSE,
          false,
          this.provider
        );
      }
    }

    // Fall back to common error mapping
    return this.mapCommonError(error, context);
  }
}

/**
 * Convenience function to map LMStudio errors.
 * @param error - The error to map
 * @param context - Context message
 * @returns AIServiceError
 */
export function mapLMStudioError(
  error: unknown,
  context: string
): AIServiceError {
  const mapper = new LMStudioErrorMapper();
  return mapper.mapError(error, context);
}
