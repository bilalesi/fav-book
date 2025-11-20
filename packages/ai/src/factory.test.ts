import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createSummarizationService } from "./factory";
import { AIServiceError } from "./types";

describe("createSummarizationService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it("should create a service with default provider (lmstudio)", async () => {
    // Disable validation to avoid needing a running server
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    const service = await createSummarizationService();

    expect(service).toBeDefined();
    expect(service.generateSummary).toBeDefined();
    expect(service.extractKeywords).toBeDefined();
  });

  it("should create a service with lmstudio provider", async () => {
    process.env.AI_PROVIDER = "lmstudio";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    const service = await createSummarizationService();

    expect(service).toBeDefined();
  });

  it("should create a service with ollama provider", async () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    const service = await createSummarizationService();

    expect(service).toBeDefined();
  });

  it("should throw error for invalid provider", async () => {
    process.env.AI_PROVIDER = "invalid-provider";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    await expect(createSummarizationService()).rejects.toThrow(AIServiceError);
    await expect(createSummarizationService()).rejects.toThrow(
      /Invalid AI_PROVIDER value/
    );
  });

  it("should accept override configuration", async () => {
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    const service = await createSummarizationService({
      provider: "ollama",
      apiUrl: "http://custom:11434",
      model: "custom-model",
      maxTokens: 2000,
      temperature: 0.9,
      format: "json",
    });

    expect(service).toBeDefined();
  });

  it("should use environment configuration when no override provided", async () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.OLLAMA_MODEL = "test-model";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    const service = await createSummarizationService();

    expect(service).toBeDefined();
  });

  it("should skip validation when AI_PROVIDER_VALIDATE_ON_STARTUP is false", async () => {
    process.env.AI_PROVIDER = "lmstudio";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "false";

    // Should not throw even though server is not running
    const service = await createSummarizationService();

    expect(service).toBeDefined();
  });

  it("should continue in lenient mode when validation fails", async () => {
    process.env.AI_PROVIDER = "lmstudio";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "true";
    process.env.AI_PROVIDER_STRICT_MODE = "false";
    process.env.LM_STUDIO_API_URL = "http://localhost:9999"; // Non-existent server

    // Should not throw in lenient mode
    const service = await createSummarizationService();

    expect(service).toBeDefined();
  });

  it("should throw in strict mode when validation fails", async () => {
    process.env.AI_PROVIDER = "lmstudio";
    process.env.AI_PROVIDER_VALIDATE_ON_STARTUP = "true";
    process.env.AI_PROVIDER_STRICT_MODE = "true";
    process.env.LM_STUDIO_API_URL = "http://localhost:9999"; // Non-existent server

    // Should throw in strict mode
    await expect(createSummarizationService()).rejects.toThrow();
  });
});
