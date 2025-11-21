/**
 * Configuration management for Restate package
 *
 * Loads configuration from environment variables with sensible defaults
 * and validates required settings.
 */

import type { RestateEnvironmentConfig } from "../types";

/**
 * Loads Restate configuration from environment variables
 *
 * @returns Complete configuration with defaults applied
 * @throws Error if required configuration is missing
 *
 * @example
 * ```typescript
 * const config = loadConfig();
 * console.log(config.ingressUrl); // "http://localhost:8080"
 * ```
 */
export function load_config(): RestateEnvironmentConfig {
	// Load with defaults
	const config: RestateEnvironmentConfig = {
		ingressUrl: process.env.RESTATE_INGRESS_URL || "http://localhost:8080",
		adminUrl: process.env.RESTATE_ADMIN_URL || "http://localhost:9070",
		servicePort: process.env.RESTATE_SERVICE_PORT
			? Number.parseInt(process.env.RESTATE_SERVICE_PORT, 10)
			: 9080,
		databaseUrl: process.env.DATABASE_URL || "",
		enableAiSummarization: process.env.ENABLE_AI_SUMMARIZATION !== "false",
		enableMediaDownload: process.env.ENABLE_MEDIA_DOWNLOAD !== "false",
		maxMediaSizeMb: process.env.MAX_MEDIA_SIZE_MB
			? Number.parseInt(process.env.MAX_MEDIA_SIZE_MB, 10)
			: 100,
	};

	// Validate required configuration
	validate_config(config);

	return config;
}

/**
 * Validates that required configuration is present
 *
 * @param config - Configuration to validate
 * @throws Error with clear guidance if required configuration is missing
 */
export function validate_config(config: RestateEnvironmentConfig): void {
	const errors: string[] = [];

	if (!config.ingressUrl) {
		errors.push(
			"RESTATE_INGRESS_URL is required. Set it to your Restate ingress endpoint (e.g., http://localhost:8080)",
		);
	}

	if (!config.adminUrl) {
		errors.push(
			"RESTATE_ADMIN_URL is required. Set it to your Restate admin endpoint (e.g., http://localhost:9070)",
		);
	}

	if (!config.databaseUrl) {
		errors.push(
			"DATABASE_URL is required. Set it to your PostgreSQL connection string",
		);
	}

	if (config.servicePort <= 0 || config.servicePort > 65535) {
		errors.push(
			`RESTATE_SERVICE_PORT must be between 1 and 65535, got ${config.servicePort}`,
		);
	}

	if (config.maxMediaSizeMb <= 0) {
		errors.push(
			`MAX_MEDIA_SIZE_MB must be positive, got ${config.maxMediaSizeMb}`,
		);
	}

	if (errors.length > 0) {
		throw new Error(
			`Configuration validation failed:\n${errors
				.map((e) => `  - ${e}`)
				.join("\n")}`,
		);
	}
}

/**
 * Gets a subset of config for the Restate client
 *
 * @returns Configuration for RestateWorkflowClient
 */
export function getClientConfig(): {
	ingressUrl: string;
	adminUrl: string;
} {
	const config = load_config();
	return {
		ingressUrl: config.ingressUrl,
		adminUrl: config.adminUrl,
	};
}

/**
 * Gets a subset of config for the Restate service endpoint
 *
 * @returns Configuration for Restate service
 */
export function getServiceConfig(): {
	port: number;
	ingressUrl: string;
	adminUrl: string;
} {
	const config = load_config();
	return {
		port: config.servicePort,
		ingressUrl: config.ingressUrl,
		adminUrl: config.adminUrl,
	};
}
