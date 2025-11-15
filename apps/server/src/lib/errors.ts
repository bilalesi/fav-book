/**
 * Error handling utilities for the Social Bookmarks Manager API
 * Provides structured error responses with appropriate HTTP status codes
 */

export enum ErrorCode {
  // Authentication errors (401)
  AUTH_REQUIRED = "AUTH_REQUIRED",
  AUTH_INVALID = "AUTH_INVALID",
  AUTH_PROVIDER_ERROR = "AUTH_PROVIDER_ERROR",

  // Authorization errors (403)
  FORBIDDEN = "FORBIDDEN",

  // Not found errors (404)
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",

  // Validation errors (400)
  INVALID_INPUT = "INVALID_INPUT",
  DUPLICATE_BOOKMARK = "DUPLICATE_BOOKMARK",
  INVALID_FILE_FORMAT = "INVALID_FILE_FORMAT",

  // Database errors (500)
  DB_CONNECTION_ERROR = "DB_CONNECTION_ERROR",
  DB_QUERY_ERROR = "DB_QUERY_ERROR",
  DB_CONSTRAINT_ERROR = "DB_CONSTRAINT_ERROR",

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Service errors (503)
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",

  // Generic errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Validation error with structured validation details
 */
export class ValidationError extends AppError {
  public readonly validationErrors: Record<string, string>;

  constructor(message: string, validationErrors: Record<string, string>) {
    super(ErrorCode.INVALID_INPUT, message, 422, { validationErrors });
    this.name = "ValidationError";
    this.validationErrors = validationErrors;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      validationErrors: this.validationErrors,
    };
  }
}

/**
 * Map error codes to HTTP status codes
 */
export function getStatusCodeForError(code: ErrorCode): number {
  const statusMap: Record<ErrorCode, number> = {
    [ErrorCode.AUTH_REQUIRED]: 401,
    [ErrorCode.AUTH_INVALID]: 401,
    [ErrorCode.AUTH_PROVIDER_ERROR]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.RESOURCE_NOT_FOUND]: 404,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.DUPLICATE_BOOKMARK]: 409,
    [ErrorCode.INVALID_FILE_FORMAT]: 400,
    [ErrorCode.DB_CONNECTION_ERROR]: 500,
    [ErrorCode.DB_QUERY_ERROR]: 500,
    [ErrorCode.DB_CONSTRAINT_ERROR]: 500,
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.UNKNOWN_ERROR]: 500,
  };

  return statusMap[code] || 500;
}

/**
 * Create a structured error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, any>
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Sanitize error message for production
 * Removes sensitive information from error messages
 */
export function sanitizeErrorMessage(
  error: Error,
  isProduction: boolean
): string {
  if (!isProduction) {
    return error.message;
  }

  // In production, return generic messages for certain error types
  if (error.message.includes("database") || error.message.includes("prisma")) {
    return "A database error occurred";
  }

  if (error.message.includes("password") || error.message.includes("token")) {
    return "An authentication error occurred";
  }

  // Return the original message if it doesn't contain sensitive info
  return error.message;
}

/**
 * Log error with context
 */
export function logError(
  error: Error,
  context?: {
    userId?: string;
    path?: string;
    method?: string;
    [key: string]: any;
  }
) {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    name: error.name,
    message: error.message,
    stack: error.stack,
    context,
  };

  console.error("[ERROR]", JSON.stringify(errorInfo, null, 2));
}

/**
 * Map common error types to AppError
 */
export function mapErrorToAppError(error: unknown): AppError {
  console.log("–– – mapErrorToAppError – error––", error);
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes("not found")) {
      return new AppError(ErrorCode.RESOURCE_NOT_FOUND, error.message, 404);
    }

    if (error.message.includes("already exists")) {
      return new AppError(ErrorCode.DUPLICATE_BOOKMARK, error.message, 409);
    }

    if (error.message.includes("Authentication required")) {
      return new AppError(
        ErrorCode.AUTH_REQUIRED,
        "Authentication required",
        401
      );
    }

    if (
      error.message.includes("Unauthorized") ||
      error.message.includes("UNAUTHORIZED")
    ) {
      return new AppError(
        ErrorCode.AUTH_REQUIRED,
        "Authentication required",
        401
      );
    }

    if (error.message.includes("Forbidden")) {
      return new AppError(ErrorCode.FORBIDDEN, "Access forbidden", 403);
    }

    // Database errors
    if (
      error.message.includes("Prisma") ||
      error.message.includes("database")
    ) {
      return new AppError(
        ErrorCode.DB_QUERY_ERROR,
        "Database operation failed",
        500
      );
    }
    console.log("————here");
    // Generic error
    return new AppError(ErrorCode.INTERNAL_ERROR, error.message, 500);
  }

  // Unknown error type
  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    "An unknown error occurred",
    500
  );
}
