import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { bookmark_post_routes } from "./routes/bookmark";
import { bookmark_enrichment_routes } from "./routes/enrichment";

// CORS configuration
const cors_origin =
  process.env.CORS_ORIGIN || process.env.NODE_ENV === "production"
    ? process.env.CORS_ORIGIN
    : "*";

const app = new Elysia()
  .use(
    cors({
      origin: cors_origin,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposeHeaders: ["Content-Length", "Content-Type"],
      maxAge: 86400, // 24 hours for preflight cache
    })
  )
  .use(
    openapi({
      documentation: {
        info: {
          title: "Core API",
          version: "1.0.0",
          description:
            "Centralized REST API service for all database operations",
        },
        tags: [
          {
            name: "Bookmark Posts",
            description: "Bookmark post management endpoints",
          },
          {
            name: "Bookmark Enrichments",
            description: "Bookmark enrichment management endpoints",
          },
        ],
      },
    })
  )
  .group("/api/v1", (app) =>
    app
      .get("/health", () => ({ status: "ok" }))
      .use(bookmark_post_routes)
      .use(bookmark_enrichment_routes)
  )
  .listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
