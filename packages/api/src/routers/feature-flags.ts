import { protectedProcedure } from "../index";
import { z } from "zod";
import {
  getFeatureFlags,
  updateFeatureFlags,
  validateFeatureFlags,
  type FeatureFlags,
} from "@my-better-t-app/shared";

/**
 * Admin email addresses that can modify feature flags
 * In production, this should be moved to environment variables or database
 */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .filter(Boolean);

/**
 * Checks if a user is an admin
 */
function isAdmin(email: string): boolean {
  if (ADMIN_EMAILS.length === 0) {
    // If no admin emails configured, allow all users (development mode)
    console.warn(
      "No ADMIN_EMAILS configured. All users can modify feature flags."
    );
    return true;
  }
  return ADMIN_EMAILS.includes(email);
}

/**
 * Feature flags router
 * Provides endpoints to view and manage feature flags
 */
export const featureFlagsRouter = {
  /**
   * Get current feature flags
   * Available to all authenticated users
   */
  getFlags: protectedProcedure.handler(() => {
    const flags = getFeatureFlags();
    return {
      flags,
      timestamp: new Date().toISOString(),
    };
  }),

  /**
   * Update feature flags
   * Restricted to admin users only
   */
  updateFlags: protectedProcedure
    .input(
      z.object({
        ENABLE_AI_SUMMARIZATION: z.boolean().optional(),
        ENABLE_MEDIA_DOWNLOAD: z.boolean().optional(),
        MAX_MEDIA_SIZE_MB: z.number().positive().max(5000).optional(),
        MAX_SUMMARY_LENGTH: z.number().positive().max(2000).optional(),
        WORKFLOW_RETRY_ATTEMPTS: z.number().int().min(0).max(10).optional(),
        WORKFLOW_RETRY_DELAY_MS: z.number().min(0).max(60000).optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const userEmail = context.session.user.email;

      // Check if user is admin
      if (!isAdmin(userEmail)) {
        throw new Error(
          "Unauthorized: Only administrators can modify feature flags"
        );
      }

      // Validate the input
      const validationErrors = validateFeatureFlags(
        input as Partial<FeatureFlags>
      );
      if (validationErrors.length > 0) {
        throw new Error(
          `Invalid feature flag values: ${validationErrors
            .map((e) => `${e.flag} - ${e.error}`)
            .join(", ")}`
        );
      }

      // Update the flags
      try {
        updateFeatureFlags(input as Partial<FeatureFlags>);

        const updatedFlags = getFeatureFlags();

        // Log the change for audit purposes
        console.log("Feature flags updated", {
          updatedBy: userEmail,
          userId: context.session.user.id,
          changes: input,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          flags: updatedFlags,
          message: "Feature flags updated successfully",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        const err = error as Error;
        console.error("Failed to update feature flags", {
          error: err.message,
          updatedBy: userEmail,
          changes: input,
        });

        throw new Error(`Failed to update feature flags: ${err.message}`);
      }
    }),

  /**
   * Get a specific feature flag value
   * Available to all authenticated users
   */
  getFlag: protectedProcedure
    .input(
      z.object({
        name: z.enum([
          "ENABLE_AI_SUMMARIZATION",
          "ENABLE_MEDIA_DOWNLOAD",
          "MAX_MEDIA_SIZE_MB",
          "MAX_SUMMARY_LENGTH",
          "WORKFLOW_RETRY_ATTEMPTS",
          "WORKFLOW_RETRY_DELAY_MS",
        ]),
      })
    )
    .handler(({ input }) => {
      const flags = getFeatureFlags();
      return {
        name: input.name,
        value: flags[input.name],
        timestamp: new Date().toISOString(),
      };
    }),

  /**
   * Check if current user is an admin
   * Useful for UI to show/hide admin features
   */
  isAdmin: protectedProcedure.handler(({ context }) => {
    const userEmail = context.session.user.email;
    return {
      isAdmin: isAdmin(userEmail),
      email: userEmail,
    };
  }),
};
