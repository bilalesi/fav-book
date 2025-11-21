/**
 * Feature Flags Configuration
 * Centralized feature flag management for the background processing pipeline
 */

/**
 * Feature flags interface defining all available feature toggles
 */
export interface IFeatureFlags {
  /** Enable/disable AI-powered content summarization */
  ENABLE_AI_SUMMARIZATION: boolean;
  /** Enable/disable media download functionality */
  ENABLE_MEDIA_DOWNLOAD: boolean;
  /** Maximum media file size in megabytes */
  MAX_MEDIA_SIZE_MB: number;
  /** Maximum summary length in words */
  MAX_SUMMARY_LENGTH: number;
  /** Maximum number of workflow retry attempts */
  WORKFLOW_RETRY_ATTEMPTS: number;
  /** Initial retry delay in milliseconds */
  WORKFLOW_RETRY_DELAY_MS: number;
}

/**
 * Default feature flag values
 */
export const DEFAULT_FEATURE_FLAGS: IFeatureFlags = {
  ENABLE_AI_SUMMARIZATION: true,
  ENABLE_MEDIA_DOWNLOAD: true,
  MAX_MEDIA_SIZE_MB: 500,
  MAX_SUMMARY_LENGTH: 1000,
  WORKFLOW_RETRY_ATTEMPTS: 3,
  WORKFLOW_RETRY_DELAY_MS: 5000,
} as const;

/**
 * Feature flag names for type-safe access
 */
export type TFeatureFlagName = keyof IFeatureFlags;

/**
 * Validation rules for feature flags
 */
const VALIDATION_RULES: Record<
  TFeatureFlagName,
  (value: any) => { valid: boolean; error?: string }
> = {
  ENABLE_AI_SUMMARIZATION: (value) => ({
    valid: typeof value === "boolean",
    error: "ENABLE_AI_SUMMARIZATION must be a boolean",
  }),
  ENABLE_MEDIA_DOWNLOAD: (value) => ({
    valid: typeof value === "boolean",
    error: "ENABLE_MEDIA_DOWNLOAD must be a boolean",
  }),
  MAX_MEDIA_SIZE_MB: (value) => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return {
        valid: false,
        error: "MAX_MEDIA_SIZE_MB must be a positive number",
      };
    }
    if (num > 5000) {
      return {
        valid: false,
        error: "MAX_MEDIA_SIZE_MB cannot exceed 5000 MB",
      };
    }
    return { valid: true };
  },
  MAX_SUMMARY_LENGTH: (value) => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return {
        valid: false,
        error: "MAX_SUMMARY_LENGTH must be a positive number",
      };
    }
    if (num > 2000) {
      return {
        valid: false,
        error: "MAX_SUMMARY_LENGTH cannot exceed 2000 words",
      };
    }
    return { valid: true };
  },
  WORKFLOW_RETRY_ATTEMPTS: (value) => {
    const num = Number(value);
    if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
      return {
        valid: false,
        error: "WORKFLOW_RETRY_ATTEMPTS must be a non-negative integer",
      };
    }
    if (num > 10) {
      return {
        valid: false,
        error: "WORKFLOW_RETRY_ATTEMPTS cannot exceed 10",
      };
    }
    return { valid: true };
  },
  WORKFLOW_RETRY_DELAY_MS: (value) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      return {
        valid: false,
        error: "WORKFLOW_RETRY_DELAY_MS must be a non-negative number",
      };
    }
    if (num > 60000) {
      return {
        valid: false,
        error: "WORKFLOW_RETRY_DELAY_MS cannot exceed 60000 ms (1 minute)",
      };
    }
    return { valid: true };
  },
};

/**
 * Validates a feature flag value
 * @param name - Feature flag name
 * @param value - Value to validate
 * @returns Validation result with error message if invalid
 */
export function validate_feature_flag(
  name: TFeatureFlagName,
  value: any
): { valid: boolean; error?: string } {
  const validator = VALIDATION_RULES[name];
  if (!validator) {
    return { valid: false, error: `Unknown feature flag: ${name}` };
  }
  return validator(value);
}

/**
 * Validates all feature flags
 * @param flags - Feature flags object to validate
 * @returns Array of validation errors (empty if all valid)
 */
export function validateFeatureFlags(
  flags: Partial<IFeatureFlags>
): Array<{ flag: string; error: string }> {
  const errors: Array<{ flag: string; error: string }> = [];

  for (const [key, value] of Object.entries(flags)) {
    const result = validate_feature_flag(key as TFeatureFlagName, value);
    if (!result.valid && result.error) {
      errors.push({ flag: key, error: result.error });
    }
  }

  return errors;
}

