import { auth } from "@favy/auth";

/**
 * Session validation result
 */
export interface SessionValidationResult {
  session: any | null;
  user: any | null;
  isAuthenticated: boolean;
}

/**
 * Validates the user session from the request headers
 *
 * @param request - The incoming HTTP request
 * @returns Session validation result with session, user, and authentication status
 *
 * Requirements: 12.1, 12.6
 */
export async function validate_session(
  request: Request
): Promise<SessionValidationResult> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    return {
      session: session?.session || null,
      user: session?.user || null,
      isAuthenticated: !!session?.session,
    };
  } catch (error) {
    console.error("Session validation error:", error);
    return {
      session: null,
      user: null,
      isAuthenticated: false,
    };
  }
}

/**
 * Requires authentication for protected routes
 * Throws an error if the user is not authenticated
 *
 * @param request - The incoming HTTP request
 * @returns Session and user information for authenticated requests
 * @throws Error if authentication is missing or invalid
 *
 * Requirements: 12.2, 12.3
 */
export async function require_auth(request: Request) {
  const { session, user, isAuthenticated } = await validate_session(request);

  if (!isAuthenticated || !session || !user) {
    throw new Error("Authentication required");
  }

  return { session, user };
}

/**
 * Extracts the user ID from the authenticated session
 *
 * @param request - The incoming HTTP request
 * @returns User ID if authenticated, null otherwise
 *
 * Requirements: 12.3
 */
export async function get_user_id(request: Request): Promise<string | null> {
  const { user } = await validate_session(request);
  return user?.id || null;
}
