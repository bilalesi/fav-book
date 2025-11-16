/**
 * Error handling and classification system for bookmark enrichment workflows
 * Provides comprehensive error classification, user-friendly messages, and retry logic
 */

import { WorkflowStep, ErrorType } from "../types";

/**
 * Custom error class for workflow errors with additional context
 */
export class WorkflowError extends Error {
  constructor(
    message: string,
    public readonly errorType: ErrorType,
    public readonly step: WorkflowStep,
    public readonly retryable: boolean,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = "WorkflowError";
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      step: this.step,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error classification rules
 * Maps error patterns to error types and retry behavior
 */
const ERROR_CLASSIFICATION_RULES = [
  // Network errors - retryable
  {
    patterns: [
      /timeout/i,
      /ETIMEDOUT/i,
      /ECONNREFUSED/i,
      /ECONNRESET/i,
      /ENOTFOUND/i,
      /socket hang up/i,
      /network/i,
    ],
    type: ErrorType.NETWORK_ERROR,
    retryable: true,
  },
  // Service unavailable - retryable
  {
    patterns: [
      /503/,
      /service unavailable/i,
      /temporarily unavailable/i,
      /server error/i,
      /502/,
      /504/,
    ],
    type: ErrorType.SERVICE_UNAVAILABLE,
    retryable: true,
  },
  // Rate limiting - retryable
  {
    patterns: [/429/, /rate limit/i, /too many requests/i, /throttle/i],
    type: ErrorType.RATE_LIMIT,
    retryable: true,
  },
  // Authentication errors - not retryable
  {
    patterns: [
      /401/,
      /403/,
      /unauthorized/i,
      /forbidden/i,
      /authentication/i,
      /invalid.*key/i,
      /invalid.*token/i,
    ],
    type: ErrorType.AUTHENTICATION_FAILED,
    retryable: false,
  },
  // Not found errors - not retryable
  {
    patterns: [/404/, /not found/i, /does not exist/i, /no.*found/i],
    type: ErrorType.NOT_FOUND,
    retryable: false,
  },
  // Invalid content - not retryable
  {
    patterns: [
      /invalid/i,
      /malformed/i,
      /parse error/i,
      /syntax error/i,
      /bad request/i,
      /400/,
    ],
    type: ErrorType.INVALID_CONTENT,
    retryable: false,
  },
  // Quota exceeded - not retryable
  {
    patterns: [
      /quota/i,
      /limit exceeded/i,
      /storage.*full/i,
      /insufficient.*space/i,
    ],
    type: ErrorType.QUOTA_EXCEEDED,
    retryable: false,
  },
  // Malformed URL - not retryable
  {
    patterns: [/invalid.*url/i, /malformed.*url/i, /url.*invalid/i],
    type: ErrorType.MALFORMED_URL,
    retryable: false,
  },
];

/**
 * Classifies an error into an ErrorType based on error message patterns
 * @param error - The error to classify
 * @returns The classified error type
 */
export function classifyError(error: Error | string): ErrorType {
  const message = typeof error === "string" ? error : error.message;

  for (const rule of ERROR_CLASSIFICATION_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(message)) {
        return rule.type;
      }
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * Determines if an error is retryable based on its type or message
 * @param error - The error to check
 * @returns True if the error should be retried
 */
export function isRetryableError(error: Error | ErrorType | string): boolean {
  // If it's already an ErrorType, check directly
  if (
    typeof error === "string" &&
    Object.values(ErrorType).includes(error as ErrorType)
  ) {
    const retryableTypes: ErrorType[] = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT,
      ErrorType.SERVICE_UNAVAILABLE,
      ErrorType.RATE_LIMIT,
    ];
    return retryableTypes.includes(error as ErrorType);
  }

  // If it's an Error object, classify it first
  if (error instanceof Error || typeof error === "string") {
    const errorType = classifyError(error);
    return isRetryableError(errorType);
  }

  return false;
}

/**
 * Creates a WorkflowError from a standard Error
 * @param error - The original error
 * @param step - The workflow step where the error occurred
 * @param context - Additional context information
 * @returns A WorkflowError instance
 */
export function createWorkflowError(
  error: Error,
  step: WorkflowStep,
  context?: Record<string, any>
): WorkflowError {
  const errorType = classifyError(error);
  const retryable = isRetryableError(errorType);

  return new WorkflowError(error.message, errorType, step, retryable, {
    ...context,
    originalError: error.name,
  });
}

/**
 * User-friendly error messages mapped to error types
 */
export const USER_FRIENDLY_ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK_ERROR]:
    "Unable to connect to the service. Please check your internet connection and try again.",
  [ErrorType.TIMEOUT]:
    "The request took too long to complete. Please try again later.",
  [ErrorType.SERVICE_UNAVAILABLE]:
    "The service is temporarily unavailable. We'll automatically retry this operation.",
  [ErrorType.RATE_LIMIT]:
    "Too many requests. Please wait a moment before trying again.",
  [ErrorType.INVALID_CONTENT]:
    "The content format is not supported or is invalid. Please check the bookmark and try again.",
  [ErrorType.AUTHENTICATION_FAILED]:
    "Authentication failed. Please check your credentials or contact support.",
  [ErrorType.NOT_FOUND]:
    "The requested content could not be found. The link may be broken or the content may have been removed.",
  [ErrorType.MALFORMED_URL]:
    "The URL is invalid or malformed. Please check the link and try again.",
  [ErrorType.QUOTA_EXCEEDED]:
    "Storage quota exceeded. Please free up space or upgrade your plan.",
  [ErrorType.UNKNOWN]:
    "An unexpected error occurred. Our team has been notified and will investigate.",
};

