import type { ISummarizationService, ProviderConfig } from "./types";
import { AIServiceError, AIErrorCode } from "./types";
import {
  detect_provider,
  get_provider_config,
  should_validate_on_startup,
  is_strict_mode,
} from "./config";
import { LMStudioClient } from "./providers/lmstudio/lmstudio-client";
import { OllamaClient } from "./providers/ollama/ollama-client";
import { UnifiedSummarizationService } from "./services/unified-summarization";
import { DictAiProvider, type TAiProvider } from "@favy/shared";

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
export async function make_summarization_service(
  overrideConfig?: Partial<ProviderConfig>
): Promise<ISummarizationService> {
  // Step 1: Detect provider
  const provider: TAiProvider = overrideConfig?.provider ?? detect_provider();

  console.log(`[Factory] Detected provider: ${provider}`);

  const baseConfig = get_provider_config(provider);
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

  let client;
  if (config.provider === DictAiProvider.LMSTUDIO) {
    client = new LMStudioClient(config);
  } else if (config.provider === DictAiProvider.OLLAMA) {
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

  const shouldValidate = should_validate_on_startup();
  const strictMode = is_strict_mode();

  if (shouldValidate) {
    console.log(
      `[Factory] Validating connection (strict mode: ${strictMode})...`
    );

    try {
      await client.probe_model_connection();
      const models = await client.retrieve_available_models();
      console.log(
        `[Factory] Available models (${models.length}):`,
        models.slice(0, 5)
      );

      if (!models.includes(config.model)) {
        const message = `Configured model "${config.model
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
        console.warn(
          `[Factory] Continuing despite validation failure (strict mode disabled)`
        );
      }
    }
  } else {
    console.log(`[Factory] Connection validation disabled`);
  }

  const service = new UnifiedSummarizationService(client, config);
  console.log(
    `[Factory] ✓ SummarizationService created successfully with ${config.provider}`
  );

  return service;
}
