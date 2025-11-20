import "dotenv/config";
import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { RPCHandler } from "@orpc/server/fetch";
import {
  onError,
  ORPCError,
  ValidationError as ORPCValidationError,
} from "@orpc/server";
import { z } from "zod";
import { appRouter } from "@favy/api/routers/index";
import { createContext } from "@favy/api/context";
import { authRoutes } from "./routes/auth";
import { validateSession } from "./middleware/auth";
import {
  mapErrorToAppError,
  createErrorResponse,
  sanitizeErrorMessage,
  logError,
  ErrorCode,
  ValidationError,
} from "./lib/errors";

const rpcHandler = new RPCHandler(appRouter, {
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
          error.cause.issues as z.core.$ZodIssue[]
        );

        // Log validation error with context
        logError(new Error("Input validation failed"), {
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

      const appError = mapErrorToAppError(error);

      // Log error with context
      logError(error instanceof Error ? error : new Error(String(error)), {
        userId: context.context?.session?.user?.id,
        path: "rpc",
        errorCode: appError.code,
      });

      // Sanitize error message for production
      const isProduction = process.env.NODE_ENV === "production";
      const sanitizedMessage = sanitizeErrorMessage(
        error instanceof Error ? error : new Error(String(error)),
        isProduction
      );

      // Throw error with sanitized message
      throw new Error(sanitizedMessage);
    }),
  ],
});

const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error, context) => {
      // Map error to AppError
      const appError = mapErrorToAppError(error);

      // Log error with context
      logError(error instanceof Error ? error : new Error(String(error)), {
        userId: context.context?.session?.user?.id,
        path: "api",
        errorCode: appError.code,
      });

      // Sanitize error message for production
      const isProduction = process.env.NODE_ENV === "production";
      const sanitizedMessage = sanitizeErrorMessage(
        error instanceof Error ? error : new Error(String(error)),
        isProduction
      );

      // Throw error with sanitized message
      throw new Error(sanitizedMessage);
    }),
  ],
});

const app = new Elysia()
  // CORS configuration for frontend
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
    })
  )

  // Session validation middleware for all routes
  .derive(async ({ request }) => {
    const { session, user, isAuthenticated } = await validateSession(request);

    return {
      session,
      user,
      isAuthenticated,
    };
  })

  // Mount authentication routes
  .use(authRoutes)

  // Health check endpoint
  .get("/", () => ({
    status: "ok",
    message: "Social Bookmarks Manager API",
    version: "1.0.0",
  }))

  // Dedicated health check for monitoring
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  }))

  // Session info endpoint
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

  // oRPC endpoints for API procedures
  .all("/rpc*", async (context) => {
    const { response } = await rpcHandler.handle(context.request, {
      prefix: "/rpc",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })

  // OpenAPI documentation endpoints
  .all("/api*", async (context) => {
    const { response } = await apiHandler.handle(context.request, {
      prefix: "/api-reference",
      context: await createContext({ context }),
    });
    return response ?? new Response("Not Found", { status: 404 });
  })

  // Global error handling middleware
  .onError(({ code, error, set, request }) => {
    const isProduction = process.env.NODE_ENV === "production";

    // Handle ValidationError specially to preserve structured validation errors
    if (error instanceof ValidationError) {
      set.status = 422;
      return createErrorResponse(ErrorCode.INVALID_INPUT, error.message, {
        validationErrors: error.validationErrors,
      });
    }

    // Map error to AppError
    const appError = mapErrorToAppError(error);

    // Log error with context
    logError(error instanceof Error ? error : new Error(String(error)), {
      path: new URL(request.url).pathname,
      method: request.method,
      elysiaCode: code,
      errorCode: appError.code,
    });

    // Handle specific Elysia error codes
    if (code === "NOT_FOUND") {
      set.status = 404;
      return createErrorResponse(
        ErrorCode.RESOURCE_NOT_FOUND,
        "The requested resource was not found"
      );
    }

    if (code === "VALIDATION") {
      set.status = 400;
      return createErrorResponse(
        ErrorCode.INVALID_INPUT,
        error instanceof Error ? error.message : "Validation failed",
        error instanceof Error && "errors" in error
          ? { validationErrors: (error as any).errors }
          : undefined
      );
    }

    if (code === "PARSE") {
      set.status = 400;
      return createErrorResponse(
        ErrorCode.INVALID_INPUT,
        "Invalid request body"
      );
    }

    // Use AppError status code and message
    set.status = appError.statusCode;

    // Sanitize error message for production
    const sanitizedMessage = sanitizeErrorMessage(
      error instanceof Error ? error : new Error(String(error)),
      isProduction
    );

    return createErrorResponse(
      appError.code,
      sanitizedMessage,
      appError.details
    );
  })

  .listen(3000, () => {
    console.log("🚀 Server is running on http://localhost:3000");
    console.log("📚 API Documentation: http://localhost:3000/api-reference");
    console.log("🔐 Auth endpoints: http://localhost:3000/api/auth/*");
    console.log("");

    // Log active workflow engine configuration
    const workflowEngine = process.env.WORKFLOW_ENGINE || "restate";
    console.log("⚙️  Workflow Configuration:");
    console.log(`  - Engine: ${workflowEngine}`);

    if (workflowEngine === "restate") {
      const ingressUrl =
        process.env.RESTATE_INGRESS_URL || "http://localhost:8080";
      const adminUrl = process.env.RESTATE_ADMIN_URL || "http://localhost:9070";
      console.log(`  - Restate Ingress: ${ingressUrl}`);
      console.log(`  - Restate Admin: ${adminUrl}`);
    } else if (workflowEngine === "trigger") {
      console.log(
        `  - Trigger.dev API: ${
          process.env.TRIGGER_API_URL || "https://api.trigger.dev"
        }`
      );
    }

    console.log("");
    console.log("Available auth endpoints:");
    console.log("  - POST /api/auth/sign-in/email - Email/password sign in");
    console.log("  - POST /api/auth/sign-up/email - Email/password sign up");
    console.log("  - GET  /api/auth/twitter - Twitter OAuth");
    console.log("  - GET  /api/auth/linkedin - LinkedIn OAuth");
    console.log("  - POST /api/auth/send-verification-email - Send magic link");
    console.log("  - GET  /api/auth/verify-email - Verify magic link");
    console.log("  - POST /api/auth/sign-out - Sign out");
    console.log("  - GET  /api/session - Get current session");
  });

export type App = typeof app;
