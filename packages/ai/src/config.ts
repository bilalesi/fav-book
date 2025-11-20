import type {
  AIProvider,
  LMStudioConfig,
  OllamaConfig,
  ProviderConfig,
} from "./types";
import { AIErrorCode, AIServiceError } from "./types";

/**
 * Environment variable definitions and defaults
 */

// Provider selection
const DEFAULT_PROVIDER: AIProvider = "ollama";

// LMStudio defaults
const DEFAULT_LM_STUDIO_API_URL = "http://localhost:1234/v1";
const DEFAULT_LM_STUDIO_MODEL = "llama-3.2-3b-instruct";
const DEFAULT_LM_STUDIO_MAX_TOKENS = 1000;
const DEFAULT_LM_STUDIO_TEMPERATURE = 0.7;

// Ollama defaults
const DEFAULT_OLLAMA_API_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";
const DEFAULT_OLLAMA_MAX_TOKENS = 1000;
const DEFAULT_OLLAMA_TEMPERATURE = 0.7;

// Validation settings
const DEFAULT_VALIDATE_ON_STARTUP = true;
const DEFAULT_STRICT_MODE = false;

/**
 * Detect which provider to use from environment variables
 */
export function detectProvider(): AIProvider {
  const providerEnv = process.env.AI_PROVIDER?.toLowerCase();

  if (!providerEnv) {
    return DEFAULT_PROVIDER;
  }

  if (providerEnv === "lmstudio" || providerEnv === "ollama") {
    return providerEnv;
  }

  throw new AIServiceError(
    `Invalid AI_PROVIDER value: "${providerEnv}". Valid options are: "lmstudio", "ollama"`,
    AIErrorCode.INVALID_PROVIDER,
    false
  );
}

/**
 * Get LMStudio configuration from environment variables
 */
export function getLMStudioConfig(): LMStudioConfig {
  const apiUrl = process.env.LM_STUDIO_API_URL || DEFAULT_LM_STUDIO_API_URL;
  const model = process.env.LM_STUDIO_MODEL || DEFAULT_LM_STUDIO_MODEL;

  let maxTokens = DEFAULT_LM_STUDIO_MAX_TOKENS;
  if (process.env.LM_STUDIO_MAX_TOKENS) {
    const parsed = parseInt(process.env.LM_STUDIO_MAX_TOKENS, 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.warn(
        `Invalid LM_STUDIO_MAX_TOKENS value: "${process.env.LM_STUDIO_MAX_TOKENS}". Using default: ${DEFAULT_LM_STUDIO_MAX_TOKENS}`
      );
    } else {
      maxTokens = parsed;
    }
  }

  let temperature = DEFAULT_LM_STUDIO_TEMPERATURE;
  if (process.env.LM_STUDIO_TEMPERATURE) {
    const parsed = parseFloat(process.env.LM_STUDIO_TEMPERATURE);
    if (isNaN(parsed) || parsed < 0 || parsed > 2) {
      console.warn(
        `Invalid LM_STUDIO_TEMPERATURE value: "${process.env.LM_STUDIO_TEMPERATURE}". Using default: ${DEFAULT_LM_STUDIO_TEMPERATURE}`
      );
    } else {
      temperature = parsed;
    }
  }

  return {
    provider: "lmstudio",
    apiUrl,
    model,
    maxTokens,
    temperature,
  };
}

/**
 * Get Ollama configuration from environment variables
 */
export function getOllamaConfig(): OllamaConfig {
  const apiUrl = process.env.OLLAMA_API_URL || DEFAULT_OLLAMA_API_URL;
  const model = process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;

  let maxTokens = DEFAULT_OLLAMA_MAX_TOKENS;
  if (process.env.OLLAMA_MAX_TOKENS) {
    const parsed = parseInt(process.env.OLLAMA_MAX_TOKENS, 10);
    if (isNaN(parsed) || parsed <= 0) {
      console.warn(
        `Invalid OLLAMA_MAX_TOKENS value: "${process.env.OLLAMA_MAX_TOKENS}". Using default: ${DEFAULT_OLLAMA_MAX_TOKENS}`
      );
    } else {
      maxTokens = parsed;
    }
  }

  let temperature = DEFAULT_OLLAMA_TEMPERATURE;
  if (process.env.OLLAMA_TEMPERATURE) {
    const parsed = parseFloat(process.env.OLLAMA_TEMPERATURE);
    if (isNaN(parsed) || parsed < 0 || parsed > 2) {
      console.warn(
        `Invalid OLLAMA_TEMPERATURE value: "${process.env.OLLAMA_TEMPERATURE}". Using default: ${DEFAULT_OLLAMA_TEMPERATURE}`
      );
    } else {
      temperature = parsed;
    }
  }

  return {
    provider: "ollama",
    apiUrl,
    model,
    maxTokens,
    temperature,
    format: "json",
  };
}

/**
 * Get provider configuration based on provider type
 */
export function getProviderConfig(provider: AIProvider): ProviderConfig {
  switch (provider) {
    case "lmstudio":
      return getLMStudioConfig();
    case "ollama":
      return getOllamaConfig();
    default:
      throw new AIServiceError(
        `Unknown provider: ${provider}`,
        AIErrorCode.INVALID_PROVIDER,
        false
      );
  }
}

/**
 * Check if validation should run on startup
 */
export function shouldValidateOnStartup(): boolean {
  const envValue = process.env.AI_PROVIDER_VALIDATE_ON_STARTUP;
  if (envValue === undefined) {
    return DEFAULT_VALIDATE_ON_STARTUP;
  }
  return envValue.toLowerCase() === "true";
}

/**
 * Check if strict mode is enabled (fail on validation errors)
 */
export function isStrictMode(): boolean {
  const envValue = process.env.AI_PROVIDER_STRICT_MODE;
  if (envValue === undefined) {
    return DEFAULT_STRICT_MODE;
  }
  return envValue.toLowerCase() === "true";
}
