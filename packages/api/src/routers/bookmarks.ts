import { protectedProcedure } from "../index";
import { z } from "zod";
import prisma from "@my-better-t-app/db";
import type {
  BookmarkPost,
  BookmarkListResponse,
} from "@my-better-t-app/shared";
import { Prisma } from "../../../db/prisma/generated/client";

// Validation schemas
const platformSchema = z.enum(["TWITTER", "LINKEDIN"]);

// Standard media type schema for output
const mediaTypeSchema = z.enum(["IMAGE", "VIDEO", "LINK"]);

// Input media type schema - accepts both lowercase and uppercase, then transforms to uppercase
const mediaTypeInputSchema = z
  .string()
  .transform((val) => val.toUpperCase())
  .pipe(z.enum(["IMAGE", "VIDEO", "LINK"]));

const createMediaSchema = z.object({
  type: mediaTypeSchema,
  url: z.string().url("Invalid media URL"),
  thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createBookmarkSchema = z.object({
  platform: platformSchema,
  postId: z.string().min(1),
  postUrl: z.string().url(),
  content: z.string(),
  authorName: z.string().min(1),
  authorUsername: z.string().min(1),
  authorProfileUrl: z.string().url(),
  createdAt: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).optional(),
  media: z.array(createMediaSchema).optional(),
});

const updateBookmarkSchema = z.object({
  content: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const bookmarkFiltersSchema = z.object({
  platform: platformSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  authorUsername: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
});

const bookmarkImportDataSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  postUrl: z.string().url("Invalid post URL"),
  content: z.string(), // Allow empty string for posts without text content
  author: z.object({
    name: z.string().min(1, "Author name is required"),
    username: z.string().min(1, "Author username is required"),
    profileUrl: z.string().url("Invalid author profile URL"),
  }),
  media: z
    .array(
      z.object({
        type: mediaTypeInputSchema,
        url: z.string().url("Invalid media URL"),
        thumbnailUrl: z.string().url("Invalid thumbnail URL").optional(),
      })
    )
    .optional(),
  timestamp: z.string().min(1, "Timestamp is required"),
  metadata: z.record(z.string(), z.any()).optional(),
});

const bulkImportSchema = z.object({
  platform: platformSchema,
  bookmarks: z.array(bookmarkImportDataSchema),
});

// Helper function to transform Prisma result to BookmarkPost
function transformBookmarkPost(bookmark: any): BookmarkPost {
  return {
    id: bookmark.id,
    userId: bookmark.userId,
    platform: bookmark.platform,
    postId: bookmark.postId,
    postUrl: bookmark.postUrl,
    content: bookmark.content,
    authorName: bookmark.authorName,
    authorUsername: bookmark.authorUsername,
    authorProfileUrl: bookmark.authorProfileUrl,
    savedAt: bookmark.savedAt,
    createdAt: bookmark.createdAt,
    viewCount: bookmark.viewCount,
    metadata: bookmark.metadata as Record<string, any> | undefined,
    media: bookmark.media?.map((m: any) => ({
      id: m.id,
      bookmarkPostId: m.bookmarkPostId,
      type: m.type,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
      metadata: m.metadata as Record<string, any> | undefined,
    })),
    collections: bookmark.collections?.map((bc: any) => ({
      id: bc.collection.id,
      userId: bc.collection.userId,
      name: bc.collection.name,
      description: bc.collection.description,
      createdAt: bc.collection.createdAt,
      updatedAt: bc.collection.updatedAt,
    })),
    categories: bookmark.categories?.map((bc: any) => ({
      id: bc.category.id,
      name: bc.category.name,
      userId: bc.category.userId,
      isSystem: bc.category.isSystem,
      createdAt: bc.category.createdAt,
    })),
  };
}

export const bookmarksRouter = {
  // Create a new bookmark
  create: protectedProcedure
    .input(createBookmarkSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Check for duplicate bookmark
      const existing = await prisma.bookmarkPost.findUnique({
        where: {
          userId_platform_postId: {
            userId,
            platform: input.platform,
            postId: input.postId,
          },
        },
      });

      if (existing) {
        throw new Error("Bookmark already exists");
      }

      // Create bookmark with media
      const bookmark = await prisma.bookmarkPost.create({
        data: {
          userId,
          platform: input.platform,
          postId: input.postId,
          postUrl: input.postUrl,
          content: input.content,
          authorName: input.authorName,
          authorUsername: input.authorUsername,
          authorProfileUrl: input.authorProfileUrl,
          createdAt: input.createdAt,
          metadata: input.metadata as Prisma.InputJsonValue,
          media: input.media
            ? {
                create: input.media.map((m) => ({
                  type: m.type,
                  url: m.url,
                  thumbnailUrl: m.thumbnailUrl,
                  metadata: m.metadata as Prisma.InputJsonValue,
                })),
              }
            : undefined,
        },
        include: {
          media: true,
          collections: {
            include: {
              collection: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      return transformBookmarkPost(bookmark);
    }),

  // List bookmarks with pagination and filtering
  list: protectedProcedure
    .input(
      z.object({
        filters: bookmarkFiltersSchema.optional(),
        pagination: paginationSchema.optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const filters = input.filters || {};
      const pagination = input.pagination || { limit: 20 };
      const limit = pagination.limit;

      // Build where clause
      const where: Prisma.BookmarkPostWhereInput = {
        userId,
      };

      if (filters.platform) {
        where.platform = filters.platform;
      }

      if (filters.authorUsername) {
        where.authorUsername = filters.authorUsername;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.savedAt = {};
        if (filters.dateFrom) {
          where.savedAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.savedAt.lte = filters.dateTo;
        }
      }

      if (filters.collectionId) {
        where.collections = {
          some: {
            collectionId: filters.collectionId,
          },
        };
      }

      if (filters.categoryIds && filters.categoryIds.length > 0) {
        where.categories = {
          some: {
            categoryId: {
              in: filters.categoryIds,
            },
          },
        };
      }

      // Add cursor pagination
      if (pagination.cursor) {
        where.id = {
          lt: pagination.cursor,
        };
      }

      // Fetch bookmarks
      const bookmarks = await prisma.bookmarkPost.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's a next page
        orderBy: {
          savedAt: "desc",
        },
        include: {
          media: true,
          collections: {
            include: {
              collection: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      // Get total count
      const total = await prisma.bookmarkPost.count({ where });

      // Determine if there's a next page
      const hasMore = bookmarks.length > limit;
      const items = hasMore ? bookmarks.slice(0, limit) : bookmarks;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      const response: BookmarkListResponse = {
        bookmarks: items.map(transformBookmarkPost),
        nextCursor,
        total,
      };

      return response;
    }),

  // Get a single bookmark by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.id,
          userId, // Ensure user can only access their own bookmarks
        },
        include: {
          media: true,
          collections: {
            include: {
              collection: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      // Increment view count
      await prisma.bookmarkPost.update({
        where: { id: input.id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return transformBookmarkPost({
        ...bookmark,
        viewCount: bookmark.viewCount + 1,
      });
    }),

  // Update a bookmark
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateBookmarkSchema,
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify ownership
      const existing = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existing) {
        throw new Error("Bookmark not found");
      }

      // Update bookmark
      const bookmark = await prisma.bookmarkPost.update({
        where: { id: input.id },
        data: {
          content: input.data.content,
          metadata: input.data.metadata as Prisma.InputJsonValue,
        },
        include: {
          media: true,
          collections: {
            include: {
              collection: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      return transformBookmarkPost(bookmark);
    }),

  // Delete a bookmark
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify ownership
      const existing = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existing) {
        throw new Error("Bookmark not found");
      }

      // Delete bookmark (cascade will handle media and associations)
      await prisma.bookmarkPost.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Full-text search with PostgreSQL
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        filters: bookmarkFiltersSchema.optional(),
        pagination: paginationSchema.optional(),
        sortBy: z.enum(["relevance", "date", "views"]).default("relevance"),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const filters = input.filters || {};
      const pagination = input.pagination || { limit: 20 };
      const limit = pagination.limit;

      // Build base where clause with filters
      const where: Prisma.BookmarkPostWhereInput = {
        userId,
      };

      if (filters.platform) {
        where.platform = filters.platform;
      }

      if (filters.authorUsername) {
        where.authorUsername = filters.authorUsername;
      }

      if (filters.dateFrom || filters.dateTo) {
        where.savedAt = {};
        if (filters.dateFrom) {
          where.savedAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.savedAt.lte = filters.dateTo;
        }
      }

      if (filters.collectionId) {
        where.collections = {
          some: {
            collectionId: filters.collectionId,
          },
        };
      }

      if (filters.categoryIds && filters.categoryIds.length > 0) {
        where.categories = {
          some: {
            categoryId: {
              in: filters.categoryIds,
            },
          },
        };
      }

      // Add cursor pagination
      if (pagination.cursor) {
        where.id = {
          lt: pagination.cursor,
        };
      }

      // Prepare search terms for PostgreSQL full-text search
      const searchTerms = input.query
        .trim()
        .split(/\s+/)
        .map((term) => `${term}:*`)
        .join(" & ");

      // Use raw SQL for full-text search with ranking
      // This searches across content and authorName fields
      const searchQuery = `
        SELECT 
          bp.*,
          ts_rank(
            to_tsvector('english', bp.content || ' ' || bp."authorName"),
            to_tsquery('english', $1)
          ) as rank
        FROM bookmark_post bp
        WHERE bp."userId" = $2
          AND to_tsvector('english', bp.content || ' ' || bp."authorName") @@ to_tsquery('english', $1)
          ${filters.platform ? `AND bp.platform = $3` : ""}
          ${
            filters.authorUsername
              ? `AND bp."authorUsername" = $${filters.platform ? 4 : 3}`
              : ""
          }
          ${
            filters.dateFrom
              ? `AND bp."savedAt" >= $${
                  filters.platform
                    ? filters.authorUsername
                      ? 5
                      : 4
                    : filters.authorUsername
                    ? 4
                    : 3
                }`
              : ""
          }
          ${
            filters.dateTo
              ? `AND bp."savedAt" <= $${
                  filters.platform
                    ? filters.authorUsername
                      ? filters.dateFrom
                        ? 6
                        : 5
                      : filters.dateFrom
                      ? 5
                      : 4
                    : filters.authorUsername
                    ? filters.dateFrom
                      ? 5
                      : 4
                    : filters.dateFrom
                    ? 4
                    : 3
                }`
              : ""
          }
        ORDER BY ${
          input.sortBy === "relevance"
            ? "rank DESC"
            : input.sortBy === "date"
            ? 'bp."savedAt" DESC'
            : 'bp."viewCount" DESC'
        }
        LIMIT $${
          filters.platform
            ? filters.authorUsername
              ? filters.dateFrom
                ? filters.dateTo
                  ? 7
                  : 6
                : filters.dateTo
                ? 6
                : 5
              : filters.dateFrom
              ? filters.dateTo
                ? 6
                : 5
              : filters.dateTo
              ? 5
              : 4
            : filters.authorUsername
            ? filters.dateFrom
              ? filters.dateTo
                ? 6
                : 5
              : filters.dateTo
              ? 5
              : 4
            : filters.dateFrom
            ? filters.dateTo
              ? 5
              : 4
            : filters.dateTo
            ? 4
            : 3
        }
      `;

      // Build parameters array
      const params: any[] = [searchTerms, userId];
      if (filters.platform) params.push(filters.platform);
      if (filters.authorUsername) params.push(filters.authorUsername);
      if (filters.dateFrom) params.push(filters.dateFrom);
      if (filters.dateTo) params.push(filters.dateTo);
      params.push(limit + 1);

      // Execute raw query
      const rawResults = await prisma.$queryRawUnsafe<any[]>(
        searchQuery,
        ...params
      );

      // Get IDs from raw results
      const bookmarkIds = rawResults.slice(0, limit).map((r) => r.id);

      // Fetch full bookmark data with relations
      const bookmarks = await prisma.bookmarkPost.findMany({
        where: {
          id: {
            in: bookmarkIds,
          },
        },
        include: {
          media: true,
          collections: {
            include: {
              collection: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
        },
      });

      // Sort bookmarks to match the order from search results
      const bookmarkMap = new Map(bookmarks.map((b) => [b.id, b]));
      const orderedBookmarks = bookmarkIds
        .map((id) => bookmarkMap.get(id))
        .filter((b): b is NonNullable<typeof b> => b !== undefined);

      // Get total count for search
      const countQuery = `
        SELECT COUNT(*) as count
        FROM bookmark_post bp
        WHERE bp."userId" = $2
          AND to_tsvector('english', bp.content || ' ' || bp."authorName") @@ to_tsquery('english', $1)
          ${filters.platform ? `AND bp.platform = $3` : ""}
          ${
            filters.authorUsername
              ? `AND bp."authorUsername" = $${filters.platform ? 4 : 3}`
              : ""
          }
          ${
            filters.dateFrom
              ? `AND bp."savedAt" >= $${
                  filters.platform
                    ? filters.authorUsername
                      ? 5
                      : 4
                    : filters.authorUsername
                    ? 4
                    : 3
                }`
              : ""
          }
          ${
            filters.dateTo
              ? `AND bp."savedAt" <= $${
                  filters.platform
                    ? filters.authorUsername
                      ? filters.dateFrom
                        ? 6
                        : 5
                      : filters.dateFrom
                      ? 5
                      : 4
                    : filters.authorUsername
                    ? filters.dateFrom
                      ? 5
                      : 4
                    : filters.dateFrom
                    ? 4
                    : 3
                }`
              : ""
          }
      `;

      const countParams = params.slice(0, -1); // Remove limit parameter
      const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        countQuery,
        ...countParams
      );
      const total = Number(countResult[0]?.count || 0);

      // Determine if there's a next page
      const hasMore = rawResults.length > limit;
      const nextCursor = hasMore
        ? orderedBookmarks[orderedBookmarks.length - 1]?.id
        : undefined;

      return {
        results: orderedBookmarks.map(transformBookmarkPost),
        nextCursor,
        total,
      };
    }),

  // Bulk import bookmarks
  bulkImport: protectedProcedure
    .input(
      bulkImportSchema.superRefine((data, ctx) => {
        // Validate each bookmark and provide detailed error paths
        data.bookmarks.forEach((bookmark, index) => {
          if (!bookmark.postId) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Missing postId`,
              path: ["bookmarks", index, "postId"],
            });
          }
          if (!bookmark.postUrl) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Missing postUrl`,
              path: ["bookmarks", index, "postUrl"],
            });
          }
          if (!bookmark.author?.name) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Missing author name`,
              path: ["bookmarks", index, "author", "name"],
            });
          }
          if (!bookmark.author?.username) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Missing author username`,
              path: ["bookmarks", index, "author", "username"],
            });
          }
          if (!bookmark.author?.profileUrl) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Missing author profileUrl`,
              path: ["bookmarks", index, "author", "profileUrl"],
            });
          }
        });
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { platform, bookmarks } = input;

      let successCount = 0;
      let failureCount = 0;
      const errors: Array<{ index: number; error: string }> = [];

      // Process bookmarks in a transaction
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < bookmarks.length; i++) {
          const bookmark = bookmarks[i];
          if (!bookmark) continue;

          try {
            // Check for duplicate
            const existing = await tx.bookmarkPost.findUnique({
              where: {
                userId_platform_postId: {
                  userId,
                  platform,
                  postId: bookmark.postId,
                },
              },
            });

            if (existing) {
              // Skip duplicate
              failureCount++;
              errors.push({
                index: i,
                error: `Bookmark with postId ${bookmark.postId} already exists`,
              });
              continue;
            }

            // Parse timestamp
            const createdAt = new Date(bookmark.timestamp);
            if (isNaN(createdAt.getTime())) {
              failureCount++;
              errors.push({
                index: i,
                error: `Invalid timestamp: ${bookmark.timestamp}`,
              });
              continue;
            }

            // Create bookmark
            await tx.bookmarkPost.create({
              data: {
                userId,
                platform,
                postId: bookmark.postId,
                postUrl: bookmark.postUrl,
                content: bookmark.content,
                authorName: bookmark.author.name,
                authorUsername: bookmark.author.username,
                authorProfileUrl: bookmark.author.profileUrl,
                createdAt,
                metadata: bookmark.metadata as Prisma.InputJsonValue,
                media: bookmark.media
                  ? {
                      create: bookmark.media.map((m) => ({
                        type: m.type,
                        url: m.url,
                        thumbnailUrl: m.thumbnailUrl,
                        metadata: undefined,
                      })),
                    }
                  : undefined,
              },
            });

            successCount++;
          } catch (error) {
            failureCount++;
            errors.push({
              index: i,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      });

      return {
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),
};