/**
 * Step-specific error messages for more context
 */
export const STEP_ERROR_MESSAGES: Record<
  WorkflowStep,
  Record<ErrorType, string>
> = {
  [WorkflowStep.CONTENT_RETRIEVAL]: {
    [ErrorType.NETWORK_ERROR]:
      "Unable to retrieve content from the URL. Please check your connection.",
    [ErrorType.NOT_FOUND]:
      "The content at this URL could not be found. It may have been deleted.",
    [ErrorType.TIMEOUT]:
      "Content retrieval timed out. The page may be too large or slow to load.",
    [ErrorType.INVALID_CONTENT]:
      "The content format is not supported for this platform.",
    [ErrorType.AUTHENTICATION_FAILED]:
      "Unable to access this content. It may require authentication.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "The content source is temporarily unavailable.",
    [ErrorType.RATE_LIMIT]:
      "Too many requests to this content source. Please try again later.",
    [ErrorType.MALFORMED_URL]: "The URL format is invalid.",
    [ErrorType.QUOTA_EXCEEDED]: "Content retrieval quota exceeded.",
    [ErrorType.UNKNOWN]:
      "Failed to retrieve content due to an unexpected error.",
  },
  [WorkflowStep.SUMMARIZATION]: {
    [ErrorType.NETWORK_ERROR]:
      "Unable to connect to the AI service. Please try again.",
    [ErrorType.TIMEOUT]:
      "AI summarization timed out. The content may be too long.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "The AI service is temporarily unavailable. We'll retry automatically.",
    [ErrorType.RATE_LIMIT]:
      "AI service rate limit reached. Please wait before trying again.",
    [ErrorType.INVALID_CONTENT]:
      "The content cannot be summarized. It may be too short or in an unsupported format.",
    [ErrorType.QUOTA_EXCEEDED]:
      "AI usage quota exceeded. Please upgrade your plan.",
    [ErrorType.AUTHENTICATION_FAILED]: "AI service authentication failed.",
    [ErrorType.NOT_FOUND]: "AI model not found or unavailable.",
    [ErrorType.MALFORMED_URL]: "Invalid AI service configuration.",
    [ErrorType.UNKNOWN]:
      "Failed to generate summary due to an unexpected error.",
  },
  [WorkflowStep.MEDIA_DETECTION]: {
    [ErrorType.NETWORK_ERROR]:
      "Unable to detect media. Please check your connection.",
    [ErrorType.TIMEOUT]: "Media detection timed out.",
    [ErrorType.INVALID_CONTENT]: "Unable to detect media in this content.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "Media detection service is temporarily unavailable.",
    [ErrorType.NOT_FOUND]: "No media found at this URL.",
    [ErrorType.RATE_LIMIT]: "Media detection rate limit reached.",
    [ErrorType.AUTHENTICATION_FAILED]: "Media detection authentication failed.",
    [ErrorType.MALFORMED_URL]: "Invalid URL for media detection.",
    [ErrorType.QUOTA_EXCEEDED]: "Media detection quota exceeded.",
    [ErrorType.UNKNOWN]: "Failed to detect media due to an unexpected error.",
  },
  [WorkflowStep.MEDIA_DOWNLOAD]: {
    [ErrorType.NETWORK_ERROR]:
      "Unable to download media. Please check your connection.",
    [ErrorType.TIMEOUT]: "Media download timed out. The file may be too large.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "Media download service is temporarily unavailable. We'll retry automatically.",
    [ErrorType.RATE_LIMIT]:
      "Media download rate limit reached. Please try again later.",
    [ErrorType.INVALID_CONTENT]:
      "The media format is not supported or the file is corrupted.",
    [ErrorType.QUOTA_EXCEEDED]:
      "Storage quota exceeded. Please free up space or upgrade your plan.",
    [ErrorType.NOT_FOUND]:
      "Media file not found. It may have been deleted or moved.",
    [ErrorType.AUTHENTICATION_FAILED]:
      "Unable to access media. It may require authentication.",
    [ErrorType.MALFORMED_URL]: "Invalid media URL.",
    [ErrorType.UNKNOWN]: "Failed to download media due to an unexpected error.",
  },
  [WorkflowStep.STORAGE_UPLOAD]: {
    [ErrorType.NETWORK_ERROR]:
      "Unable to upload media to storage. Please check your connection.",
    [ErrorType.TIMEOUT]: "Storage upload timed out. The file may be too large.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "Storage service is temporarily unavailable. We'll retry automatically.",
    [ErrorType.QUOTA_EXCEEDED]:
      "Storage quota exceeded. Please free up space or upgrade your plan.",
    [ErrorType.AUTHENTICATION_FAILED]:
      "Storage authentication failed. Please check your credentials.",
    [ErrorType.INVALID_CONTENT]: "Invalid file format for storage.",
    [ErrorType.RATE_LIMIT]: "Storage upload rate limit reached.",
    [ErrorType.NOT_FOUND]: "Storage bucket not found.",
    [ErrorType.MALFORMED_URL]: "Invalid storage configuration.",
    [ErrorType.UNKNOWN]:
      "Failed to upload to storage due to an unexpected error.",
  },
  [WorkflowStep.DATABASE_UPDATE]: {
    [ErrorType.NETWORK_ERROR]:
      "Unable to save enrichment data. Please check your connection.",
    [ErrorType.TIMEOUT]: "Database operation timed out. Please try again.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "Database is temporarily unavailable. We'll retry automatically.",
    [ErrorType.INVALID_CONTENT]: "Invalid data format for database.",
    [ErrorType.QUOTA_EXCEEDED]: "Database storage quota exceeded.",
    [ErrorType.AUTHENTICATION_FAILED]: "Database authentication failed.",
    [ErrorType.NOT_FOUND]: "Bookmark not found in database.",
    [ErrorType.RATE_LIMIT]: "Database rate limit reached.",
    [ErrorType.MALFORMED_URL]: "Invalid database configuration.",
    [ErrorType.UNKNOWN]: "Failed to save data due to an unexpected error.",
  },
};

