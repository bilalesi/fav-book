import { z } from "zod";
import { protected_middleware } from "@/middleware/protected";

/**
 * Twitter Import API Router
 * Proxies requests to the Twitor Python service for Twitter bookmark crawling
 */

// Get Twitor service URL from environment
const TWITOR_SERVICE_URL =
	process.env.TWITOR_SERVICE_URL || "http://localhost:8001";

// Request/Response schemas matching Twitor service
const crawl_start_request_schema = z.object({
	userId: z.string().min(1, "User ID is required"),
	directImport: z.boolean().default(true),
	enableSummarization: z.boolean().default(false),
});

const crawl_start_response_schema = z.object({
	sessionId: z.string(),
	status: z.string(),
});

const crawl_stop_response_schema = z.object({
	status: z.string(),
	bookmarksProcessed: z.number(),
});

/**
 * Helper function to make authenticated requests to Twitor service
 */
async function proxy_to_twitor<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `${TWITOR_SERVICE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				"Content-Type": "application/json",
				...options.headers,
			},
			signal: AbortSignal.timeout(30000), // 30 second timeout
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage: string;

			try {
				const errorJson = JSON.parse(errorText);
				errorMessage = errorJson.detail || errorJson.message || errorText;
			} catch {
				errorMessage = errorText || `HTTP ${response.status}`;
			}

			throw new Error(
				`Twitor service error (${response.status}): ${errorMessage}`,
			);
		}

		return (await response.json()) as T;
	} catch (error) {
		if (error instanceof Error) {
			// Check for network/timeout errors
			if (error.name === "AbortError" || error.name === "TimeoutError") {
				throw new Error(
					"Twitter import service is not responding. Please try again later.",
				);
			}

			// Check for connection errors
			if (
				error.message.includes("ECONNREFUSED") ||
				error.message.includes("fetch failed")
			) {
				throw new Error(
					"Cannot connect to Twitter import service. Please ensure the service is running.",
				);
			}

			throw error;
		}

		throw new Error("Unknown error occurred while contacting Twitor service");
	}
}

export const twitter_import_router = {
	/**
	 * Start a new Twitter bookmark crawl session
	 */
	start_crawl: protected_middleware
		.input(crawl_start_request_schema)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			// Ensure userId matches authenticated user
			if (input.userId !== userId) {
				throw new Error(
					"User ID mismatch - cannot start crawl for another user",
				);
			}

			try {
				const response = await proxy_to_twitor<
					z.infer<typeof crawl_start_response_schema>
				>("/api/crawl/start", {
					method: "POST",
					body: JSON.stringify(input),
				});

				return response;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to start crawl";
				throw new Error(message);
			}
		}),

	/**
	 * Stop an active crawl session
	 */
	stop_crawl: protected_middleware
		.input(z.object({ sessionId: z.string().min(1, "Session ID is required") }))
		.handler(async ({ input }) => {
			try {
				const response = await proxy_to_twitor<
					z.infer<typeof crawl_stop_response_schema>
				>(`/api/crawl/stop/${input.sessionId}`, {
					method: "POST",
				});

				return response;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to stop crawl";
				throw new Error(message);
			}
		}),

	/**
	 * Get download URL for a completed crawl session
	 * Returns the URL that the frontend can use to download the file
	 */
	retrieve_download_url: protected_middleware
		.input(z.object({ sessionId: z.string().min(1, "Session ID is required") }))
		.handler(async ({ input }) => {
			// Return the download URL - the frontend will make a direct request
			// to the Twitor service with this URL
			return {
				downloadUrl: `${TWITOR_SERVICE_URL}/api/crawl/download/${input.sessionId}`,
				sessionId: input.sessionId,
			};
		}),

	/**
	 * Check Twitor service health
	 */
	probe_health: protected_middleware.handler(async () => {
		try {
			const response = await fetch(`${TWITOR_SERVICE_URL}/health`, {
				signal: AbortSignal.timeout(5000),
			});

			if (!response.ok) {
				return {
					healthy: false,
					status: "unhealthy",
					message: `Service returned status ${response.status}`,
				};
			}

			const data = (await response.json()) as {
				status?: string;
				service?: string;
				version?: string;
			};

			return {
				healthy: true,
				status: "healthy",
				service: data.service || "twitor",
				version: data.version,
			};
		} catch (error) {
			return {
				healthy: false,
				status: "unreachable",
				message:
					error instanceof Error
						? error.message
						: "Cannot connect to Twitor service",
			};
		}
	}),
};
