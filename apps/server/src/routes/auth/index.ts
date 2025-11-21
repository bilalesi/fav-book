import { auth } from "@favy/auth";
import { Elysia } from "elysia";

/**
 * Authentication routes
 * Handles OAuth (Twitter, LinkedIn) and magic link authentication
 */
export const auth_routes = new Elysia({ prefix: "/api/auth" })
	// OAuth login endpoints
	// GET /api/auth/twitter - Initiate Twitter OAuth flow
	// GET /api/auth/linkedin - Initiate LinkedIn OAuth flow
	// GET /api/auth/callback/twitter - Twitter OAuth callback
	// GET /api/auth/callback/linkedin - LinkedIn OAuth callback

	// Magic link endpoints
	// POST /api/auth/send-magic-link - Send magic link email
	// GET /api/auth/verify-email - Verify magic link token

	// Session endpoints
	// POST /api/auth/sign-out - Sign out user
	// GET /api/auth/session - Get current session

	// All auth endpoints are handled by better-auth
	.all("/*", async ({ request }) => {
		const url = new URL(request.url);
		console.log(`[AUTH] ${request.method} ${url.pathname}`);
		console.log(`[AUTH] Full URL: ${url.href}`);
		console.log("[AUTH] Query params:", url.searchParams.toString());
		const response = await auth.handler(request);
		console.log(`[AUTH] Response: ${response.status}`);
		if (response.status === 404) {
			console.log(`[AUTH] 404 - Better-auth doesn't recognize this endpoint`);
		}
		console.log("");
		return response;
	});
