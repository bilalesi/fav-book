import type { SummarizationService, AIProvider, ProviderConfig } from "./types";
import { AIServiceError, AIErrorCode } from "./types";
import {
  detectProvider,
  getProviderConfig,
  shouldValidateOnStartup,
  isStrictMode,
} from "./config";
import { LMStudioClient } from "./providers/lmstudio-client";
import { OllamaClient } from "./providers/ollama-client";
import { UnifiedSummarizationService } from "./services/unified-summarization";

/**
 * Create a summarization service with the appropriate provider based on environment configuration.
 * This factory function handles:
 * - Provider detection from AI_PROVIDER environment variable
 * - Configuration loading and validation
 * - Client instantiation
 * - Optional connection validation
 *
 * @param overrideConfig - Optional configuration to override environment variables
 * @returns A configured SummarizationService instance
 * @throws AIServiceError if provider is invalid or connection validation fails in strict mode
 *
 * @example
 * ```typescript
 * // Use environment configuration
 * const service = await createSummarizationService();
 *
 * // Override with custom configuration
 * const service = await createSummarizationService({
 *   provider: "ollama",
 *   apiUrl: "http://localhost:11434",
 *   model: "llama3.2:3b",
 *   maxTokens: 2000,
 *   temperature: 0.8,
 *   format: "json"
 * });
 * ```
 */
export async function createSummarizationService(
  overrideConfig?: Partial<ProviderConfig>
): Promise<SummarizationService> {
  // Step 1: Detect provider
  const provider: AIProvider = overrideConfig?.provider ?? detectProvider();

  console.log(`[Factory] Detected provider: ${provider}`);

  // Step 2: Load configuration
  const baseConfig = getProviderConfig(provider);
  const config: ProviderConfig = overrideConfig
    ? { ...baseConfig, ...overrideConfig }
    : baseConfig;

  console.log(`[Factory] Configuration loaded:`, {
    provider: config.provider,
    apiUrl: config.apiUrl,
    model: config.model,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  });

  // Step 3: Instantiate the appropriate client
  let client;
  if (config.provider === "lmstudio") {
    client = new LMStudioClient(config);
  } else if (config.provider === "ollama") {
    client = new OllamaClient(config);
  } else {
    // This should never happen due to type checking, but handle it anyway
    throw new AIServiceError(
      `Unknown provider: ${(config as any).provider}`,
      AIErrorCode.INVALID_PROVIDER,
      false
    );
  }

  console.log(`[Factory] Client instantiated: ${config.provider}`);

  // Step 4: Validate connection (if enabled)
  const shouldValidate = shouldValidateOnStartup();
  const strictMode = isStrictMode();

  if (shouldValidate) {
    console.log(
      `[Factory] Validating connection (strict mode: ${strictMode})...`
    );

    try {
      // Validate connection
      await client.validateConnection();

      // Get and log available models
      const models = await client.getAvailableModels();
      console.log(
        `[Factory] Available models (${models.length}):`,
        models.slice(0, 5)
      );

      // Check if configured model is available
      if (!models.includes(config.model)) {
        const message = `Configured model "${
          config.model
        }" not found. Available models: ${models.join(", ")}`;
        console.warn(`[Factory] ${message}`);

        if (strictMode) {
          throw new AIServiceError(
            message,
            AIErrorCode.MODEL_NOT_FOUND,
            false,
            config.provider
          );
        }
      } else {
        console.log(`[Factory] ✓ Model "${config.model}" is available`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[Factory] Connection validation failed:`, errorMessage);

      if (strictMode) {
        // In strict mode, throw the error
        if (error instanceof AIServiceError) {
          throw error;
        }
        throw new AIServiceError(
          `Connection validation failed: ${errorMessage}`,
          AIErrorCode.SERVICE_UNAVAILABLE,
          true,
          config.provider
        );
      } else {
        // In lenient mode, log warning and continue
        console.warn(
          `[Factory] Continuing despite validation failure (strict mode disabled)`
        );
      }
    }
  } else {
    console.log(`[Factory] Connection validation disabled`);
  }

  // Step 5: Create and return the unified service
  const service = new UnifiedSummarizationService(client, config);
  console.log(
    `[Factory] ✓ SummarizationService created successfully with ${config.provider}`
  );

  return service;
}
