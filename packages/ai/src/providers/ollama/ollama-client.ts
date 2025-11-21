import { createOllama } from "ollama-ai-provider-v2";
import type { LanguageModelV2 } from '@ai-sdk/provider';
import { generateObject } from "ai";
import { ResultAsync } from "neverthrow";
import type { z } from "zod";
import ky from "ky";

import type { AIProviderClient } from "../interface";
import type { OllamaConfig } from "../../types";
import { map_ollama_error } from "./ollama-error-mapper";
import {
  validate_content,
  validate_configuration,
  create_timeout_signal,
  assess_connection_response,
} from "../validation";

/**
 * Ollama API response format for /api/tags endpoint
 */
interface IOllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: Record<string, any>;
}

interface IOllamaTagsResponse {
  models: Array<IOllamaModel>;
}

/**
 * Ollama client implementation using the AI SDK.
 * Provides structured output generation using Ollama's JSON mode.
 * Supports both local and cloud-hosted Ollama instances.
 */
export class OllamaClient implements AIProviderClient {
  private config: OllamaConfig;
  private model: LanguageModelV2;

  constructor(config: OllamaConfig) {
    // Validate configuration
    validate_configuration(config, "ollama");

    this.config = config;
    // create Ollama provider with custom base URL (supports both local and cloud)
    // use OpenAI-compatible endpoint for structured outputs
    const baseURL = this.config.apiUrl;
    const ollama = createOllama({
      baseURL,
    });

    this.model = ollama(this.config.model);
  }

  /**
   * Generate structured output using the AI SDK with Ollama provider.
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
    return ResultAsync.fromPromise((async () => {
      validate_content(params.prompt, "ollama");
      const result = await generateObject({
        model: this.model,
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

    })(),
      (error) => { throw map_ollama_error(error, "Failed to generate structured output") }
    ).match(
      (result) => result,
      (error) => { throw error; }
    )
  }

  /**
   * Validate connection to Ollama server using /api/tags endpoint.
   * @returns Promise that resolves to true if connection is successful
   */
  async probe_model_connection(): Promise<boolean> {
    return ResultAsync.fromPromise(
      (async () => {
        const response = await ky.get(`${this.config.apiUrl}/version`, {
          headers: { "Content-Type": "application/json", },
          signal: create_timeout_signal(5000),
        });
        assess_connection_response(response, "ollama");
      })(), (error) => map_ollama_error(error, "LMStudio connection validation failed"))
      .match(
        () => true,
        (error) => { throw error; }
      )
  }

  /**
   * Get list of available models from Ollama using /api/tags endpoint.
   * @returns Promise with array of model names
   */
  async retrieve_available_models(): Promise<string[]> {
    return ResultAsync.fromPromise(
      (async () => {
        const response = await ky.get(`${this.config.apiUrl}/tags`, {
          headers: { "Content-Type": "application/json", },
          signal: create_timeout_signal(5000),
        })
        assess_connection_response(response, "ollama");
        const data = (await response.json()) as IOllamaTagsResponse;

        if (!data.models || !Array.isArray(data.models)) {
          throw new Error("Invalid response format from Ollama");
        }

        const models = data.models.map((model) => model.name);
        return models;
      })(), (error) => map_ollama_error(error, "Failed to get available models"))
      .match(
        (models) => models,
        (error) => { throw error; }
      );
  }

}
