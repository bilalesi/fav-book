import { protectedProcedure } from "../index";
import { z } from "zod";
import prisma, { Prisma } from "@favy/db";
import type { Collection } from "@favy/shared";

const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

type CollectionWithBookmarks = Prisma.CollectionGetPayload<{
  include: {
    bookmarks: {
      include: {
        bookmarkPost: {
          include: {
            media: true;
            categories: {
              include: {
                category: true;
              };
            };
            collections: {
              include: {
                collection: true;
              };
            };
          };
        };
      };
    };
  };
}>;

function transformCollection(
  collection: CollectionWithBookmarks | Prisma.CollectionGetPayload<object>
): Collection {
  const bookmarks =
    "bookmarks" in collection && collection.bookmarks
      ? collection.bookmarks.map((bc) => ({
          id: bc.bookmarkPost.id,
          userId: bc.bookmarkPost.userId,
          platform: bc.bookmarkPost.platform,
          postId: bc.bookmarkPost.postId,
          postUrl: bc.bookmarkPost.postUrl,
          content: bc.bookmarkPost.content,
          authorName: bc.bookmarkPost.authorName,
          authorUsername: bc.bookmarkPost.authorUsername,
          authorProfileUrl: bc.bookmarkPost.authorProfileUrl,
          savedAt: bc.bookmarkPost.savedAt,
          createdAt: bc.bookmarkPost.createdAt,
          viewCount: bc.bookmarkPost.viewCount,
          metadata: bc.bookmarkPost.metadata
            ? (bc.bookmarkPost.metadata as Prisma.JsonObject)
            : undefined,
          media:
            "media" in bc.bookmarkPost && bc.bookmarkPost.media
              ? bc.bookmarkPost.media.map((m) => ({
                  id: m.id,
                  bookmarkPostId: m.bookmarkPostId,
                  type: m.type,
                  url: m.url,
                  thumbnailUrl: m.thumbnailUrl ?? undefined,
                  metadata: m.metadata
                    ? (m.metadata as Prisma.JsonObject)
                    : undefined,
                }))
              : undefined,
          categories:
            "categories" in bc.bookmarkPost && bc.bookmarkPost.categories
              ? bc.bookmarkPost.categories.map((cat) => ({
                  id: cat.category.id,
                  name: cat.category.name,
                  userId: cat.category.userId ?? undefined,
                  isSystem: cat.category.isSystem,
                  createdAt: cat.category.createdAt,
                }))
              : undefined,
          collections:
            "collections" in bc.bookmarkPost && bc.bookmarkPost.collections
              ? bc.bookmarkPost.collections.map((coll) => ({
                  id: coll.collection.id,
                  userId: coll.collection.userId,
                  name: coll.collection.name,
                  description: coll.collection.description ?? undefined,
                  createdAt: coll.collection.createdAt,
                  updatedAt: coll.collection.updatedAt,
                }))
              : undefined,
        }))
      : undefined;

  return {
    id: collection.id,
    userId: collection.userId,
    name: collection.name,
    description: collection.description ?? undefined,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    bookmarks,
  };
}

export const collectionsRouter = {
  create: protectedProcedure
    .input(createCollectionSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const collection = await prisma.collection.create({
        data: {
          userId,
          name: input.name,
          description: input.description,
        },
      });

      return transformCollection(collection);
    }),

  list: protectedProcedure.handler(async ({ context }) => {
    const userId = context.session.user.id;

    const collections = await prisma.collection.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        _count: {
          select: {
            bookmarks: true,
          },
        },
      },
    });

    return collections.map((collection) => ({
      ...transformCollection(collection),
      bookmarkCount: collection._count.bookmarks,
    }));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const collection = await prisma.collection.findFirst({
        where: {
          id: input.id,
          userId, // Ensure user can only access their own collections
        },
        include: {
          bookmarks: {
            include: {
              bookmarkPost: {
                include: {
                  media: true,
                  categories: {
                    include: {
                      category: true,
                    },
                  },
                  collections: {
                    include: {
                      collection: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              addedAt: "desc",
            },
          },
        },
      });

      if (!collection) {
        throw new Error("Collection not found");
      }

      return transformCollection(collection);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateCollectionSchema,
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.collection.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existing) {
        throw new Error("Collection not found");
      }

      // Update collection
      const collection = await prisma.collection.update({
        where: { id: input.id },
        data: {
          name: input.data.name,
          description: input.data.description,
        },
      });

      return transformCollection(collection);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      const existing = await prisma.collection.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existing) {
        throw new Error("Collection not found");
      }

      await prisma.collection.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  addBookmark: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        bookmarkId: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify collection ownership
      const collection = await prisma.collection.findFirst({
        where: {
          id: input.collectionId,
          userId,
        },
      });

      if (!collection) {
        throw new Error("Collection not found");
      }

      // Verify bookmark ownership
      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.bookmarkId,
          userId,
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      // Check if association already exists
      const existingAssociation =
        await prisma.bookmarkPostCollection.findUnique({
          where: {
            bookmarkPostId_collectionId: {
              bookmarkPostId: input.bookmarkId,
              collectionId: input.collectionId,
            },
          },
        });

      if (existingAssociation) {
        throw new Error("Bookmark is already in this collection");
      }

      // Create association
      await prisma.bookmarkPostCollection.create({
        data: {
          bookmarkPostId: input.bookmarkId,
          collectionId: input.collectionId,
        },
      });

      return { success: true };
    }),

  // Remove a bookmark from a collection
  removeBookmark: protectedProcedure
    .input(
      z.object({
        collectionId: z.string(),
        bookmarkId: z.string(),
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify collection ownership
      const collection = await prisma.collection.findFirst({
        where: {
          id: input.collectionId,
          userId,
        },
      });

      if (!collection) {
        throw new Error("Collection not found");
      }

      // Verify bookmark ownership
      const bookmark = await prisma.bookmarkPost.findFirst({
        where: {
          id: input.bookmarkId,
          userId,
        },
      });

      if (!bookmark) {
        throw new Error("Bookmark not found");
      }

      // Check if association exists
      const existingAssociation =
        await prisma.bookmarkPostCollection.findUnique({
          where: {
            bookmarkPostId_collectionId: {
              bookmarkPostId: input.bookmarkId,
              collectionId: input.collectionId,
            },
          },
        });

      if (!existingAssociation) {
        throw new Error("Bookmark is not in this collection");
      }

      // Delete association
      await prisma.bookmarkPostCollection.delete({
        where: {
          bookmarkPostId_collectionId: {
            bookmarkPostId: input.bookmarkId,
            collectionId: input.collectionId,
          },
        },
      });

      return { success: true };
    }),
};
