/**
 * Type definitions for Restate workflow package
 * Re-exports shared types from @favy/shared/workflow
 */

export * from "@favy/shared";

/**
 * Restate-specific configuration types
 */

export interface RestateConfig {
	ingressUrl: string;
	adminUrl: string;
}

export interface RestateServiceConfig {
	port: number;
	ingressUrl: string;
	adminUrl: string;
}

export interface RestateEnvironmentConfig {
	ingressUrl: string;
	adminUrl: string;
	servicePort: number;
	databaseUrl: string;
	enableAiSummarization: boolean;
	enableMediaDownload: boolean;
	maxMediaSizeMb: number;
}
