import type { z } from "zod";

/**
 * Abstract interface for AI provider clients.
 * All provider implementations (LMStudio, Ollama) must implement this interface.
 */
export interface AIProviderClient {
  /**
   * Generate structured output from the AI model using a Zod schema.
   * @param params - Parameters for structured output generation
   * @returns Promise with the generated object and usage statistics
   */
  generateStructuredOutput<T>(params: {
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
  }>;

  /**
   * Validate connection to the provider.
   * @returns Promise that resolves to true if connection is successful
   */
  validateConnection(): Promise<boolean>;

  /**
   * Get list of available models from the provider.
   * @returns Promise with array of model names
   */
  getAvailableModels(): Promise<string[]>;
}
