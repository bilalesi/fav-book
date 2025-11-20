import { describe, it, expect, beforeEach } from "vitest";
import { LMStudioClient } from "./lmstudio-client";
import type { LMStudioConfig } from "../types";
import { AIErrorCode } from "../types";

describe("LMStudioClient", () => {
  let config: LMStudioConfig;

  beforeEach(() => {
    config = {
      provider: "lmstudio",
      apiUrl: "http://localhost:1234/v1",
      model: "test-model",
      maxTokens: 1000,
      temperature: 0.7,
    };
  });

  describe("constructor", () => {
    it("should create client with valid configuration", () => {
      const client = new LMStudioClient(config);
      expect(client).toBeDefined();
    });

    it("should throw error for invalid API URL", () => {
      const invalidConfig = { ...config, apiUrl: "not-a-url" };
      expect(() => new LMStudioClient(invalidConfig)).toThrow();
    });

    it("should throw error for negative maxTokens", () => {
      const invalidConfig = { ...config, maxTokens: -100 };
      expect(() => new LMStudioClient(invalidConfig)).toThrow();
    });

    it("should throw error for invalid temperature", () => {
      const invalidConfig = { ...config, temperature: 3.0 };
      expect(() => new LMStudioClient(invalidConfig)).toThrow();
    });
  });

  describe("generateStructuredOutput", () => {
    it("should throw error for empty prompt", async () => {
      const client = new LMStudioClient(config);
      const schema = { parse: (v: any) => v };

      await expect(
        client.generateStructuredOutput({
          prompt: "",
          schema: schema as any,
        })
      ).rejects.toThrow();
    });

    it("should throw error for whitespace-only prompt", async () => {
      const client = new LMStudioClient(config);
      const schema = { parse: (v: any) => v };

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
      const client = new LMStudioClient(config);
      const schema = { parse: (v: any) => v };

      try {
        await client.generateStructuredOutput({
          prompt: "",
          schema: schema as any,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.provider).toBe("lmstudio");
      }
    });

    it("should mark input errors as non-retryable", async () => {
      const client = new LMStudioClient(config);
      const schema = { parse: (v: any) => v };

      try {
        await client.generateStructuredOutput({
          prompt: "",
          schema: schema as any,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.retryable).toBe(false);
        expect(error.code).toBe(AIErrorCode.INVALID_INPUT);
      }
    });
  });
});
