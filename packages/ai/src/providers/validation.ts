import type { TAiProvider } from "@favy/shared";
import { AIServiceError, AIErrorCode } from "../types";

/**
 * Validate that content is not empty.
 * @param content - The content to validate
 * @param provider - The provider context for error reporting
 * @throws AIServiceError if content is empty
 */
export function validate_content(content: string, provider?: TAiProvider): void {
  if (!content || content.trim().length === 0) {
    throw new AIServiceError(
      "Content cannot be empty",
      AIErrorCode.INVALID_INPUT,
      false,
      provider
    );
  }
}

/**
 * Validate and truncate content if it exceeds maximum length.
 * @param content - The content to validate and truncate
 * @param maxLength - Maximum allowed length (default: 10000)
 * @returns Truncated content if necessary
 */
export function validate_truncate_content(
  content: string,
  maxLength: number = 10000
): string {
  if (content.length > maxLength) {
    return content.substring(0, maxLength) + "...";
  }
  return content;
}

/**
 * Validate that a model name is in the list of available models.
 * @param modelName - The model to check
 * @param availableModels - List of available models
 * @param provider - The provider context for error reporting
 * @throws AIServiceError if model is not found
 */
export function validate_model_availability(
  modelName: string,
  availableModels: string[],
  provider?: TAiProvider
): void {
  if (!availableModels.includes(modelName)) {
    throw new AIServiceError(
      `Model "${modelName}" not found. Available models: ${availableModels.join(
        ", "
      )}`,
      AIErrorCode.MODEL_NOT_FOUND,
      false,
      provider
    );
  }
}

/**
 * Validate API URL format.
 * @param url - The URL to validate
 * @param provider - The provider context for error reporting
 * @throws AIServiceError if URL is invalid
 */
export function validate_api_url(url: string, provider?: TAiProvider): void {
  try {
    new URL(url);
  } catch (error) {
    throw new AIServiceError(
      `Invalid API URL: ${url}`,
      AIErrorCode.INVALID_CONFIGURATION,
      false,
      provider
    );
  }
}

/**
 * Validate configuration parameters.
 * @param config - Configuration object to validate
 * @param provider - The provider context for error reporting
 * @throws AIServiceError if configuration is invalid
 */
export function validate_configuration(
  config: {
    apiUrl?: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  },
  provider?: TAiProvider
): void {
  if (config.apiUrl) {
    validate_api_url(config.apiUrl, provider);
  }

  if (config.model !== undefined && config.model.trim().length === 0) {
    throw new AIServiceError(
      "Model name cannot be empty",
      AIErrorCode.INVALID_CONFIGURATION,
      false,
      provider
    );
  }

  if (config.maxTokens !== undefined && config.maxTokens <= 0) {
    throw new AIServiceError(
      "maxTokens must be greater than 0",
      AIErrorCode.INVALID_CONFIGURATION,
      false,
      provider
    );
  }

  if (
    config.temperature !== undefined &&
    (config.temperature < 0 || config.temperature > 2)
  ) {
    throw new AIServiceError(
      "temperature must be between 0 and 2",
      AIErrorCode.INVALID_CONFIGURATION,
      false,
      provider
    );
  }
}

/**
 * Create a timeout signal for fetch requests.
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns AbortSignal that will timeout after the specified duration
 */
export function create_timeout_signal(timeoutMs: number = 5000): AbortSignal {
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Validate connection response from provider.
 * @param response - Fetch response object
 * @param provider - The provider context for error reporting
 * @returns true if connection is valid
 * @throws AIServiceError if connection fails
 */
export function assess_connection_response(
  response: Response,
  provider?: TAiProvider
): boolean {
  if (!response.ok) {
    const errorMessage = `Connection failed: ${response.status} ${response.statusText}`;

    if (response.status === 503) {
      throw new AIServiceError(
        errorMessage,
        AIErrorCode.SERVICE_UNAVAILABLE,
        true,
        provider
      );
    }

    if (response.status === 404) {
      throw new AIServiceError(
        errorMessage,
        AIErrorCode.MODEL_NOT_FOUND,
        false,
        provider
      );
    }

    throw new AIServiceError(
      errorMessage,
      AIErrorCode.NETWORK_ERROR,
      true,
      provider
    );
  }

  return true;
}
