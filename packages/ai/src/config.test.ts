import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectProvider,
  getLMStudioConfig,
  getOllamaConfig,
  getProviderConfig,
  shouldValidateOnStartup,
  isStrictMode,
} from "./config";
import { AIServiceError, AIErrorCode } from "./types";

describe("Provider Detection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("detectProvider", () => {
    it("should return lmstudio when AI_PROVIDER is 'lmstudio'", () => {
      process.env.AI_PROVIDER = "lmstudio";
      expect(detectProvider()).toBe("lmstudio");
    });

    it("should return ollama when AI_PROVIDER is 'ollama'", () => {
      process.env.AI_PROVIDER = "ollama";
      expect(detectProvider()).toBe("ollama");
    });

    it("should return ollama as default when AI_PROVIDER is not set", () => {
      delete process.env.AI_PROVIDER;
      expect(detectProvider()).toBe("ollama");
    });

    it("should handle case-insensitive provider names", () => {
      process.env.AI_PROVIDER = "LMSTUDIO";
      expect(detectProvider()).toBe("lmstudio");

      process.env.AI_PROVIDER = "Ollama";
      expect(detectProvider()).toBe("ollama");
    });

    it("should throw AIServiceError for invalid provider", () => {
      process.env.AI_PROVIDER = "invalid-provider";
      expect(() => detectProvider()).toThrow(AIServiceError);
      expect(() => detectProvider()).toThrow(
        'Invalid AI_PROVIDER value: "invalid-provider"'
      );
    });

    it("should throw error with INVALID_PROVIDER code", () => {
      process.env.AI_PROVIDER = "gpt4";
      try {
        detectProvider();
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError);
        expect((error as AIServiceError).code).toBe(
          AIErrorCode.INVALID_PROVIDER
        );
        expect((error as AIServiceError).retryable).toBe(false);
      }
    });
  });

  describe("getLMStudioConfig", () => {
    it("should return default LMStudio configuration", () => {
      const config = getLMStudioConfig();
      expect(config).toEqual({
        provider: "lmstudio",
        apiUrl: "http://localhost:1234/v1",
        model: "llama-3.2-3b-instruct",
        maxTokens: 1000,
        temperature: 0.7,
      });
    });

    it("should use environment variables when provided", () => {
      process.env.LM_STUDIO_API_URL = "http://custom:8080/v1";
      process.env.LM_STUDIO_MODEL = "custom-model";
      process.env.LM_STUDIO_MAX_TOKENS = "2000";
      process.env.LM_STUDIO_TEMPERATURE = "0.5";

      const config = getLMStudioConfig();
      expect(config).toEqual({
        provider: "lmstudio",
        apiUrl: "http://custom:8080/v1",
        model: "custom-model",
        maxTokens: 2000,
        temperature: 0.5,
      });
    });

    it("should use default for invalid maxTokens", () => {
      process.env.LM_STUDIO_MAX_TOKENS = "invalid";
      const config = getLMStudioConfig();
      expect(config.maxTokens).toBe(1000);
    });

    it("should use default for negative maxTokens", () => {
      process.env.LM_STUDIO_MAX_TOKENS = "-100";
      const config = getLMStudioConfig();
      expect(config.maxTokens).toBe(1000);
    });

    it("should use default for invalid temperature", () => {
      process.env.LM_STUDIO_TEMPERATURE = "invalid";
      const config = getLMStudioConfig();
      expect(config.temperature).toBe(0.7);
    });

    it("should use default for out-of-range temperature", () => {
      process.env.LM_STUDIO_TEMPERATURE = "3.0";
      const config = getLMStudioConfig();
      expect(config.temperature).toBe(0.7);
    });
  });

  describe("getOllamaConfig", () => {
    it("should return default Ollama configuration", () => {
      const config = getOllamaConfig();
      expect(config).toEqual({
        provider: "ollama",
        apiUrl: "http://localhost:11434",
        model: "llama3.2:3b",
        maxTokens: 1000,
        temperature: 0.7,
        format: "json",
      });
    });

    it("should use environment variables when provided", () => {
      process.env.OLLAMA_API_URL = "http://custom:11435";
      process.env.OLLAMA_MODEL = "custom-ollama-model";
      process.env.OLLAMA_MAX_TOKENS = "1500";
      process.env.OLLAMA_TEMPERATURE = "0.8";

      const config = getOllamaConfig();
      expect(config).toEqual({
        provider: "ollama",
        apiUrl: "http://custom:11435",
        model: "custom-ollama-model",
        maxTokens: 1500,
        temperature: 0.8,
        format: "json",
      });
    });

    it("should use default for invalid maxTokens", () => {
      process.env.OLLAMA_MAX_TOKENS = "not-a-number";
      const config = getOllamaConfig();
      expect(config.maxTokens).toBe(1000);
    });

    it("should use default for invalid temperature", () => {
      process.env.OLLAMA_TEMPERATURE = "not-a-number";
      const config = getOllamaConfig();
      expect(config.temperature).toBe(0.7);
    });
  });

  describe("getProviderConfig", () => {
    it("should return LMStudio config for lmstudio provider", () => {
      const config = getProviderConfig("lmstudio");
      expect(config.provider).toBe("lmstudio");
      expect(config.apiUrl).toBe("http://localhost:1234/v1");
    });

    it("should return Ollama config for ollama provider", () => {
      const config = getProviderConfig("ollama");
      expect(config.provider).toBe("ollama");
      expect(config.apiUrl).toBe("http://localhost:11434");
    });

    it("should throw error for unknown provider", () => {
      expect(() => getProviderConfig("unknown" as any)).toThrow(AIServiceError);
    });
  });

  describe("shouldValidateOnStartup", () => {
    it("should return true by default", () => {
      delete process.env.AI_PROVIDER_VALIDATE_ON_STARTUP;
      expect(shouldValidateOnStartup()).toBe(true);
    });

    it("should return true when set to 'true'", () => {
      process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "true";
      expect(shouldValidateOnStartup()).toBe(true);
    });

    it("should return false when set to 'false'", () => {
      process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";
      expect(shouldValidateOnStartup()).toBe(false);
    });

    it("should handle case-insensitive values", () => {
      process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "TRUE";
      expect(shouldValidateOnStartup()).toBe(true);

      process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "FALSE";
      expect(shouldValidateOnStartup()).toBe(false);
    });
  });

  describe("isStrictMode", () => {
    it("should return false by default", () => {
      delete process.env.AI_PROVIDER_STRICT_MODE;
      expect(isStrictMode()).toBe(false);
    });

    it("should return true when set to 'true'", () => {
      process.env.AI_PROVIDER_STRICT_MODE = "true";
      expect(isStrictMode()).toBe(true);
    });

    it("should return false when set to 'false'", () => {
      process.env.AI_PROVIDER_STRICT_MODE = "false";
      expect(isStrictMode()).toBe(false);
    });

    it("should handle case-insensitive values", () => {
      process.env.AI_PROVIDER_STRICT_MODE = "TRUE";
      expect(isStrictMode()).toBe(true);

      process.env.AI_PROVIDER_STRICT_MODE = "FALSE";
      expect(isStrictMode()).toBe(false);
    });
  });
});
