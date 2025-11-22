import { Elysia } from "elysia";
import { DB } from "@favy/db";
import { z } from "zod";
import { require_auth } from "../middleware/auth";
import * as service from "../services/enrichment";

export const bookmark_enrichment_routes = new Elysia({
  prefix: "/enrichments",
})
  /**
   * POST /api/v1/bookmark-enrichments/findMany
   * Retrieve bookmark enrichments with flexible query options
   */
  .post(
    "/",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const enrichments = await service.get_user_bookmark_enrichments(
          body,
          user.id
        );
        return enrichments;
      } catch (error) {
        set.status = 401;
        return { error: "Authentication required" };
      }
    },
    {
      body: DB.BookmarkEnrichmentFindManyZodSchema,
      response: {
        200: z.array(z.any()),
        401: z.object({
          error: z.string(),
        }),
      },
      detail: {
        tags: ["Bookmark Enrichments"],
        summary: "Find many bookmark enrichments",
        description:
          "Retrieve bookmark enrichments with flexible Prisma query options (select, include, where, orderBy, etc.). Automatically filters by authenticated user's bookmarks.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark-enrichments/findFirst
   * Retrieve a specific bookmark enrichment with flexible query options
   */
  .post(
    "/first",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const { id, ...query } = body;
        const enrichment = await service.get_bookmark_enrichment_by_id(
          query,
          id,
          user.id
        );

        if (!enrichment) {
          set.status = 404;
          return { error: "Bookmark enrichment not found" };
        }

        return enrichment;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to retrieve bookmark enrichment" };
      }
    },
    {
      body: z.object({
        ...DB.BookmarkEnrichmentFindManyZodSchema.omit({ where: true }).extend(
          DB.BookmarkEnrichmentWhereInputObjectZodSchema.omit({
            id: true,
            bookmarkPost: true,
          }).shape
        ).shape,
        id: z.string(),
      }),
      response: {
        200: z.any(),
        401: z.object({
          error: z.string(),
        }),
        404: z.object({
          error: z.string(),
        }),
        400: z.object({
          error: z.string(),
        }),
      },
      detail: {
        tags: ["Bookmark Enrichments"],
        summary: "Find first bookmark enrichment",
        description:
          "Retrieve a specific bookmark enrichment with flexible Prisma query options. Returns 404 if not found or if the enrichment belongs to another user's bookmark.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark-enrichments/create
   * Create a new bookmark enrichment with flexible query options
   */
  .post(
    "/create",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);

        // Create the enrichment with the authenticated user's bookmark
        const enrichment = await service.create_bookmark_enrichment(
          body,
          user.id
        );

        if (!enrichment) {
          set.status = 400;
          return { error: "Bookmark not found or access denied" };
        }

        set.status = 201;
        return enrichment;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to create bookmark enrichment" };
      }
    },
    {
      body: DB.BookmarkEnrichmentCreateOneZodSchema,
      response: {
        201: z.any(),
        400: z.object({
          error: z.string(),
        }),
        401: z.object({
          error: z.string(),
        }),
      },
      detail: {
        tags: ["Bookmark Enrichments"],
        summary: "Create a new bookmark enrichment",
        description:
          "Create a new bookmark enrichment with flexible Prisma query options (select, include). The createdAt and updatedAt timestamps are set automatically.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark-enrichments/update
   * Update an existing bookmark enrichment with flexible query options
   */
  .put(
    "/",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const { id, ...query } = body;

        const enrichment = await service.update_bookmark_enrichment(
          query,
          id,
          user.id
        );

        if (!enrichment) {
          set.status = 404;
          return { error: "Bookmark enrichment not found" };
        }

        return enrichment;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to update bookmark enrichment" };
      }
    },
    {
      body: z.object({
        ...DB.BookmarkEnrichmentUpdateOneZodSchema.omit({ where: true }).extend(
          DB.BookmarkEnrichmentWhereInputObjectZodSchema.omit({
            id: true,
            bookmarkPost: true,
          }).shape
        ).shape,
        id: z.string(),
      }),
      response: {
        200: z.any(),
        400: z.object({
          error: z.string(),
        }),
        401: z.object({
          error: z.string(),
        }),
        404: z.object({
          error: z.string(),
        }),
      },
      detail: {
        tags: ["Bookmark Enrichments"],
        summary: "Update a bookmark enrichment",
        description:
          "Update an existing bookmark enrichment with flexible Prisma query options. Returns 404 if not found or if the enrichment belongs to another user's bookmark.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark-enrichments/delete
   * Delete a bookmark enrichment with flexible query options
   *
   * Requirements: 4.6, 12.2, 12.3, 12.5
   */
  .delete(
    "/",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const { id, ...query } = body;

        const enrichment = await service.delete_bookmark_enrichment(
          query,
          id,
          user.id
        );

        if (!enrichment) {
          set.status = 404;
          return { error: "Bookmark enrichment not found" };
        }

        return { message: "Bookmark enrichment deleted successfully" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to delete bookmark enrichment" };
      }
    },
    {
      body: z.object({
        ...DB.BookmarkEnrichmentDeleteOneZodSchema.shape,
        id: z.string(),
      }),
      response: {
        200: z.object({
          message: z.string(),
        }),
        400: z.object({
          error: z.string(),
        }),
        401: z.object({
          error: z.string(),
        }),
        404: z.object({
          error: z.string(),
        }),
      },
      detail: {
        tags: ["Bookmark Enrichments"],
        summary: "Delete a bookmark enrichment",
        description:
          "Delete a bookmark enrichment with flexible Prisma query options. Returns 404 if not found or if the enrichment belongs to another user's bookmark.",
      },
    }
  );