/**
 * Parses environment variable value to appropriate type
 */
function parseEnvValue(key: TFeatureFlagName, value: string | undefined): any {
  if (value === undefined) {
    return DEFAULT_FEATURE_FLAGS[key];
  }

  // Boolean flags
  if (key === "ENABLE_AI_SUMMARIZATION" || key === "ENABLE_MEDIA_DOWNLOAD") {
    return value.toLowerCase() === "true" || value === "1";
  }

  // Numeric flags
  const num = Number(value);
  if (isNaN(num)) {
    console.warn(
      `Invalid value for ${key}: "${value}". Using default: ${DEFAULT_FEATURE_FLAGS[key]}`
    );
    return DEFAULT_FEATURE_FLAGS[key];
  }

  return num;
}

/**
 * Loads feature flags from environment variables
 * Falls back to default values if not set or invalid
 * @returns Complete feature flags configuration
 */
export function loadFeatureFlagsFromEnv(): IFeatureFlags {
  const flags: IFeatureFlags = {
    ENABLE_AI_SUMMARIZATION: parseEnvValue(
      "ENABLE_AI_SUMMARIZATION",
      process.env.ENABLE_AI_SUMMARIZATION
    ),
    ENABLE_MEDIA_DOWNLOAD: parseEnvValue(
      "ENABLE_MEDIA_DOWNLOAD",
      process.env.ENABLE_MEDIA_DOWNLOAD
    ),
    MAX_MEDIA_SIZE_MB: parseEnvValue(
      "MAX_MEDIA_SIZE_MB",
      process.env.MAX_MEDIA_SIZE_MB
    ),
    MAX_SUMMARY_LENGTH: parseEnvValue(
      "MAX_SUMMARY_LENGTH",
      process.env.MAX_SUMMARY_LENGTH
    ),
    WORKFLOW_RETRY_ATTEMPTS: parseEnvValue(
      "WORKFLOW_RETRY_ATTEMPTS",
      process.env.WORKFLOW_RETRY_ATTEMPTS
    ),
    WORKFLOW_RETRY_DELAY_MS: parseEnvValue(
      "WORKFLOW_RETRY_DELAY_MS",
      process.env.WORKFLOW_RETRY_DELAY_MS
    ),
  };

  // Validate loaded flags
  const errors = validateFeatureFlags(flags);
  if (errors.length > 0) {
    console.error("Feature flag validation errors:");
    errors.forEach(({ flag, error }) => {
      console.error(`  - ${flag}: ${error}`);
    });
    throw new Error(
      `Invalid feature flag configuration: ${errors
        .map((e) => e.flag)
        .join(", ")}`
    );
  }

  return flags;
}

/**
 * In-memory feature flags cache
 * Loaded once at startup and can be updated at runtime
 */
let featureFlagsCache: IFeatureFlags | null = null;

/**
 * Gets the current feature flags configuration
 * Loads from environment on first call, then returns cached value
 * @returns Current feature flags
 */
export function getFeatureFlags(): IFeatureFlags {
  if (!featureFlagsCache) {
    featureFlagsCache = loadFeatureFlagsFromEnv();
  }
  return { ...featureFlagsCache };
}

/**
 * Gets a specific feature flag value
 * @param name - Feature flag name
 * @returns Feature flag value
 */
export function getFeatureFlag<K extends TFeatureFlagName>(
  name: K
): IFeatureFlags[K] {
  const flags = getFeatureFlags();
  return flags[name];
}

/**
 * Updates feature flags at runtime
 * Validates new values before applying
 * @param updates - Partial feature flags to update
 * @throws Error if validation fails
 */
export function updateFeatureFlags(updates: Partial<IFeatureFlags>): void {
  const errors = validateFeatureFlags(updates);
  if (errors.length > 0) {
    throw new Error(
      `Invalid feature flag values: ${errors
        .map((e) => `${e.flag} - ${e.error}`)
        .join(", ")}`
    );
  }

  const currentFlags = getFeatureFlags();
  featureFlagsCache = {
    ...currentFlags,
    ...updates,
  };

  console.log("Feature flags updated:", updates);
}

/**
 * Resets feature flags to default values
 */
export function resetFeatureFlags(): void {
  featureFlagsCache = { ...DEFAULT_FEATURE_FLAGS };
  console.log("Feature flags reset to defaults");
}

/**
 * Reloads feature flags from environment variables
 * Useful for picking up configuration changes
 */
export function reloadFeatureFlags(): void {
  featureFlagsCache = loadFeatureFlagsFromEnv();
  console.log("Feature flags reloaded from environment");
}