/**
 * Gets a user-friendly error message for a specific error and step
 * @param errorType - The type of error
 * @param step - The workflow step where the error occurred
 * @returns A user-friendly error message
 */
export function getUserFriendlyErrorMessage(
  errorType: ErrorType,
  step?: WorkflowStep
): string {
  if (step && STEP_ERROR_MESSAGES[step]?.[errorType]) {
    return STEP_ERROR_MESSAGES[step][errorType];
  }

  return (
    USER_FRIENDLY_ERROR_MESSAGES[errorType] ||
    USER_FRIENDLY_ERROR_MESSAGES[ErrorType.UNKNOWN]
  );
}

/**
 * Gets actionable guidance for users based on error type
 * @param errorType - The type of error
 * @returns Actionable guidance text
 */
export function getErrorGuidance(errorType: ErrorType): string {
  const guidance: Record<ErrorType, string> = {
    [ErrorType.NETWORK_ERROR]:
      "Check your internet connection and try again. If the problem persists, the service may be down.",
    [ErrorType.TIMEOUT]:
      "Try again in a few moments. If the content is very large, it may take longer to process.",
    [ErrorType.SERVICE_UNAVAILABLE]:
      "The service will automatically retry. No action needed from you.",
    [ErrorType.RATE_LIMIT]:
      "Wait a few minutes before trying again. Consider upgrading if you frequently hit this limit.",
    [ErrorType.INVALID_CONTENT]:
      "Verify the content is in a supported format. Contact support if you believe this is an error.",
    [ErrorType.AUTHENTICATION_FAILED]:
      "Check your account credentials. Contact support if the issue persists.",
    [ErrorType.NOT_FOUND]:
      "Verify the URL is correct and the content still exists. Try bookmarking a different URL.",
    [ErrorType.MALFORMED_URL]:
      "Check the URL format and try again with a valid link.",
    [ErrorType.QUOTA_EXCEEDED]:
      "Free up storage space or upgrade your plan to continue.",
    [ErrorType.UNKNOWN]:
      "Try again later. If the problem persists, contact support with the error details.",
  };

  return guidance[errorType] || guidance[ErrorType.UNKNOWN];
}

