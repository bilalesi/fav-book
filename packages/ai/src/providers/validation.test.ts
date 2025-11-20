import { describe, it, expect } from "vitest";
import {
  validateContent,
  validateAndTruncateContent,
  validateModelAvailability,
  validateApiUrl,
  validateConfiguration,
  validateConnectionResponse,
} from "./validation";
import { AIServiceError, AIErrorCode } from "../types";

describe("Provider Validation Utilities", () => {
  describe("validateContent", () => {
    it("should not throw for valid content", () => {
      expect(() => validateContent("Valid content")).not.toThrow();
    });

    it("should throw AIServiceError for empty content", () => {
      expect(() => validateContent("")).toThrow(AIServiceError);
      expect(() => validateContent("")).toThrow("Content cannot be empty");
    });

    it("should throw AIServiceError for whitespace-only content", () => {
      expect(() => validateContent("   ")).toThrow(AIServiceError);
    });

    it("should include provider in error when provided", () => {
      try {
        validateContent("", "lmstudio");
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect((error as AIServiceError).provider).toBe("lmstudio");
      }
    });
  });

  describe("validateAndTruncateContent", () => {
    it("should return content unchanged if under max length", () => {
      const content = "Short content";
      expect(validateAndTruncateContent(content)).toBe(content);
    });

    it("should truncate content if over max length", () => {
      const content = "a".repeat(15000);
      const result = validateAndTruncateContent(content, 10000);
      expect(result.length).toBe(10003); // 10000 + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should use default max length of 10000", () => {
      const content = "a".repeat(15000);
      const result = validateAndTruncateContent(content);
      expect(result.length).toBe(10003);
    });
  });

  describe("validateModelAvailability", () => {
    it("should not throw if model is in available list", () => {
      expect(() =>
        validateModelAvailability("model-1", ["model-1", "model-2"])
      ).not.toThrow();
    });

    it("should throw AIServiceError if model is not available", () => {
      expect(() =>
        validateModelAvailability("model-3", ["model-1", "model-2"])
      ).toThrow(AIServiceError);
    });

    it("should include available models in error message", () => {
      try {
        validateModelAvailability("model-3", ["model-1", "model-2"]);
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect((error as Error).message).toContain("model-1, model-2");
      }
    });
  });

  describe("validateApiUrl", () => {
    it("should not throw for valid URLs", () => {
      expect(() => validateApiUrl("http://localhost:1234")).not.toThrow();
      expect(() => validateApiUrl("https://api.example.com")).not.toThrow();
    });

    it("should throw AIServiceError for invalid URLs", () => {
      expect(() => validateApiUrl("not-a-url")).toThrow(AIServiceError);
      expect(() => validateApiUrl("")).toThrow(AIServiceError);
    });

    it("should use INVALID_CONFIGURATION error code", () => {
      try {
        validateApiUrl("invalid-url");
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect((error as AIServiceError).code).toBe(
          AIErrorCode.INVALID_CONFIGURATION
        );
      }
    });
  });

  describe("validateConfiguration", () => {
    it("should not throw for valid configuration", () => {
      expect(() =>
        validateConfiguration({
          apiUrl: "http://localhost:1234",
          model: "test-model",
          maxTokens: 1000,
          temperature: 0.7,
        })
      ).not.toThrow();
    });

    it("should throw for invalid API URL", () => {
      expect(() => validateConfiguration({ apiUrl: "invalid" })).toThrow(
        AIServiceError
      );
    });

    it("should throw for empty model name", () => {
      expect(() => validateConfiguration({ model: "" })).toThrow(
        AIServiceError
      );
    });

    it("should throw for negative maxTokens", () => {
      expect(() => validateConfiguration({ maxTokens: -1 })).toThrow(
        AIServiceError
      );
    });

    it("should throw for zero maxTokens", () => {
      expect(() => validateConfiguration({ maxTokens: 0 })).toThrow(
        AIServiceError
      );
    });

    it("should throw for temperature below 0", () => {
      expect(() => validateConfiguration({ temperature: -0.1 })).toThrow(
        AIServiceError
      );
    });

    it("should throw for temperature above 2", () => {
      expect(() => validateConfiguration({ temperature: 2.1 })).toThrow(
        AIServiceError
      );
    });
  });

  describe("validateConnectionResponse", () => {
    it("should return true for successful response", () => {
      const response = new Response(null, { status: 200 });
      expect(validateConnectionResponse(response)).toBe(true);
    });

    it("should throw for 503 service unavailable", () => {
      const response = new Response(null, { status: 503 });
      expect(() => validateConnectionResponse(response)).toThrow(
        AIServiceError
      );

      try {
        validateConnectionResponse(response);
      } catch (error) {
        expect((error as AIServiceError).code).toBe(
          AIErrorCode.SERVICE_UNAVAILABLE
        );
        expect((error as AIServiceError).retryable).toBe(true);
      }
    });

    it("should throw for 404 not found", () => {
      const response = new Response(null, { status: 404 });
      expect(() => validateConnectionResponse(response)).toThrow(
        AIServiceError
      );

      try {
        validateConnectionResponse(response);
      } catch (error) {
        expect((error as AIServiceError).code).toBe(
          AIErrorCode.MODEL_NOT_FOUND
        );
        expect((error as AIServiceError).retryable).toBe(false);
      }
    });

    it("should throw generic network error for other failures", () => {
      const response = new Response(null, { status: 500 });
      expect(() => validateConnectionResponse(response)).toThrow(
        AIServiceError
      );

      try {
        validateConnectionResponse(response);
      } catch (error) {
        expect((error as AIServiceError).code).toBe(AIErrorCode.NETWORK_ERROR);
        expect((error as AIServiceError).retryable).toBe(true);
      }
    });
  });
});
