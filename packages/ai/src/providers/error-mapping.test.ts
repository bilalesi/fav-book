import { describe, it, expect } from "vitest";
import {
  isRetryableError,
  mapErrorToCode,
  createAIServiceError,
  BaseErrorMapper,
} from "./error-mapping";
import { AIServiceError, AIErrorCode, type AIProvider } from "../types";

describe("Error Mapping Utilities", () => {
  describe("isRetryableError", () => {
    it("should return true for network errors", () => {
      expect(isRetryableError(new Error("Network error occurred"))).toBe(true);
      expect(isRetryableError(new Error("ECONNREFUSED"))).toBe(true);
      expect(isRetryableError(new Error("ENOTFOUND"))).toBe(true);
    });

    it("should return true for timeout errors", () => {
      expect(isRetryableError(new Error("Request timeout"))).toBe(true);
      expect(isRetryableError(new Error("Connection timeout"))).toBe(true);
    });

    it("should return true for service unavailable", () => {
      expect(isRetryableError(new Error("503 Service Unavailable"))).toBe(true);
      expect(isRetryableError(new Error("Service unavailable"))).toBe(true);
    });

    it("should return true for rate limiting", () => {
      expect(isRetryableError(new Error("429 Rate limit exceeded"))).toBe(true);
      expect(isRetryableError(new Error("Rate limit reached"))).toBe(true);
    });

    it("should return true for temporary failures", () => {
      expect(isRetryableError(new Error("Temporary failure"))).toBe(true);
      expect(isRetryableError(new Error("Please try again"))).toBe(true);
    });

    it("should return false for non-retryable errors", () => {
      expect(isRetryableError(new Error("Invalid input"))).toBe(false);
      expect(isRetryableError(new Error("Model not found"))).toBe(false);
      expect(isRetryableError(new Error("Schema validation failed"))).toBe(
        false
      );
    });

    it("should return false for non-Error objects", () => {
      expect(isRetryableError("string error")).toBe(false);
      expect(isRetryableError(null)).toBe(false);
      expect(isRetryableError(undefined)).toBe(false);
    });
  });

  describe("mapErrorToCode", () => {
    it("should map connection refused errors", () => {
      expect(mapErrorToCode(new Error("ECONNREFUSED"))).toBe(
        AIErrorCode.CONNECTION_REFUSED
      );
    });

    it("should map timeout errors", () => {
      expect(mapErrorToCode(new Error("Request timeout"))).toBe(
        AIErrorCode.TIMEOUT_ERROR
      );
    });

    it("should map network errors", () => {
      expect(mapErrorToCode(new Error("Network error"))).toBe(
        AIErrorCode.NETWORK_ERROR
      );
      expect(mapErrorToCode(new Error("ENOTFOUND"))).toBe(
        AIErrorCode.NETWORK_ERROR
      );
    });

    it("should map service unavailable errors", () => {
      expect(mapErrorToCode(new Error("503 Service Unavailable"))).toBe(
        AIErrorCode.SERVICE_UNAVAILABLE
      );
    });

    it("should map rate limit errors", () => {
      expect(mapErrorToCode(new Error("429 Rate limit exceeded"))).toBe(
        AIErrorCode.RATE_LIMIT_EXCEEDED
      );
    });

    it("should map model not found errors", () => {
      expect(mapErrorToCode(new Error("Model not found"))).toBe(
        AIErrorCode.MODEL_NOT_FOUND
      );
    });

    it("should map configuration errors", () => {
      expect(mapErrorToCode(new Error("Invalid configuration"))).toBe(
        AIErrorCode.INVALID_CONFIGURATION
      );
    });

    it("should map invalid input errors", () => {
      expect(mapErrorToCode(new Error("Invalid input provided"))).toBe(
        AIErrorCode.INVALID_INPUT
      );
      expect(mapErrorToCode(new Error("Content is empty"))).toBe(
        AIErrorCode.INVALID_INPUT
      );
    });

    it("should map content too long errors", () => {
      expect(mapErrorToCode(new Error("Content too long"))).toBe(
        AIErrorCode.CONTENT_TOO_LONG
      );
    });

    it("should map schema validation errors", () => {
      expect(mapErrorToCode(new Error("Schema validation failed"))).toBe(
        AIErrorCode.SCHEMA_VALIDATION_FAILED
      );
    });

    it("should map invalid response errors", () => {
      expect(mapErrorToCode(new Error("Invalid response from server"))).toBe(
        AIErrorCode.INVALID_RESPONSE
      );
      expect(mapErrorToCode(new Error("Failed to parse response"))).toBe(
        AIErrorCode.INVALID_RESPONSE
      );
    });

    it("should default to NETWORK_ERROR for unknown errors", () => {
      expect(mapErrorToCode(new Error("Unknown error"))).toBe(
        AIErrorCode.NETWORK_ERROR
      );
      expect(mapErrorToCode("string error")).toBe(AIErrorCode.NETWORK_ERROR);
    });
  });

  describe("createAIServiceError", () => {
    it("should create AIServiceError with correct properties", () => {
      const error = new Error("Test error");
      const result = createAIServiceError(error, "Test context", "lmstudio");

      expect(result).toBeInstanceOf(AIServiceError);
      expect(result.message).toContain("Test context");
      expect(result.message).toContain("Test error");
      expect(result.provider).toBe("lmstudio");
    });

    it("should determine retryable based on error type", () => {
      const retryableError = new Error("Network timeout");
      const result1 = createAIServiceError(
        retryableError,
        "Context",
        "lmstudio"
      );
      expect(result1.retryable).toBe(true);

      const nonRetryableError = new Error("Invalid input");
      const result2 = createAIServiceError(
        nonRetryableError,
        "Context",
        "lmstudio"
      );
      expect(result2.retryable).toBe(false);
    });

    it("should map error code correctly", () => {
      const error = new Error("ECONNREFUSED");
      const result = createAIServiceError(error, "Context", "ollama");

      expect(result.code).toBe(AIErrorCode.CONNECTION_REFUSED);
    });

    it("should handle non-Error objects", () => {
      const result = createAIServiceError("string error", "Context");

      expect(result).toBeInstanceOf(AIServiceError);
      expect(result.message).toContain("Unknown error occurred");
    });

    it("should work without provider parameter", () => {
      const error = new Error("Test error");
      const result = createAIServiceError(error, "Context");

      expect(result).toBeInstanceOf(AIServiceError);
      expect(result.provider).toBeUndefined();
    });
  });

  describe("BaseErrorMapper", () => {
    class TestErrorMapper extends BaseErrorMapper {
      mapError(error: unknown, context: string): AIServiceError {
        // Use the common error mapping
        return this.mapCommonError(error, context);
      }
    }

    it("should create mapper with provider context", () => {
      const mapper = new TestErrorMapper("lmstudio");
      expect(mapper).toBeInstanceOf(BaseErrorMapper);
    });

    it("should map errors with provider context", () => {
      const mapper = new TestErrorMapper("ollama");
      const error = new Error("Test error");
      const result = mapper.mapError(error, "Test context");

      expect(result).toBeInstanceOf(AIServiceError);
      expect(result.provider).toBe("ollama");
      expect(result.message).toContain("Test context");
    });

    it("should use common error mapping logic", () => {
      const mapper = new TestErrorMapper("lmstudio");
      const error = new Error("Network timeout");
      const result = mapper.mapError(error, "Connection failed");

      expect(result.retryable).toBe(true);
      expect(result.code).toBe(AIErrorCode.TIMEOUT_ERROR);
    });
  });
});
