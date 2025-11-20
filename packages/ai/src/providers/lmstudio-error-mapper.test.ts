import { describe, it, expect } from "vitest";
import { LMStudioErrorMapper, mapLMStudioError } from "./lmstudio-error-mapper";
import { AIErrorCode } from "../types";

describe("LMStudioErrorMapper", () => {
  describe("Network Errors (Retryable)", () => {
    it("should map ECONNREFUSED to CONNECTION_REFUSED", () => {
      const error = new Error("connect ECONNREFUSED 127.0.0.1:1234");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.CONNECTION_REFUSED);
      expect(result.retryable).toBe(true);
      expect(result.provider).toBe("lmstudio");
      expect(result.message).toContain("Test context");
      expect(result.message).toContain("not running");
    });

    it("should map timeout errors to TIMEOUT_ERROR", () => {
      const error = new Error("Request timed out after 5000ms");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.TIMEOUT_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map network errors to NETWORK_ERROR", () => {
      const error = new Error("Network request failed");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map fetch failed to NETWORK_ERROR", () => {
      const error = new Error("fetch failed");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.NETWORK_ERROR);
      expect(result.retryable).toBe(true);
    });
  });

  describe("Service Errors (Retryable)", () => {
    it("should map 503 errors to SERVICE_UNAVAILABLE", () => {
      const error = new Error("503 Service Unavailable");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.SERVICE_UNAVAILABLE);
      expect(result.retryable).toBe(true);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map rate limit errors to RATE_LIMIT_EXCEEDED", () => {
      const error = new Error("429 Rate limit exceeded");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
      expect(result.retryable).toBe(true);
      expect(result.provider).toBe("lmstudio");
    });
  });

  describe("Configuration Errors (Non-Retryable)", () => {
    it("should map model not found to MODEL_NOT_FOUND", () => {
      const error = new Error("Model not found: test-model");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.MODEL_NOT_FOUND);
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map invalid configuration to INVALID_CONFIGURATION", () => {
      const error = new Error("Invalid configuration provided");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.INVALID_CONFIGURATION);
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("lmstudio");
    });
  });

  describe("Input Errors (Non-Retryable)", () => {
    it("should map empty content to INVALID_INPUT", () => {
      const error = new Error("Content cannot be empty");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.INVALID_INPUT);
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map invalid input to INVALID_INPUT", () => {
      const error = new Error("Invalid input provided");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.INVALID_INPUT);
      expect(result.retryable).toBe(false);
    });

    it("should map content too long to CONTENT_TOO_LONG", () => {
      const error = new Error("Content exceeds maximum length");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.CONTENT_TOO_LONG);
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("lmstudio");
    });
  });

  describe("Response Errors", () => {
    it("should map schema validation errors to SCHEMA_VALIDATION_FAILED", () => {
      const error = new Error("Schema validation failed");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.SCHEMA_VALIDATION_FAILED);
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map invalid response to INVALID_RESPONSE", () => {
      const error = new Error("Invalid response from server");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.INVALID_RESPONSE);
      expect(result.retryable).toBe(false);
      expect(result.provider).toBe("lmstudio");
    });

    it("should map JSON parse errors to INVALID_RESPONSE", () => {
      const error = new Error("Failed to parse JSON response");
      const result = mapLMStudioError(error, "Test context");

      expect(result.code).toBe(AIErrorCode.INVALID_RESPONSE);
      expect(result.retryable).toBe(false);
    });
  });

  describe("Unknown Errors", () => {
    it("should fall back to common error mapping for unknown errors", () => {
      const error = new Error("Some unknown error");
      const result = mapLMStudioError(error, "Test context");

      expect(result.provider).toBe("lmstudio");
      expect(result.message).toContain("Test context");
    });

    it("should handle non-Error objects", () => {
      const error = "String error";
      const result = mapLMStudioError(error, "Test context");

      expect(result.provider).toBe("lmstudio");
      expect(result.message).toContain("Test context");
    });
  });

  describe("LMStudioErrorMapper class", () => {
    it("should create mapper with lmstudio provider", () => {
      const mapper = new LMStudioErrorMapper();
      const error = new Error("Test error");
      const result = mapper.mapError(error, "Test context");

      expect(result.provider).toBe("lmstudio");
    });

    it("should preserve context in error messages", () => {
      const mapper = new LMStudioErrorMapper();
      const error = new Error("Original error");
      const result = mapper.mapError(error, "Custom context");

      expect(result.message).toContain("Custom context");
    });
  });
});
