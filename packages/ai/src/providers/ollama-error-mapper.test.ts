import { describe, it, expect } from "vitest";
import { OllamaErrorMapper, mapOllamaError } from "./ollama-error-mapper";
import { AIErrorCode } from "../types";

describe("OllamaErrorMapper", () => {
  describe("Network Errors (Retryable)", () => {
    it("should map ECONNREFUSED to CONNECTION_REFUSED", () => {
      const error = new Error("connect ECONNREFUSED 127.0.0.1:11434");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.CONNECTION_REFUSED);
      expect(mapped.retryable).toBe(true);
      expect(mapped.provider).toBe("ollama");
      expect(mapped.message).toContain("Ollama server is not running");
    });

    it("should map timeout errors to TIMEOUT_ERROR", () => {
      const error = new Error("Request timed out after 5000ms");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.TIMEOUT_ERROR);
      expect(mapped.retryable).toBe(true);
      expect(mapped.provider).toBe("ollama");
    });

    it("should map network errors to NETWORK_ERROR", () => {
      const error = new Error("Network error occurred");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.NETWORK_ERROR);
      expect(mapped.retryable).toBe(true);
      expect(mapped.provider).toBe("ollama");
    });

    it("should map fetch failed to NETWORK_ERROR", () => {
      const error = new Error("fetch failed");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.NETWORK_ERROR);
      expect(mapped.retryable).toBe(true);
    });
  });

  describe("Service Errors (Retryable)", () => {
    it("should map 503 errors to SERVICE_UNAVAILABLE", () => {
      const error = new Error("503 Service Unavailable");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.SERVICE_UNAVAILABLE);
      expect(mapped.retryable).toBe(true);
      expect(mapped.provider).toBe("ollama");
    });

    it("should map rate limit errors to RATE_LIMIT_EXCEEDED", () => {
      const error = new Error("429 Rate limit exceeded");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
      expect(mapped.retryable).toBe(true);
    });
  });

  describe("Configuration Errors (Non-Retryable)", () => {
    it("should map model not found to MODEL_NOT_FOUND", () => {
      const error = new Error("model not found");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.MODEL_NOT_FOUND);
      expect(mapped.retryable).toBe(false);
      expect(mapped.provider).toBe("ollama");
    });

    it("should map model not loaded to MODEL_NOT_FOUND", () => {
      const error = new Error("model not loaded");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.MODEL_NOT_FOUND);
      expect(mapped.retryable).toBe(false);
    });

    it("should map invalid configuration to INVALID_CONFIGURATION", () => {
      const error = new Error("invalid configuration provided");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.INVALID_CONFIGURATION);
      expect(mapped.retryable).toBe(false);
    });
  });

  describe("Input Errors (Non-Retryable)", () => {
    it("should map empty content to INVALID_INPUT", () => {
      const error = new Error("Content cannot be empty");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.INVALID_INPUT);
      expect(mapped.retryable).toBe(false);
    });

    it("should map invalid input to INVALID_INPUT", () => {
      const error = new Error("invalid input provided");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.INVALID_INPUT);
      expect(mapped.retryable).toBe(false);
    });

    it("should map content too long to CONTENT_TOO_LONG", () => {
      const error = new Error("Content exceeds maximum length");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.CONTENT_TOO_LONG);
      expect(mapped.retryable).toBe(false);
    });
  });

  describe("Response Errors", () => {
    it("should map schema validation errors to SCHEMA_VALIDATION_FAILED", () => {
      const error = new Error("Schema validation failed");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.SCHEMA_VALIDATION_FAILED);
      expect(mapped.retryable).toBe(false);
    });

    it("should map invalid response to INVALID_RESPONSE", () => {
      const error = new Error("Invalid response from server");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.INVALID_RESPONSE);
      expect(mapped.retryable).toBe(false);
    });

    it("should map JSON parse errors to INVALID_RESPONSE", () => {
      const error = new Error("Failed to parse JSON response");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.INVALID_RESPONSE);
      expect(mapped.retryable).toBe(false);
    });
  });

  describe("Ollama-specific Errors", () => {
    it("should map Ollama API 404 to MODEL_NOT_FOUND", () => {
      const error = new Error("Ollama API request failed: 404 Not Found");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.MODEL_NOT_FOUND);
      expect(mapped.retryable).toBe(false);
    });

    it("should map Ollama API 503 to SERVICE_UNAVAILABLE", () => {
      const error = new Error(
        "Ollama API request failed: 503 Service Unavailable"
      );
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.SERVICE_UNAVAILABLE);
      expect(mapped.retryable).toBe(true);
    });

    it("should map Ollama API 429 to RATE_LIMIT_EXCEEDED", () => {
      const error = new Error(
        "Ollama API request failed: 429 Too Many Requests"
      );
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.RATE_LIMIT_EXCEEDED);
      expect(mapped.retryable).toBe(true);
    });

    it("should map generic Ollama API errors to NETWORK_ERROR", () => {
      const error = new Error(
        "Ollama API request failed: 500 Internal Server Error"
      );
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.code).toBe(AIErrorCode.NETWORK_ERROR);
      expect(mapped.retryable).toBe(true);
    });
  });

  describe("Unknown Errors", () => {
    it("should fall back to common error mapping for unknown errors", () => {
      const error = new Error("Some unknown error");
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.provider).toBe("ollama");
      expect(mapped.message).toContain("Test context");
    });

    it("should handle non-Error objects", () => {
      const error = "String error";
      const mapped = mapOllamaError(error, "Test context");

      expect(mapped.provider).toBe("ollama");
      expect(mapped.message).toContain("Test context");
    });
  });

  describe("OllamaErrorMapper class", () => {
    it("should create mapper with ollama provider", () => {
      const mapper = new OllamaErrorMapper();
      const error = new Error("test error");
      const mapped = mapper.mapError(error, "Test context");

      expect(mapped.provider).toBe("ollama");
    });

    it("should preserve context in error messages", () => {
      const mapper = new OllamaErrorMapper();
      const error = new Error("Network error");
      const mapped = mapper.mapError(error, "Custom context");

      expect(mapped.message).toContain("Custom context");
    });
  });
});
