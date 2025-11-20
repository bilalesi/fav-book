import { OpenAICompatibleChatLanguageModel } from "@ai-sdk/openai-compatible";
import type { LMStudioConfig } from "./types";
import { AIServiceError, AIErrorCode } from "./types";
import { getLMStudioConfig } from "./config";

export function createLMStudioClient(config?: Partial<LMStudioConfig>) {
  const fullConfig = {
    ...getLMStudioConfig(),
    ...config,
  };

  const model = new OpenAICompatibleChatLanguageModel(
    process.env.LM_STUDIO_MODEL || "llama-3.2-3b-instruct",
    {
      provider: `lmstudio.chat`,
      url: ({ path }) => {
        const url = new URL(`${fullConfig.apiUrl}${path}`);
        return url.toString();
      },
      headers: () => ({}),
      supportsStructuredOutputs: true,
    }
  );

  return model;
}

export async function validateLMStudioConnection(
  config?: Partial<LMStudioConfig>
): Promise<boolean> {
  try {
    const fullConfig = {
      ...getLMStudioConfig(),
      ...config,
    };

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

    const data = (await response.json()) as {
      data?: Array<{ id: string }>;
    };

    // Check if the configured model is available
    if (data.data && Array.isArray(data.data)) {
      const modelExists = data.data.some(
        (model) => model.id === fullConfig.model
      );

      if (!modelExists) {
        console.warn(
          `Configured model "${fullConfig.model}" not found in LM Studio. Available models:`,
          data.data.map((m) => m.id)
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Failed to validate LM Studio connection:", error);
    return false;
  }
}

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
 * Map error to appropriate AIErrorCode
 */
export function mapErrorToCode(error: unknown): AIErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes("econnrefused")) {
      return AIErrorCode.CONNECTION_REFUSED;
    }
    if (message.includes("timeout")) {
      return AIErrorCode.TIMEOUT_ERROR;
    }
    if (message.includes("network") || message.includes("enotfound")) {
      return AIErrorCode.NETWORK_ERROR;
    }

    // Service errors
    if (message.includes("503") || message.includes("unavailable")) {
      return AIErrorCode.SERVICE_UNAVAILABLE;
    }
    if (message.includes("429") || message.includes("rate limit")) {
      return AIErrorCode.RATE_LIMIT_EXCEEDED;
    }

    // Configuration errors
    if (message.includes("model") && message.includes("not found")) {
      return AIErrorCode.MODEL_NOT_FOUND;
    }
    if (message.includes("invalid") && message.includes("configuration")) {
      return AIErrorCode.INVALID_CONFIGURATION;
    }

    // Input errors
    if (message.includes("empty") || message.includes("invalid input")) {
      return AIErrorCode.INVALID_INPUT;
    }
    if (message.includes("too long") || message.includes("content length")) {
      return AIErrorCode.CONTENT_TOO_LONG;
    }

    // Response errors
    if (message.includes("schema") || message.includes("validation")) {
      return AIErrorCode.SCHEMA_VALIDATION_FAILED;
    }
    if (message.includes("invalid response") || message.includes("parse")) {
      return AIErrorCode.INVALID_RESPONSE;
    }
  }

  // Default to network error for unknown errors
  return AIErrorCode.NETWORK_ERROR;
}

export function createAIServiceError(
  error: unknown,
  context: string,
  provider?: "lmstudio" | "ollama"
): AIServiceError {
  const message =
    error instanceof Error ? error.message : "Unknown error occurred";
  const retryable = isRetryableError(error);
  const code = mapErrorToCode(error);

  return new AIServiceError(
    `${context}: ${message}`,
    code,
    retryable,
    provider
  );
}
