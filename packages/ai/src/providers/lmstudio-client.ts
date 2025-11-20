import { OpenAICompatibleChatLanguageModel } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import type { z } from "zod";
import type { AIProviderClient } from "./interface";
import type { LMStudioConfig } from "../types";
import { mapLMStudioError } from "./lmstudio-error-mapper";
import {
  validateContent,
  validateConfiguration,
  createTimeoutSignal,
  validateConnectionResponse,
} from "./validation";

/**
 * LMStudio client implementation using the AI SDK.
 * Provides structured output generation using LMStudio's OpenAI-compatible API.
 */
export class LMStudioClient implements AIProviderClient {
  private model: OpenAICompatibleChatLanguageModel;
  private config: LMStudioConfig;

  constructor(config: LMStudioConfig) {
    // Validate configuration
    validateConfiguration(config, "lmstudio");

    this.config = config;

    // Create OpenAI-compatible model instance
    this.model = new OpenAICompatibleChatLanguageModel(config.model, {
      provider: "lmstudio.chat",
      url: ({ path }) => {
        const url = new URL(`${config.apiUrl}${path}`);
        return url.toString();
      },
      headers: () => ({}),
      supportsStructuredOutputs: true,
    });
  }

  /**
   * Generate structured output using the AI SDK.
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
      validateContent(params.prompt, "lmstudio");

      // Generate structured output using AI SDK
      const result = await generateObject({
        model: this.model,
        schema: params.schema,
        prompt: params.prompt,
        system: params.systemPrompt,
        maxOutputTokens: params.maxTokens ?? this.config.maxTokens,
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
      throw mapLMStudioError(error, "Failed to generate structured output");
    }
  }

  /**
   * Validate connection to LMStudio server.
   * @returns Promise that resolves to true if connection is successful
   */
  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: createTimeoutSignal(5000),
      });

      validateConnectionResponse(response, "lmstudio");

      console.log(`✓ LMStudio connection validated at ${this.config.apiUrl}`);
      return true;
    } catch (error) {
      console.error("Failed to validate LMStudio connection:", error);
      throw mapLMStudioError(error, "LMStudio connection validation failed");
    }
  }

  /**
   * Get list of available models from LMStudio.
   * @returns Promise with array of model names
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: createTimeoutSignal(5000),
      });

      validateConnectionResponse(response, "lmstudio");

      const data = (await response.json()) as {
        data?: Array<{ id: string }>;
      };

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error("Invalid response format from LMStudio");
      }

      const models = data.data.map((model) => model.id);

      // Check if configured model is available
      if (!models.includes(this.config.model)) {
        console.warn(
          `Configured model "${this.config.model}" not found in LMStudio. Available models:`,
          models
        );
      }

      return models;
    } catch (error) {
      throw mapLMStudioError(error, "Failed to get available models");
    }
  }
}
