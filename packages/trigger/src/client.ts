import { configure } from "@trigger.dev/sdk/v3";
import "dotenv/config";

/**
 * Trigger.dev client configuration
 * Loads configuration from environment variables and initializes the client
 */

// Validate required environment variables
const requiredEnvVars = ["TRIGGER_API_KEY", "TRIGGER_API_URL"] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}. Please check your .env file.`
    );
  }
}

// Configure Trigger.dev client
export const triggerConfig = configure({
  secretKey: process.env.TRIGGER_API_KEY!,
  baseURL: process.env.TRIGGER_API_URL!,
});

/**
 * Validates connection to Trigger.dev service
 * @returns Promise<boolean> - true if connection is successful
 * @throws Error if connection fails
 */
export async function validateConnection(): Promise<boolean> {
  try {
    // Attempt to make a simple request to verify connectivity
    const response = await fetch(
      `${process.env.TRIGGER_API_URL}/api/v1/health`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.TRIGGER_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `Trigger.dev health check failed with status: ${response.status}`
      );
    }

    console.log("✓ Trigger.dev connection validated successfully");
    return true;
  } catch (error) {
    console.error("✗ Failed to connect to Trigger.dev:", error);
    throw new Error(
      `Trigger.dev connection validation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Gets the current Trigger.dev configuration
 */
export function getConfig() {
  return {
    apiUrl: process.env.TRIGGER_API_URL,
    isConfigured: !!(
      process.env.TRIGGER_API_KEY && process.env.TRIGGER_API_URL
    ),
  };
}