/**
 * Determines retry delay based on error type and attempt number
 * @param errorType - The type of error
 * @param attemptNumber - The current retry attempt (1-based)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(
  errorType: ErrorType,
  attemptNumber: number
): number {
  const baseDelays: Record<ErrorType, number> = {
    [ErrorType.NETWORK_ERROR]: 5000, // 5 seconds
    [ErrorType.TIMEOUT]: 10000, // 10 seconds
    [ErrorType.SERVICE_UNAVAILABLE]: 15000, // 15 seconds
    [ErrorType.RATE_LIMIT]: 60000, // 60 seconds
    [ErrorType.INVALID_CONTENT]: 0, // No retry
    [ErrorType.AUTHENTICATION_FAILED]: 0, // No retry
    [ErrorType.NOT_FOUND]: 0, // No retry
    [ErrorType.MALFORMED_URL]: 0, // No retry
    [ErrorType.QUOTA_EXCEEDED]: 0, // No retry
    [ErrorType.UNKNOWN]: 5000, // 5 seconds
  };

  const baseDelay = baseDelays[errorType] || 5000;

  // Exponential backoff with jitter
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter

  return exponentialDelay + jitter;
}

/**
 * Formats an error for logging with all relevant context
 * @param error - The error to format
 * @param context - Additional context
 * @returns Formatted error object for logging
 */
export function formatErrorForLogging(
  error: Error | WorkflowError,
  context?: Record<string, any>
) {
  const baseError = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    ...context,
  };

  if (error instanceof WorkflowError) {
    return {
      ...baseError,
      errorType: error.errorType,
      step: error.step,
      retryable: error.retryable,
      context: error.context,
    };
  }

  return {
    ...baseError,
    errorType: classifyError(error),
    retryable: isRetryableError(error),
  };
}
