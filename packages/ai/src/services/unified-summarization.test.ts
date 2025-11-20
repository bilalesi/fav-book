import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnifiedSummarizationService } from "./unified-summarization";
import type { AIProviderClient } from "../providers";
import type { LMStudioConfig } from "../types";
import { AIServiceError, AIErrorCode } from "../types";

// Mock prisma
vi.mock("@favy/db", () => ({
  default: {
    category: {
      findMany: vi.fn().mockResolvedValue([
        { id: "1", name: "Technology" },
        { id: "2", name: "Science" },
      ]),
    },
  },
}));

describe("UnifiedSummarizationService", () => {
  let mockClient: AIProviderClient;
  let config: LMStudioConfig;
  let service: UnifiedSummarizationService;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      generateStructuredOutput: vi.fn(),
      validateConnection: vi.fn(),
      getAvailableModels: vi.fn(),
    };

    // Create config
    config = {
      provider: "lmstudio",
      apiUrl: "http://localhost:1234/v1",
      model: "test-model",
      maxTokens: 1000,
      temperature: 0.7,
    };

    // Create service
    service = new UnifiedSummarizationService(mockClient, config);
  });

  describe("generateSummary", () => {
    it("should generate summary with keywords and tags", async () => {
      // Mock response
      const mockResponse = {
        object: {
          summary: "Test summary",
          keywords: ["test", "keyword"],
          tags: [{ id: "1", name: "Technology" }],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(
        mockResponse
      );

      // Call service
      const result = await service.generateSummary("Test content");

      // Verify result
      expect(result).toEqual({
        summary: "Test summary",
        keywords: ["test", "keyword"],
        tags: [{ id: "1", name: "Technology" }],
        tokensUsed: 150,
      });

      // Verify client was called
      expect(mockClient.generateStructuredOutput).toHaveBeenCalled();
      const call = vi.mocked(mockClient.generateStructuredOutput).mock
        .calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call?.prompt).toBeDefined();
      expect(call?.schema).toBeDefined();
      expect(call?.systemPrompt).toBeDefined();
    });

    it("should throw AIServiceError for empty content", async () => {
      await expect(service.generateSummary("")).rejects.toThrow(AIServiceError);
      await expect(service.generateSummary("   ")).rejects.toThrow(
        AIServiceError
      );
    });

    it("should truncate long content", async () => {
      const longContent = "a".repeat(15000);

      const mockResponse = {
        object: {
          summary: "Test summary",
          keywords: ["test"],
          tags: [],
        },
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      };

      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(
        mockResponse
      );

      await service.generateSummary(longContent);

      // Verify the prompt was truncated
      const call = vi.mocked(mockClient.generateStructuredOutput).mock
        .calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call?.prompt.length).toBeLessThan(longContent.length);
    });

    it("should wrap non-AIServiceError errors", async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new Error("Network error")
      );

      await expect(service.generateSummary("Test content")).rejects.toThrow(
        AIServiceError
      );
    });

    it("should rethrow AIServiceError as-is", async () => {
      const originalError = new AIServiceError(
        "Test error",
        AIErrorCode.NETWORK_ERROR,
        true,
        "lmstudio"
      );

      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        originalError
      );

      await expect(service.generateSummary("Test content")).rejects.toThrow(
        originalError
      );
    });
  });

  describe("extractKeywords", () => {
    it("should extract keywords from content", async () => {
      const mockResponse = {
        object: {
          keywords: ["test", "keyword", "extraction"],
        },
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70,
        },
      };

      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(
        mockResponse
      );

      const result = await service.extractKeywords("Test content", 3);

      expect(result).toEqual(["test", "keyword", "extraction"]);
      expect(mockClient.generateStructuredOutput).toHaveBeenCalled();
      const call = vi.mocked(mockClient.generateStructuredOutput).mock
        .calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call?.maxTokens).toBe(500);
    });

    it("should throw AIServiceError for empty content", async () => {
      await expect(service.extractKeywords("")).rejects.toThrow(AIServiceError);
      await expect(service.extractKeywords("   ")).rejects.toThrow(
        AIServiceError
      );
    });

    it("should use default count of 10", async () => {
      const mockResponse = {
        object: {
          keywords: Array(10).fill("keyword"),
        },
        usage: {
          promptTokens: 50,
          completionTokens: 20,
          totalTokens: 70,
        },
      };

      vi.mocked(mockClient.generateStructuredOutput).mockResolvedValue(
        mockResponse
      );

      await service.extractKeywords("Test content");

      const call = vi.mocked(mockClient.generateStructuredOutput).mock
        .calls[0]?.[0];
      expect(call).toBeDefined();
      expect(call?.prompt).toContain("10");
    });

    it("should wrap non-AIServiceError errors", async () => {
      vi.mocked(mockClient.generateStructuredOutput).mockRejectedValue(
        new Error("Network error")
      );

      await expect(service.extractKeywords("Test content")).rejects.toThrow(
        AIServiceError
      );
    });
  });
});
