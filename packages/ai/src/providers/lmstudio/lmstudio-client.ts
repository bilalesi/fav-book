import ky from "ky";
import { ResultAsync } from "neverthrow";
import { OpenAICompatibleChatLanguageModel } from "@ai-sdk/openai-compatible";
import { generateObject } from "ai";
import type { z } from "zod";
import type { AIProviderClient } from "../interface";
import type { LMStudioConfig } from "../../types";
import { map_lmstudio_error } from "./lmstudio-error-mapper";
import {
  validate_content,
  validate_configuration,
  create_timeout_signal,
  assess_connection_response,
} from "../validation";


/**
 * LMStudio client implementation using the AI SDK.
 * Provides structured output generation using LMStudio's OpenAI-compatible API.
 */
export class LMStudioClient implements AIProviderClient {
  private model: OpenAICompatibleChatLanguageModel;
  private config: LMStudioConfig;

  constructor(config: LMStudioConfig) {
    // Validate configuration
    validate_configuration(config, "lmstudio");

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
  async make_typed_output<T>(params: {
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
      validate_content(params.prompt, "lmstudio");

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
      throw map_lmstudio_error(error, "Failed to generate structured output");
    }
  }

  /**
   * Validate connection to LMStudio server.
   * @returns Promise that resolves to true if connection is successful
   */
  async probe_model_connection(): Promise<boolean> {
    return ResultAsync.fromPromise(
      (async () => {
        const response = await ky.get(`${this.config.apiUrl}/models`, {
          headers: {
            "Content-Type": "application/json",
          },
          signal: create_timeout_signal(5000),
        });
        assess_connection_response(response, "lmstudio");
      })(), (error) => map_lmstudio_error(error, "LMStudio connection validation failed"))
      .match(
        () => true,
        (error) => { throw error; }
      )
  }

  /**
   * Get list of available models from LMStudio.
   * @returns Promise with array of model names
   */
  async retrieve_available_models(): Promise<string[]> {
    return ResultAsync.fromPromise(
      (async () => {
        const response = await ky.get(`${this.config.apiUrl}/models`, {
          headers: {
            "Content-Type": "application/json",
          },
          signal: create_timeout_signal(5000),
        })
        assess_connection_response(response, "lmstudio");
        const data = (await response.json()) as {
          data?: Array<{ id: string }>;
        };

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid response format from LMStudio");
        }

        const models = data.data.map((model) => model.id);
        return models;
      })(), (error) => map_lmstudio_error(error, "Failed to get available models"))
      .match(
        (models) => models,
        (error) => { throw error; }
      );
  }
}
