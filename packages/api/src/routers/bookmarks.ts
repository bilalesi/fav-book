import { protectedProcedure } from "../index";
import { z } from "zod";
import prisma, { Prisma } from "@favy/db";
import { validateAndNormalizeUrl } from "../lib/url-normalizer";
import { extractMetadata } from "../lib/metadata-extractor";
import { tasks } from "@trigger.dev/sdk/v3";
import type { BookmarkEnrichmentInput } from "@favy/trigger";
import { isEnrichmentEnabled, isMediaDownloadEnabled } from "../lib/utils";
import { Prisma as PrismaType } from "@prisma/client";

const platformSchema = z.enum(["TWITTER", "LINKEDIN", "GENERIC_URL"]);
const mediaTypeSchema = z.enum(["IMAGE", "VIDEO", "LINK"]);

const mediaTypeInputSchema = z
  .string()
  .transform((val) => val.toUpperCase())
  .pipe(z.enum(["IMAGE", "VIDEO", "LINK"]));

const createMediaSchema = z.object({
  type: mediaTypeSchema,
  url: z.url("Invalid media URL"),
  thumbnailUrl: z.url("Invalid thumbnail URL").optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createBookmarkSchema = z.object({
  platform: platformSchema,
  postId: z.string().min(1),
  postUrl: z.url(),
  content: z.string(),
  authorName: z.string().min(1),
  authorUsername: z.string().min(1),
  authorProfileUrl: z.url(),
  createdAt: z.coerce.date(),
  metadata: z.record(z.string(), z.any()).optional(),
  media: z.array(createMediaSchema).optional(),
});

const updateBookmarkSchema = z.object({
  content: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  collectionIds: z.array(z.string()).optional(),
});

const bookmarkFiltersSchema = z.object({
  platform: platformSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  authorUsername: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
  // New fields for enhanced filtering
  platforms: z.array(platformSchema).optional(),
  authorUsernameContains: z.string().optional(),
  createdAtFrom: z.coerce.date().optional(),
  createdAtTo: z.coerce.date().optional(),
  excludeCategoryIds: z.array(z.string()).optional(),
  contentSearch: z.string().optional(),
});

const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(["savedAt", "createdAt"]).default("savedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const bookmarkImportDataSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  postUrl: z.url("Invalid post URL"),
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

// Helper function to spawn enrichment workflow
async function spawnEnrichmentWorkflow(
  bookmarkId: string,
  userId: string,
  platform: string,
  url: string,
  content: string
): Promise<string | null> {
  try {
    // Check if enrichment is enabled via feature flags
    if (!isEnrichmentEnabled()) {
      console.log(
        `[Enrichment] Skipped for bookmark ${bookmarkId} - enrichment disabled`
      );
      return null;
    }

    const payload: BookmarkEnrichmentInput = {
      bookmarkId,
      userId,
      platform: platform as "TWITTER" | "LINKEDIN" | "GENERIC_URL",
      url,
      content,
      enableMediaDownload: isMediaDownloadEnabled(),
    };

    // Trigger the workflow
    const handle = await tasks.trigger("bookmark-enrichment", payload);

    console.log(`[Enrichment] Workflow spawned for bookmark ${bookmarkId}`, {
      workflowId: handle.id,
      enableMediaDownload: payload.enableMediaDownload,
    });

    return handle.id;
  } catch (error) {
    console.error(
      `[Enrichment] Failed to spawn workflow for bookmark ${bookmarkId}:`,
      error
    );
    // Don't throw - enrichment failure shouldn't block bookmark creation
    return null;
  }
}

export type GetBookmarkPost = PrismaType.Result<
  typeof prisma.bookmarkPost,
  {
    include: {
      media: true;
      collections: {
        include: {
          collection: true;
        };
      };
      categories: {
        include: {
          category: true;
        };
      };
      enrichment: true;
    };
  },
  "findFirst"
> & {
  viewCount: number;
};

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

      // Spawn enrichment workflow asynchronously
      const workflowId = await spawnEnrichmentWorkflow(
        bookmark.id,
        userId,
        input.platform,
        input.postUrl,
        input.content
      );

      // Create enrichment record if workflow was spawned
      if (workflowId) {
        await prisma.bookmarkEnrichment.create({
          data: {
            bookmarkPostId: bookmark.id,
            processingStatus: "PENDING",
            workflowId,
          },
        });
      }

      return bookmark;
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
      const pagination = input.pagination || {
        limit: 20,
        sortBy: "savedAt" as const,
        sortOrder: "desc" as const,
      };
      const limit = pagination.limit;

      // Build where clause
      const where: Prisma.BookmarkPostWhereInput = {
        userId,
      };

      // Handle platform filter (single platform)
      if (filters.platform) {
        where.platform = filters.platform;
      }

      // Handle platforms filter (multiple platforms using OR)
      if (filters.platforms && filters.platforms.length > 0) {
        where.platform = {
          in: filters.platforms,
        };
      }

      // Handle exact author username match
      if (filters.authorUsername) {
        where.authorUsername = filters.authorUsername;
      }

      // Handle author username contains (partial match)
      if (filters.authorUsernameContains) {
        where.authorUsername = {
          contains: filters.authorUsernameContains,
          mode: "insensitive",
        };
      }

      // Handle savedAt date range filter
      if (filters.dateFrom || filters.dateTo) {
        where.savedAt = {};
        if (filters.dateFrom) {
          where.savedAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.savedAt.lte = filters.dateTo;
        }
      }

      // Handle createdAt date range filter
      if (filters.createdAtFrom || filters.createdAtTo) {
        where.createdAt = {};
        if (filters.createdAtFrom) {
          where.createdAt.gte = filters.createdAtFrom;
        }
        if (filters.createdAtTo) {
          where.createdAt.lte = filters.createdAtTo;
        }
      }

      if (filters.collectionId) {
        where.collections = {
          some: {
            collectionId: filters.collectionId,
          },
        };
      }

      // Handle category inclusion filter
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        where.categories = {
          some: {
            categoryId: {
              in: filters.categoryIds,
            },
          },
        };
      }

      // Handle category exclusion filter
      if (filters.excludeCategoryIds && filters.excludeCategoryIds.length > 0) {
        where.categories = {
          none: {
            categoryId: {
              in: filters.excludeCategoryIds,
            },
          },
        };
      }

      // Handle content search using full-text search
      if (filters.contentSearch) {
        // Prepare search terms for PostgreSQL full-text search
        const searchTerms = filters.contentSearch
          .trim()
          .split(/\s+/)
          .map((term) => `${term}:*`)
          .join(" & ");

        // Use raw SQL for full-text search
        const searchResults = await prisma.$queryRawUnsafe<
          Array<{ id: string }>
        >(
          `
          SELECT id
          FROM bookmark_post
          WHERE "userId" = $1
            AND to_tsvector('english', content || ' ' || "authorName") @@ to_tsquery('english', $2)
          `,
          userId,
          searchTerms
        );

        // Add the matching IDs to the where clause
        const matchingIds = searchResults.map((r) => r.id);
        if (matchingIds.length > 0) {
          where.id = {
            in: matchingIds,
          };
        } else {
          // No matches found, return empty result
          return {
            bookmarks: [],
            nextCursor: undefined,
            total: 0,
          };
        }
      }

      // Add cursor pagination
      if (pagination.cursor) {
        where.id = {
          ...(where.id as any),
          lt: pagination.cursor,
        };
      }

      // Fetch bookmarks
      const bookmarks = await prisma.bookmarkPost.findMany({
        where,
        take: limit + 1, // Fetch one extra to determine if there's a next page
        orderBy: {
          [pagination.sortBy]: pagination.sortOrder,
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

      const response = {
        bookmarks,
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
          enrichment: true,
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

      return {
        ...bookmark,
        viewCount: bookmark.viewCount + 1,
      };
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
        include: {
          collections: true,
        },
      });

      if (!existing) {
        throw new Error("Bookmark not found");
      }

      // Handle collection updates if provided
      if (input.data.collectionIds !== undefined) {
        const currentCollectionIds = existing.collections.map(
          (c) => c.collectionId
        );
        const newCollectionIds = input.data.collectionIds;

        // Find collections to add and remove
        const collectionsToAdd = newCollectionIds.filter(
          (id) => !currentCollectionIds.includes(id)
        );
        const collectionsToRemove = currentCollectionIds.filter(
          (id) => !newCollectionIds.includes(id)
        );

        // Verify all new collections exist and belong to user
        if (collectionsToAdd.length > 0) {
          const collections = await prisma.collection.findMany({
            where: {
              id: { in: collectionsToAdd },
              userId,
            },
          });

          if (collections.length !== collectionsToAdd.length) {
            throw new Error("One or more collections not found");
          }
        }

        // Remove old associations
        if (collectionsToRemove.length > 0) {
          await prisma.bookmarkPostCollection.deleteMany({
            where: {
              bookmarkPostId: input.id,
              collectionId: { in: collectionsToRemove },
            },
          });
        }

        // Add new associations
        if (collectionsToAdd.length > 0) {
          await prisma.bookmarkPostCollection.createMany({
            data: collectionsToAdd.map((collectionId) => ({
              bookmarkPostId: input.id,
              collectionId,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Update bookmark content and metadata
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

      return bookmark;
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
      const pagination = input.pagination || {
        limit: 20,
        sortBy: "savedAt" as const,
        sortOrder: "desc" as const,
      };
      const limit = pagination.limit;

      // Build base where clause with filters
      const where: Prisma.BookmarkPostWhereInput = {
        userId,
      };

      // Handle platform filter (single platform)
      if (filters.platform) {
        where.platform = filters.platform;
      }

      // Handle platforms filter (multiple platforms using OR)
      if (filters.platforms && filters.platforms.length > 0) {
        where.platform = {
          in: filters.platforms,
        };
      }

      // Handle exact author username match
      if (filters.authorUsername) {
        where.authorUsername = filters.authorUsername;
      }

      // Handle author username contains (partial match)
      if (filters.authorUsernameContains) {
        where.authorUsername = {
          contains: filters.authorUsernameContains,
          mode: "insensitive",
        };
      }

      // Handle savedAt date range filter
      if (filters.dateFrom || filters.dateTo) {
        where.savedAt = {};
        if (filters.dateFrom) {
          where.savedAt.gte = filters.dateFrom;
        }
        if (filters.dateTo) {
          where.savedAt.lte = filters.dateTo;
        }
      }

      // Handle createdAt date range filter
      if (filters.createdAtFrom || filters.createdAtTo) {
        where.createdAt = {};
        if (filters.createdAtFrom) {
          where.createdAt.gte = filters.createdAtFrom;
        }
        if (filters.createdAtTo) {
          where.createdAt.lte = filters.createdAtTo;
        }
      }

      if (filters.collectionId) {
        where.collections = {
          some: {
            collectionId: filters.collectionId,
          },
        };
      }

      // Handle category inclusion filter
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        where.categories = {
          some: {
            categoryId: {
              in: filters.categoryIds,
            },
          },
        };
      }

      // Handle category exclusion filter
      if (filters.excludeCategoryIds && filters.excludeCategoryIds.length > 0) {
        where.categories = {
          none: {
            categoryId: {
              in: filters.excludeCategoryIds,
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
      const params: (string | Date | number)[] = [searchTerms, userId];
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
        results: orderedBookmarks,
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
      // Use a Map to store created bookmarks with their original data
      const successfulBookmarks = new Map<
        string,
        { dbId: string; originalData: (typeof bookmarks)[number] }
      >();

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
            const created = await tx.bookmarkPost.create({
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

            // Store the created bookmark ID with its original data
            successfulBookmarks.set(created.id, {
              dbId: created.id,
              originalData: bookmark,
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

      // Spawn enrichment workflows for all successfully created bookmarks
      // Do this outside the transaction to avoid blocking
      if (successfulBookmarks.size > 0) {
        console.log(
          `[Bulk Import] Spawning enrichment workflows for ${successfulBookmarks.size} bookmarks`
        );

        // Spawn workflows in parallel but don't wait for them
        Promise.all(
          Array.from(successfulBookmarks.entries()).map(
            async ([bookmarkId, { originalData }]) => {
              const workflowId = await spawnEnrichmentWorkflow(
                bookmarkId,
                userId,
                platform,
                originalData.postUrl,
                originalData.content
              );

              // Create enrichment record if workflow was spawned
              if (workflowId) {
                await prisma.bookmarkEnrichment
                  .create({
                    data: {
                      bookmarkPostId: bookmarkId,
                      processingStatus: "PENDING",
                      workflowId,
                    },
                  })
                  .catch((err) => {
                    console.error(
                      `[Bulk Import] Failed to create enrichment record for ${bookmarkId}:`,
                      err
                    );
                  });
              }
            }
          )
        ).catch((err) => {
          console.error("[Bulk Import] Error spawning workflows:", err);
        });
      }

      return {
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // Create URL bookmark with metadata extraction
  // Requirements: 1.1, 1.3, 3.1, 3.2, 4.1, 4.4
  createUrlBookmark: protectedProcedure
    .input(
      z.object({
        url: z.string().min(1, "URL is required"),
        title: z.string().optional(),
        description: z.string().optional(),
        collectionIds: z.array(z.string()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Validate and normalize URL (Requirement 2.1, 5.1)
      // Requirements: 1.3, 1.5, 4.2
      let normalizedUrl: string;
      try {
        normalizedUrl = validateAndNormalizeUrl(input.url);
      } catch (error) {
        // Return user-friendly error message (Requirement 1.3)
        const errorMessage =
          error instanceof Error ? error.message : "Invalid URL format";
        throw new Error(
          `Unable to save bookmark: ${errorMessage}. Please check the URL and try again.`
        );
      }

      // Check for duplicate bookmarks using normalized URL (Requirement 1.3)
      const existingBookmark = await prisma.bookmarkPost.findFirst({
        where: {
          userId,
          platform: "GENERIC_URL",
          postUrl: normalizedUrl,
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

      if (existingBookmark) {
        throw new Error(
          "This URL is already in your bookmarks. You can find it in your bookmarks list."
        );
      }

      // Verify collections exist and belong to user if specified
      if (input.collectionIds && input.collectionIds.length > 0) {
        const collections = await prisma.collection.findMany({
          where: {
            id: { in: input.collectionIds },
            userId,
          },
        });

        if (collections.length !== input.collectionIds.length) {
          throw new Error(
            "One or more selected collections could not be found. Please refresh and try again."
          );
        }
      }

      // Extract metadata if title/description not provided (Requirement 4.1, 4.2, 4.3)
      let title = input.title;
      let description = input.description;
      let extractedMetadata = input.metadata || {};
      let metadataExtractionFailed = false;

      if (!title || !description) {
        try {
          const metadata = await extractMetadata(normalizedUrl);
          title = title || metadata.title;
          description = description || metadata.description;
          extractedMetadata = {
            ...extractedMetadata,
            favicon: metadata.favicon,
            ogImage: metadata.ogImage,
            ogTitle: metadata.ogTitle,
            ogDescription: metadata.ogDescription,
            domain: metadata.domain,
            extractedAt: new Date().toISOString(),
          };
        } catch (error) {
          // Handle metadata extraction failures gracefully (Requirement 4.2, 4.5)
          metadataExtractionFailed = true;
          console.warn(
            `[Metadata Extraction] Failed for ${normalizedUrl}:`,
            error instanceof Error ? error.message : "Unknown error"
          );
          const urlObj = new URL(normalizedUrl);
          title = title || urlObj.hostname;
          extractedMetadata = {
            ...extractedMetadata,
            domain: urlObj.hostname,
            extractedAt: new Date().toISOString(),
            extractionFailed: true,
          };
        }
      }

      // Generate a unique postId for the URL bookmark
      const postId = `url_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      // Extract domain for author fields
      const urlObj = new URL(normalizedUrl);
      const domain = urlObj.hostname;

      // Create bookmark with platform: GENERIC_URL (Requirement 1.1)
      try {
        const bookmark = await prisma.bookmarkPost.create({
          data: {
            userId,
            platform: "GENERIC_URL",
            postId,
            postUrl: normalizedUrl,
            content: description || "",
            authorName: domain,
            authorUsername: domain,
            authorProfileUrl: `${urlObj.protocol}//${domain}`,
            createdAt: new Date(),
            metadata: extractedMetadata as Prisma.InputJsonValue,
            // Associate with collections if specified (Requirement 3.1, 3.2)
            collections: input.collectionIds
              ? {
                  create: input.collectionIds.map((collectionId) => ({
                    collectionId,
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

        // Spawn enrichment workflow asynchronously
        // For URL bookmarks, pass the URL as content so the workflow can fetch the actual page content
        const workflowId = await spawnEnrichmentWorkflow(
          bookmark.id,
          userId,
          "GENERIC_URL",
          normalizedUrl,
          description || normalizedUrl // Use URL as fallback if description is empty
        );

        // Create enrichment record if workflow was spawned
        if (workflowId) {
          await prisma.bookmarkEnrichment.create({
            data: {
              bookmarkPostId: bookmark.id,
              processingStatus: "PENDING",
              workflowId,
            },
          });
        }

        const result = bookmark;

        // Add warning flag if metadata extraction failed
        if (metadataExtractionFailed) {
          return {
            ...result,
            warning:
              "Bookmark saved successfully, but we couldn't fetch the page details. The bookmark was saved with basic information.",
          };
        }

        return result;
      } catch (error) {
        // Log error for debugging (Requirement 1.5)
        console.error(
          `[Bookmark Creation] Failed to create bookmark for ${normalizedUrl}:`,
          error
        );

        // Return user-friendly error message
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          throw new Error(
            "This URL is already in your bookmarks. Please check your bookmarks list."
          );
        }

        throw new Error(
          "Failed to save bookmark. Please try again or contact support if the problem persists."
        );
      }
    }),

  // Check if URL is already bookmarked
  // Requirements: 5.1, 5.2
  checkUrlBookmarked: protectedProcedure
    .input(
      z.object({
        url: z.string().min(1, "URL is required"),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Normalize URL for consistent comparison (Requirement 5.1)
      let normalizedUrl: string;
      try {
        normalizedUrl = validateAndNormalizeUrl(input.url);
      } catch (error) {
        // If URL is invalid, return null
        return null;
      }

      // Query database for matching URL (Requirement 5.2)
      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          userId,
          platform: "GENERIC_URL",
          postUrl: normalizedUrl,
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

      // Return bookmark if exists, null otherwise
      return bookmark ?? null;
    }),

  // Bulk delete bookmarks
  bulkDelete: protectedProcedure
    .input(
      z.object({
        bookmarkIds: z
          .array(z.string())
          .min(1, "At least one bookmark ID is required"),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { bookmarkIds } = input;

      // Verify all bookmarks belong to the user
      const bookmarks = await prisma.bookmarkPost.findMany({
        where: {
          id: { in: bookmarkIds },
          userId,
        },
        select: { id: true },
      });

      if (bookmarks.length !== bookmarkIds.length) {
        throw new Error(
          "One or more bookmarks not found or do not belong to you"
        );
      }

      // Delete all bookmarks (cascade will handle media and associations)
      await prisma.bookmarkPost.deleteMany({
        where: {
          id: { in: bookmarkIds },
          userId,
        },
      });

      return {
        success: true,
        deletedCount: bookmarks.length,
      };
    }),

  // Bulk add bookmarks to collections
  bulkAddToCollections: protectedProcedure
    .input(
      z.object({
        bookmarkIds: z
          .array(z.string())
          .min(1, "At least one bookmark ID is required"),
        collectionIds: z
          .array(z.string())
          .min(1, "At least one collection ID is required"),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { bookmarkIds, collectionIds } = input;

      // Verify all bookmarks belong to the user
      const bookmarks = await prisma.bookmarkPost.findMany({
        where: {
          id: { in: bookmarkIds },
          userId,
        },
        select: { id: true },
      });

      if (bookmarks.length !== bookmarkIds.length) {
        throw new Error(
          "One or more bookmarks not found or do not belong to you"
        );
      }

      // Verify all collections belong to the user
      const collections = await prisma.collection.findMany({
        where: {
          id: { in: collectionIds },
          userId,
        },
        select: { id: true },
      });

      if (collections.length !== collectionIds.length) {
        throw new Error(
          "One or more collections not found or do not belong to you"
        );
      }

      // Create all associations (skip duplicates)
      const associations = bookmarkIds.flatMap((bookmarkId) =>
        collectionIds.map((collectionId) => ({
          bookmarkPostId: bookmarkId,
          collectionId,
        }))
      );

      await prisma.bookmarkPostCollection.createMany({
        data: associations,
        skipDuplicates: true,
      });

      return {
        success: true,
        bookmarkCount: bookmarks.length,
        collectionCount: collections.length,
      };
    }),

  // Get enrichment status for a bookmark
  getEnrichmentStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify bookmark ownership
      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.id,
          userId,
        },
        include: {
          enrichment: true,
          downloadedMedia: {
            select: {
              id: true,
              type: true,
              downloadStatus: true,
              storageUrl: true,
              fileSize: true,
              duration: true,
              quality: true,
              format: true,
              errorMessage: true,
            },
          },
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      // Return enrichment status
      return {
        bookmarkId: bookmark.id,
        processingStatus: bookmark.enrichment?.processingStatus || "PENDING",
        workflowId: bookmark.enrichment?.workflowId,
        summary: bookmark.enrichment?.summary,
        keywords: bookmark.enrichment?.keywords as string[] | undefined,
        tags: bookmark.enrichment?.tags as string[] | undefined,
        enrichedAt: bookmark.enrichment?.enrichedAt,
        errorMessage: bookmark.enrichment?.errorMessage,
        downloadedMedia: bookmark.downloadedMedia.map((media) => ({
          id: media.id,
          type: media.type,
          downloadStatus: media.downloadStatus,
          storageUrl: media.storageUrl,
          fileSize: media.fileSize.toString(),
          duration: media.duration,
          quality: media.quality,
          format: media.format,
          errorMessage: media.errorMessage,
        })),
      };
    }),

  // Retry enrichment for a failed bookmark
  retryEnrichment: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify bookmark ownership and get bookmark data
      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.id,
          userId,
        },
        include: {
          enrichment: true,
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      // Check if enrichment exists and is in a retryable state
      if (bookmark.enrichment) {
        const status = bookmark.enrichment.processingStatus;
        if (status === "PROCESSING" || status === "PENDING") {
          throw new Error(
            "Enrichment is already in progress. Please wait for it to complete."
          );
        }
      }

      // Spawn new enrichment workflow
      const workflowId = await spawnEnrichmentWorkflow(
        bookmark.id,
        userId,
        bookmark.platform,
        bookmark.postUrl,
        bookmark.content
      );

      if (!workflowId) {
        throw new Error(
          "Failed to start enrichment workflow. Enrichment may be disabled."
        );
      }

      // Update or create enrichment record
      if (bookmark.enrichment) {
        await prisma.bookmarkEnrichment.update({
          where: { id: bookmark.enrichment.id },
          data: {
            processingStatus: "PENDING",
            workflowId,
            errorMessage: null,
          },
        });
      } else {
        await prisma.bookmarkEnrichment.create({
          data: {
            bookmarkPostId: bookmark.id,
            processingStatus: "PENDING",
            workflowId,
          },
        });
      }

      return {
        success: true,
        workflowId,
        message: "Enrichment retry started successfully",
      };
    }),

  // Batch import URLs
  // Requirements: 2.1, 2.2, 2.3, 2.4, 3.3
  batchImportUrls: protectedProcedure
    .input(
      z.object({
        urls: z
          .array(z.string().min(1, "URL cannot be empty"))
          .max(500, "Maximum 500 URLs allowed per batch"),
        collectionIds: z.array(z.string()).optional(),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const { urls, collectionIds, skipDuplicates } = input;

      // Implement rate limiting check (Requirement 1.5, 2.3)
      // Check if user has exceeded batch import limit
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentImports = await prisma.bookmarkPost.count({
        where: {
          userId,
          platform: "GENERIC_URL",
          savedAt: {
            gte: oneHourAgo,
          },
        },
      });

      // Allow up to 1000 URL imports per hour
      if (recentImports + urls.length > 1000) {
        throw new Error(
          `Rate limit exceeded. You can import up to 1000 URLs per hour. You have ${
            1000 - recentImports
          } imports remaining in this hour.`
        );
      }

      // Verify collections exist and belong to user if specified
      if (collectionIds && collectionIds.length > 0) {
        const collections = await prisma.collection.findMany({
          where: {
            id: { in: collectionIds },
            userId,
          },
        });

        if (collections.length !== collectionIds.length) {
          throw new Error(
            "One or more selected collections could not be found. Please refresh and try again."
          );
        }
      }

      let successCount = 0;
      let duplicateCount = 0;
      let failureCount = 0;
      const errors: Array<{ url: string; error: string }> = [];

      // Validate all URL formats before processing (Requirement 2.1, 2.3)
      const validatedUrls: Array<{ original: string; normalized: string }> = [];
      for (const url of urls) {
        try {
          const normalized = validateAndNormalizeUrl(url);
          validatedUrls.push({ original: url, normalized });
        } catch (error) {
          failureCount++;
          // Return user-friendly error messages (Requirement 2.3)
          const errorMessage =
            error instanceof Error ? error.message : "Invalid URL format";
          errors.push({
            url,
            error: `Invalid URL: ${errorMessage}`,
          });
        }
      }

      // Process URLs sequentially with duplicate detection (Requirement 2.2, 2.3)
      for (const { original, normalized } of validatedUrls) {
        try {
          // Check for duplicate
          const existing = await prisma.bookmarkPost.findFirst({
            where: {
              userId,
              platform: "GENERIC_URL",
              postUrl: normalized,
            },
          });

          if (existing) {
            if (skipDuplicates) {
              duplicateCount++;
              continue;
            } else {
              failureCount++;
              errors.push({
                url: original,
                error: "This URL is already in your bookmarks",
              });
              continue;
            }
          }

          // Extract metadata for each URL (Requirement 2.2)
          let description: string | undefined;
          let extractedMetadata: Record<string, any> = {};

          try {
            const metadata = await extractMetadata(normalized);
            description = metadata.description;
            extractedMetadata = {
              title: metadata.title,
              favicon: metadata.favicon,
              ogImage: metadata.ogImage,
              ogTitle: metadata.ogTitle,
              ogDescription: metadata.ogDescription,
              domain: metadata.domain,
              extractedAt: new Date().toISOString(),
            };
          } catch (error) {
            // Handle metadata extraction failures gracefully (Requirement 4.2, 4.5)
            console.warn(
              `[Batch Import] Metadata extraction failed for ${normalized}:`,
              error instanceof Error ? error.message : "Unknown error"
            );
            const urlObj = new URL(normalized);
            extractedMetadata = {
              title: urlObj.hostname,
              domain: urlObj.hostname,
              extractedAt: new Date().toISOString(),
              extractionFailed: true,
            };
          }

          // Generate unique postId
          const postId = `url_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;

          // Extract domain for author fields
          const urlObj = new URL(normalized);
          const domain = urlObj.hostname;

          // Create bookmark in database (Requirement 2.2)
          await prisma.bookmarkPost.create({
            data: {
              userId,
              platform: "GENERIC_URL",
              postId,
              postUrl: normalized,
              content: description || "",
              authorName: domain,
              authorUsername: domain,
              authorProfileUrl: `${urlObj.protocol}//${domain}`,
              createdAt: new Date(),
              metadata: extractedMetadata as Prisma.InputJsonValue,
              // Associate with collections if specified (Requirement 3.3)
              collections: collectionIds
                ? {
                    create: collectionIds.map((collectionId) => ({
                      collectionId,
                    })),
                  }
                : undefined,
            },
          });

          successCount++;
        } catch (error) {
          // Log errors for debugging (Requirement 1.5)
          console.error(
            `[Batch Import] Failed to import ${original}:`,
            error instanceof Error ? error.message : "Unknown error"
          );

          failureCount++;
          // Return user-friendly error messages (Requirement 2.3)
          const errorMessage =
            error instanceof Error ? error.message : "Failed to save bookmark";
          errors.push({
            url: original,
            error: errorMessage.includes("Unique constraint")
              ? "This URL is already in your bookmarks"
              : errorMessage,
          });
        }
      }

      // Return detailed summary with error information (Requirement 2.4)
      return {
        successCount,
        duplicateCount,
        failureCount,
        total: urls.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),
};
