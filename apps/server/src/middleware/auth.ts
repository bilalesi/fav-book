import { auth } from "@favy/auth";

/**
 * Session validation middleware
 * Extracts and validates the user session from the request
 */
export async function validate_session(request: Request) {
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
 * Require authentication middleware
 * Throws an error if the user is not authenticated
 */
export async function require_auth(request: Request) {
	const { session, user, isAuthenticated } = await validate_session(request);

	if (!isAuthenticated || !session || !user) {
		throw new Error("Authentication required");
	}

	return { session, user };
}

/**
 * Extract user ID from session
 */
export async function getUserId(request: Request): Promise<string | null> {
	const { user } = await validate_session(request);
	return user?.id || null;
}
