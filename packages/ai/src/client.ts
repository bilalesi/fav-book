import { createOpenAI } from "@ai-sdk/openai";
import type { LMStudioConfig, AIServiceError } from "./types";

/**
 * Get LM Studio configuration from environment variables
 */
export function getLMStudioConfig(): LMStudioConfig {
  return {
    apiUrl: process.env.LM_STUDIO_API_URL || "http://localhost:1234/v1",
    model: process.env.LM_STUDIO_MODEL || "llama-3.2-3b-instruct",
    maxTokens: parseInt(process.env.LM_STUDIO_MAX_TOKENS || "1000", 10),
    temperature: parseFloat(process.env.LM_STUDIO_TEMPERATURE || "0.7"),
  };
}

/**
 * Create an OpenAI-compatible client configured for LM Studio
 */
export function createLMStudioClient(config?: Partial<LMStudioConfig>) {
  const fullConfig = {
    ...getLMStudioConfig(),
    ...config,
  };

  return createOpenAI({
    baseURL: fullConfig.apiUrl,
    apiKey: "not-needed", // LM Studio doesn't require API key
  });
}

/**
 * Validate connection to LM Studio
 */
export async function validateLMStudioConnection(
  config?: Partial<LMStudioConfig>
): Promise<boolean> {
  try {
    const fullConfig = {
      ...getLMStudioConfig(),
      ...config,
    };

    // Try to fetch models endpoint to verify connection
    const response = await fetch(`${fullConfig.apiUrl}/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error(
        `LM Studio connection failed: ${response.status} ${response.statusText}`
      );
      return false;
    }

    const data = await response.json();

    // Check if the configured model is available
    if (data.data && Array.isArray(data.data)) {
      const modelExists = data.data.some(
        (model: { id: string }) => model.id === fullConfig.model
      );

      if (!modelExists) {
        console.warn(
          `Configured model "${fullConfig.model}" not found in LM Studio. Available models:`,
          data.data.map((m: { id: string }) => m.id)
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to validate LM Studio connection:", error);
    return false;
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("enotfound")
    ) {
      return true;
    }

    // Service unavailable
    if (message.includes("503") || message.includes("unavailable")) {
      return true;
    }

    // Rate limiting
    if (message.includes("429") || message.includes("rate limit")) {
      return true;
    }

    // Temporary failures
    if (message.includes("temporary") || message.includes("try again")) {
      return true;
    }
  }

  return false;
}

/**
 * Create an AIServiceError from an unknown error
 */
export function createAIServiceError(
  error: unknown,
  context: string
): AIServiceError {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  const retryable = isRetryableError(error);

  const aiError = new Error(`${context}: ${message}`) as AIServiceError & {
    code: string;
    retryable: boolean;
  };
  aiError.name = "AIServiceError";
  aiError.code = retryable ? "RETRYABLE_ERROR" : "NON_RETRYABLE_ERROR";
  aiError.retryable = retryable;

  return aiError;
}
