import { protectedProcedure } from "../index";
import { z } from "zod";
import prisma from "@my-better-t-app/db";
import type { Collection } from "@my-better-t-app/shared";

// Validation schemas
const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

// Helper function to transform Prisma result to Collection
function transformCollection(collection: any): Collection {
  return {
    id: collection.id,
    userId: collection.userId,
    name: collection.name,
    description: collection.description,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    bookmarks: collection.bookmarks?.map((bc: any) => ({
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
      metadata: bc.bookmarkPost.metadata as Record<string, any> | undefined,
      media: bc.bookmarkPost.media?.map((m: any) => ({
        id: m.id,
        bookmarkPostId: m.bookmarkPostId,
        type: m.type,
        url: m.url,
        thumbnailUrl: m.thumbnailUrl,
        metadata: m.metadata as Record<string, any> | undefined,
      })),
    })),
  };
}

export const collectionsRouter = {
  // Create a new collection
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

  // List all collections for the user
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

  // Get a single collection by ID with bookmarks
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

  // Update a collection
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateCollectionSchema,
      })
    )
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify ownership
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

  // Delete a collection
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;

      // Verify ownership
      const existing = await prisma.collection.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existing) {
        throw new Error("Collection not found");
      }

      // Delete collection (cascade will handle bookmark associations)
      await prisma.collection.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Add a bookmark to a collection
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
