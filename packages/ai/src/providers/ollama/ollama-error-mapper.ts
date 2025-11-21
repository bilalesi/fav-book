import { BaseErrorMapper } from "../error-mapping";
import { AIServiceError, AIErrorCode } from "../../types";

/**
 * Ollama-specific error mapper.
 * Maps Ollama errors to standard AIServiceError codes.
 */
export class OllamaErrorMapper extends BaseErrorMapper {
  constructor() {
    super("ollama");
  }

  /**
   * Map Ollama-specific errors to AIServiceError.
   * @param error - The error to map
   * @param context - Context message
   * @returns AIServiceError with appropriate code and retry flag
   */
  map_error(error: unknown, context: string): AIServiceError {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      // Network errors (retryable)
      if (message.includes("econnrefused")) {
        return new AIServiceError(
          `${context}: Ollama server is not running or not reachable`,
          AIErrorCode.CONNECTION_REFUSED,
          true,
          this.provider
        );
      }

      if (message.includes("timeout") || message.includes("timed out")) {
        return new AIServiceError(
          `${context}: Request to Ollama timed out`,
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
          `${context}: Network error connecting to Ollama`,
          AIErrorCode.NETWORK_ERROR,
          true,
          this.provider
        );
      }

      // Service errors (retryable)
      if (message.includes("503") || message.includes("service unavailable")) {
        return new AIServiceError(
          `${context}: Ollama service is temporarily unavailable`,
          AIErrorCode.SERVICE_UNAVAILABLE,
          true,
          this.provider
        );
      }

      if (message.includes("429") || message.includes("rate limit")) {
        return new AIServiceError(
          `${context}: Ollama rate limit exceeded`,
          AIErrorCode.RATE_LIMIT_EXCEEDED,
          true,
          this.provider
        );
      }

      // Configuration errors (non-retryable)
      if (message.includes("model") && message.includes("not found")) {
        return new AIServiceError(
          `${context}: Model not found in Ollama`,
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
          `${context}: Invalid Ollama configuration`,
          AIErrorCode.INVALID_CONFIGURATION,
          false,
          this.provider
        );
      }

      // Ollama-specific: model not loaded
      if (message.includes("model") && message.includes("not loaded")) {
        return new AIServiceError(
          `${context}: Model not loaded in Ollama`,
          AIErrorCode.MODEL_NOT_FOUND,
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
        message.includes("failed to parse json") ||
        message.includes("json")
      ) {
        return new AIServiceError(
          `${context}: Invalid response from Ollama`,
          AIErrorCode.INVALID_RESPONSE,
          false,
          this.provider
        );
      }

      // Ollama-specific: API request failed
      if (message.includes("ollama api request failed")) {
        // Extract status code if present
        const statusMatch = message.match(/(\d{3})/);
        if (statusMatch && statusMatch[1]) {
          const status = parseInt(statusMatch[1], 10);

          if (status === 404) {
            return new AIServiceError(
              `${context}: Ollama endpoint not found`,
              AIErrorCode.MODEL_NOT_FOUND,
              false,
              this.provider
            );
          }

          if (status === 503) {
            return new AIServiceError(
              `${context}: Ollama service unavailable`,
              AIErrorCode.SERVICE_UNAVAILABLE,
              true,
              this.provider
            );
          }

          if (status === 429) {
            return new AIServiceError(
              `${context}: Ollama rate limit exceeded`,
              AIErrorCode.RATE_LIMIT_EXCEEDED,
              true,
              this.provider
            );
          }
        }

        return new AIServiceError(
          `${context}: Ollama API request failed`,
          AIErrorCode.NETWORK_ERROR,
          true,
          this.provider
        );
      }
    }

    // Fall back to common error mapping
    return this.map_common_error(error, context);
  }
}

/**
 * Convenience function to map Ollama errors.
 * @param error - The error to map
 * @param context - Context message
 * @returns AIServiceError
 */
export function map_ollama_error(
  error: unknown,
  context: string
): AIServiceError {
  const mapper = new OllamaErrorMapper();
  return mapper.map_error(error, context);
}
