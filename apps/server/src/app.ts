import "dotenv/config";

import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import {
	ORPCError,
	ValidationError as ORPCValidationError,
	onError,
} from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { Elysia } from "elysia";
import { z } from "zod";
import { create_context } from "@/context";
import {
	create_error_response,
	ErrorCode,
	log_error,
	map_error_to_app_error,
	sanitize_error_message,
	ValidationError,
} from "@/lib/errors";
import { validate_session } from "@/middleware/auth";
import { api_router, type TApiRouter } from "@/routes/api";
import { auth_routes } from "@/routes/auth";

export type { TApiRouter };

const rpc_handler = new RPCHandler(api_router, {
	interceptors: [
		onError((error, context) => {
			// Check if this is an ORPC validation error
			if (
				error instanceof ORPCError &&
				error.code === "BAD_REQUEST" &&
				error.cause instanceof ORPCValidationError
			) {
				// If you only use Zod you can safely cast to ZodIssue[]
				const zodError = new z.ZodError(
					error.cause.issues as z.core.$ZodIssue[],
				);

				// Log validation error with context
				log_error(new Error("Input validation failed"), {
					userId: context.context?.session?.user?.id,
					path: "rpc",
					errorCode: ErrorCode.INVALID_INPUT,
					validationIssues: z.flattenError(zodError),
				});

				throw new ORPCError("INPUT_VALIDATION_FAILED", {
					status: 422,
					message: z.prettifyError(zodError),
					data: z.flattenError(zodError),
					cause: error.cause,
				});
			}

			const appError = map_error_to_app_error(error);

			// Log error with context
			log_error(error instanceof Error ? error : new Error(String(error)), {
				userId: context.context?.session?.user?.id,
				path: "rpc",
				errorCode: appError.code,
			});

			// Sanitize error message for production
			const isProduction = process.env.NODE_ENV === "production";
			const sanitizedMessage = sanitize_error_message(
				error instanceof Error ? error : new Error(String(error)),
				isProduction,
			);

			// Throw error with sanitized message
			throw new Error(sanitizedMessage);
		}),
	],
});

const api_handler = new OpenAPIHandler(api_router, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error, context) => {
			// Map error to AppError
			const appError = map_error_to_app_error(error);

			// Log error with context
			log_error(error instanceof Error ? error : new Error(String(error)), {
				userId: context.context?.session?.user?.id,
				path: "api",
				errorCode: appError.code,
			});

			// Sanitize error message for production
			const isProduction = process.env.NODE_ENV === "production";
			const sanitizedMessage = sanitize_error_message(
				error instanceof Error ? error : new Error(String(error)),
				isProduction,
			);

			// Throw error with sanitized message
			throw new Error(sanitizedMessage);
		}),
	],
});

export const app = new Elysia()
	.use(
		cors({
			origin: process.env.CORS_ORIGIN || "http://localhost:3001",
			methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
			allowedHeaders: [
				"Content-Type",
				"Authorization",
				"X-CSRF-Token",
				"Cookie",
			],
			credentials: true,
			exposeHeaders: ["Set-Cookie"],
		}),
	)
	.derive(async ({ request }) => {
		const { session, user, isAuthenticated } = await validate_session(request);

		return {
			session,
			user,
			isAuthenticated,
		};
	})
	.use(auth_routes)
	.get("/", () => ({
		status: "ok",
		message: "Social Bookmarks Manager API",
		version: "1.0.0",
	}))
	.get("/health", () => ({
		status: "ok",
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || "development",
	}))
	.get("/api/session", async ({ session, user, isAuthenticated }) => {
		if (!isAuthenticated || !session || !user) {
			return {
				authenticated: false,
				session: null,
				user: null,
			};
		}

		return {
			authenticated: true,
			session: {
				id: session.id,
				expiresAt: session.expiresAt,
			},
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				image: user.image,
			},
		};
	})
	.all("/rpc*", async (context) => {
		const { response } = await rpc_handler.handle(context.request, {
			prefix: "/rpc",
			context: await create_context({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.all("/api*", async (context) => {
		const { response } = await api_handler.handle(context.request, {
			prefix: "/api-reference",
			context: await create_context({ context }),
		});
		return response ?? new Response("Not Found", { status: 404 });
	})
	.onError(({ code, error, set, request }) => {
		const isProduction = process.env.NODE_ENV === "production";

		// Handle ValidationError specially to preserve structured validation errors
		if (error instanceof ValidationError) {
			set.status = 422;
			return create_error_response(ErrorCode.INVALID_INPUT, error.message, {
				validationErrors: error.validationErrors,
			});
		}

		// Map error to AppError
		const appError = map_error_to_app_error(error);

		// Log error with context
		log_error(error instanceof Error ? error : new Error(String(error)), {
			path: new URL(request.url).pathname,
			method: request.method,
			elysiaCode: code,
			errorCode: appError.code,
		});

		// Handle specific Elysia error codes
		if (code === "NOT_FOUND") {
			set.status = 404;
			return create_error_response(
				ErrorCode.RESOURCE_NOT_FOUND,
				"The requested resource was not found",
			);
		}

		if (code === "VALIDATION") {
			set.status = 400;
			return create_error_response(
				ErrorCode.INVALID_INPUT,
				error instanceof Error ? error.message : "Validation failed",
				error instanceof Error && "errors" in error
					? { validationErrors: (error as any).errors }
					: undefined,
			);
		}

		if (code === "PARSE") {
			set.status = 400;
			return create_error_response(
				ErrorCode.INVALID_INPUT,
				"Invalid request body",
			);
		}

		// Use AppError status code and message
		set.status = appError.statusCode;

		// Sanitize error message for production
		const sanitizedMessage = sanitize_error_message(
			error instanceof Error ? error : new Error(String(error)),
			isProduction,
		);

		return create_error_response(
			appError.code,
			sanitizedMessage,
			appError.details,
		);
	});

export type App = typeof app;
export { create_context as createContext };
