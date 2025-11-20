import { createOllama } from "ollama-ai-provider-v2";
import { generateObject } from "ai";
import type { z } from "zod";
import type { AIProviderClient } from "./interface";
import type { OllamaConfig } from "../types";
import { mapOllamaError } from "./ollama-error-mapper";
import {
  validateContent,
  validateConfiguration,
  createTimeoutSignal,
  validateConnectionResponse,
} from "./validation";

/**
 * Ollama API response format for /api/tags endpoint
 */
interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
    digest: string;
  }>;
}

/**
 * Ollama client implementation using the AI SDK.
 * Provides structured output generation using Ollama's JSON mode.
 * Supports both local and cloud-hosted Ollama instances.
 */
export class OllamaClient implements AIProviderClient {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    // Validate configuration
    validateConfiguration(config, "ollama");

    this.config = config;
  }

  /**
   * Generate structured output using the AI SDK with Ollama provider.
   * @param params - Parameters for structured output generation
   * @returns Promise with the generated object and usage statistics
   */
  async generateStructuredOutput<T>(params: {
    prompt: string;
    schema: z.ZodSchema<T>;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<{
    object: T;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  }> {
    try {
      // Validate input
      validateContent(params.prompt, "ollama");

      // Create Ollama provider with custom base URL (supports both local and cloud)
      const ollama = createOllama({
        baseURL: this.config.apiUrl,
      });

      // Create model instance
      const model = ollama(this.config.model);

      // Generate structured output using AI SDK
      const result = await generateObject({
        model,
        schema: params.schema,
        prompt: params.prompt,
        system: params.systemPrompt,
        maxTokens: params.maxTokens ?? this.config.maxTokens,
        temperature: params.temperature ?? this.config.temperature,
        mode: "json",
      });

      return {
        object: result.object as T,
        usage: {
          promptTokens: (result.usage as any).promptTokens ?? 0,
          completionTokens: (result.usage as any).completionTokens ?? 0,
          totalTokens: result.usage.totalTokens ?? 0,
        },
      };
    } catch (error) {
      throw mapOllamaError(error, "Failed to generate structured output");
    }
  }

  /**
   * Validate connection to Ollama server using /api/tags endpoint.
   * @returns Promise that resolves to true if connection is successful
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: createTimeoutSignal(5000),
      });

      validateConnectionResponse(response, "ollama");

      console.log(`✓ Ollama connection validated at ${this.config.apiUrl}`);
      return true;
    } catch (error) {
      console.error("Failed to validate Ollama connection:", error);
      throw mapOllamaError(error, "Ollama connection validation failed");
    }
  }

  /**
   * Get list of available models from Ollama using /api/tags endpoint.
   * @returns Promise with array of model names
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: createTimeoutSignal(5000),
      });

      validateConnectionResponse(response, "ollama");

      const data = (await response.json()) as OllamaTagsResponse;

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error("Invalid response format from Ollama");
      }

      const models = data.models.map((model) => model.name);

      // Check if configured model is available
      if (!models.includes(this.config.model)) {
        console.warn(
          `Configured model "${this.config.model}" not found in Ollama. Available models:`,
          models
        );
      }

      return models;
    } catch (error) {
      throw mapOllamaError(error, "Failed to get available models");
    }
  }
}
