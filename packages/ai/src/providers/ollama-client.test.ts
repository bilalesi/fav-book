import { describe, it, expect } from "vitest";
import { OllamaClient } from "./ollama-client";
import type { OllamaConfig } from "../types";
import { AIErrorCode } from "../types";

describe("OllamaClient", () => {
  const validConfig: OllamaConfig = {
    provider: "ollama",
    apiUrl: "http://localhost:11434",
    model: "llama3.2:3b",
    maxTokens: 1000,
    temperature: 0.7,
    format: "json",
  };

  describe("constructor", () => {
    it("should create client with valid configuration", () => {
      const client = new OllamaClient(validConfig);
      expect(client).toBeInstanceOf(OllamaClient);
    });

    it("should throw error for invalid API URL", () => {
      const invalidConfig = {
        ...validConfig,
        apiUrl: "not-a-valid-url",
      };

      expect(() => new OllamaClient(invalidConfig)).toThrow();
    });

    it("should throw error for negative maxTokens", () => {
      const invalidConfig = {
        ...validConfig,
        maxTokens: -100,
      };

      expect(() => new OllamaClient(invalidConfig)).toThrow();
      try {
        new OllamaClient(invalidConfig);
      } catch (error: any) {
        expect(error.code).toBe(AIErrorCode.INVALID_CONFIGURATION);
      }
    });

    it("should throw error for invalid temperature", () => {
      const invalidConfig = {
        ...validConfig,
        temperature: 3.0,
      };

      expect(() => new OllamaClient(invalidConfig)).toThrow();
      try {
        new OllamaClient(invalidConfig);
      } catch (error: any) {
        expect(error.code).toBe(AIErrorCode.INVALID_CONFIGURATION);
      }
    });
  });

  describe("generateStructuredOutput", () => {
    it("should throw error for empty prompt", async () => {
      const client = new OllamaClient(validConfig);
      const schema = { parse: (data: any) => data };

      await expect(
        client.generateStructuredOutput({
          prompt: "",
          schema: schema as any,
        })
      ).rejects.toThrow();
    });

    it("should throw error for whitespace-only prompt", async () => {
      const client = new OllamaClient(validConfig);
      const schema = { parse: (data: any) => data };

      await expect(
        client.generateStructuredOutput({
          prompt: "   ",
          schema: schema as any,
        })
      ).rejects.toThrow();
    });
  });

  describe("error handling", () => {
    it("should include provider name in errors", async () => {
      const client = new OllamaClient(validConfig);
      const schema = { parse: (data: any) => data };

      try {
        await client.generateStructuredOutput({
          prompt: "",
          schema: schema as any,
        });
      } catch (error: any) {
        expect(error.provider).toBe("ollama");
      }
    });

    it("should mark input errors as non-retryable", async () => {
      const client = new OllamaClient(validConfig);
      const schema = { parse: (data: any) => data };

      try {
        await client.generateStructuredOutput({
          prompt: "",
          schema: schema as any,
        });
      } catch (error: any) {
        expect(error.retryable).toBe(false);
      }
    });
  });
});
