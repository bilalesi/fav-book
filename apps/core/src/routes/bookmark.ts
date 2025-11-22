import { Elysia } from "elysia";
import { DB } from "@favy/db";
import { z } from "zod";
import { require_auth } from "../middleware/auth";
import * as service from "../services/bookmark";

export const bookmark_post_routes = new Elysia({ prefix: "/bookmark" })
  /**
   * POST /api/v1/bookmark/findMany
   * Retrieve bookmark posts with flexible query options
   */
  .post(
    "/",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const bookmarks = await service.get_user_bookmark_posts(body, user.id);
        return bookmarks;
      } catch (error) {
        set.status = 401;
        return { error: "Authentication required" };
      }
    },
    {
      body: DB.BookmarkPostFindManyZodSchema,
      response: {
        200: z.array(z.any()),
        401: z.object({
          error: z.string(),
        }),
      },
      detail: {
        tags: ["Bookmark"],
        summary: "Find many bookmark posts",
        description:
          "Retrieve bookmark posts with flexible Prisma query options (select, include, where, orderBy, etc.). Automatically filters by authenticated user.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark/first
   * Retrieve a specific bookmark post with flexible query options
   */
  .post(
    "/first",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const { id, ...query } = body;
        const bookmark = await service.get_bookmark_post_by_id(
          query,
          id,
          user.id
        );

        if (!bookmark) {
          set.status = 404;
          return { error: "Bookmark post not found" };
        }

        return bookmark;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to retrieve bookmark post" };
      }
    },
    {
      body: z.object({
        ...DB.BookmarkPostFindFirstZodSchema.omit({ where: true }).extend(
          DB.BookmarkPostWhereInputObjectZodSchema.omit({
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
        tags: ["Bookmark"],
        summary: "Find first bookmark post",
        description:
          "Retrieve a specific bookmark post with flexible Prisma query options. Returns 404 if not found or if the bookmark belongs to another user.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark/create
   * Create a new bookmark post with flexible query options
   */
  .post(
    "/create",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);

        // Create the bookmark post with the authenticated user
        const bookmark = await service.create_bookmark_post(body, user.id);

        set.status = 201;
        return bookmark;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to create bookmark post" };
      }
    },
    {
      body: DB.BookmarkPostCreateOneZodSchema,
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
        tags: ["Bookmark Posts"],
        summary: "Create a new bookmark post",
        description:
          "Create a new bookmark post with flexible Prisma query options (select, include). The savedAt timestamp and userId are set automatically.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark/update
   * Update an existing bookmark post with flexible query options
   */
  .put(
    "/",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const { id, ...query } = body;

        const bookmark = await service.update_bookmark_post(query, id, user.id);

        if (!bookmark) {
          set.status = 404;
          return { error: "Bookmark post not found" };
        }

        return bookmark;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to update bookmark post" };
      }
    },
    {
      body: z.object({
        ...DB.BookmarkPostUpdateOneZodSchema.omit({ where: true }).extend(
          DB.BookmarkPostWhereInputObjectZodSchema.omit({
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
        tags: ["Bookmark"],
        summary: "Update a bookmark post",
        description:
          "Update an existing bookmark post with flexible Prisma query options. Returns 404 if not found or if the bookmark belongs to another user.",
      },
    }
  )

  /**
   * POST /api/v1/bookmark-posts/delete
   * Delete a bookmark post with flexible query options
   */
  .delete(
    "/",
    async ({ body, request, set }) => {
      try {
        const { user } = await require_auth(request);
        const { id, ...query } = body;

        const bookmark = await service.delete_bookmark_post(query, user.id);

        if (!bookmark) {
          set.status = 404;
          return { error: "Bookmark post not found" };
        }

        return { message: "Bookmark post deleted successfully" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Authentication required"
        ) {
          set.status = 401;
          return { error: "Authentication required" };
        }
        set.status = 400;
        return { error: "Failed to delete bookmark post" };
      }
    },
    {
      body: z.object({
        ...DB.BookmarkPostDeleteOneZodSchema.shape,
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
        tags: ["Bookmark Posts"],
        summary: "Delete a bookmark post",
        description:
          "Delete a bookmark post with flexible Prisma query options. All associated enrichments are deleted automatically. Returns 404 if not found or if the bookmark belongs to another user.",
      },
    }
  );
