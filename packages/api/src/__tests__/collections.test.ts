import { describe, it, expect, beforeEach } from "bun:test";
import { collectionsRouter } from "../routers/collections";
import { bookmarksRouter } from "../routers/bookmarks";
import { createTestContext, createTestBookmarkData } from "./setup";
import prisma from "@my-better-t-app/db";

describe("Collections Router", () => {
  const userId = "test-user-collections";
  const context = createTestContext(userId);

  beforeEach(async () => {
    // Create test user if not exists
    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: `${userId}@example.com`,
        name: "Test User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {},
    });
  });

  describe("create", () => {
    it("should create a new collection", async () => {
      const input = {
        name: "Test Collection",
        description: "Test description",
      };

      const result = await collectionsRouter.create.handler({
        input,
        context,
      });

      expect(result).toBeDefined();
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.userId).toBe(userId);
    });

    it("should create a collection without description", async () => {
      const input = {
        name: "Minimal Collection",
      };

      const result = await collectionsRouter.create.handler({
        input,
        context,
      });

      expect(result.name).toBe(input.name);
      expect(result.description).toBeUndefined();
    });
  });

  describe("list", () => {
    it("should list all collections for user", async () => {
      // Create test collections
      await collectionsRouter.create.handler({
        input: { name: "Collection 1" },
        context,
      });
      await collectionsRouter.create.handler({
        input: { name: "Collection 2" },
        context,
      });

      const result = await collectionsRouter.list.handler({ context });

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it("should include bookmark count", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      // Create and add a bookmark
      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      await collectionsRouter.addBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      const result = await collectionsRouter.list.handler({ context });

      expect(result[0]?.bookmarkCount).toBe(1);
    });
  });

  describe("get", () => {
    it("should get a collection by id", async () => {
      const created = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const result = await collectionsRouter.get.handler({
        input: { id: created.id },
        context,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.name).toBe(created.name);
    });

    it("should include bookmarks in collection", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      await collectionsRouter.addBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      const result = await collectionsRouter.get.handler({
        input: { id: collection.id },
        context,
      });

      expect(result.bookmarks).toBeDefined();
      expect(result.bookmarks?.length).toBe(1);
    });

    it("should throw error for non-existent collection", async () => {
      await expect(
        collectionsRouter.get.handler({
          input: { id: "non-existent-id" },
          context,
        })
      ).rejects.toThrow("Collection not found");
    });
  });

  describe("update", () => {
    it("should update collection name and description", async () => {
      const created = await collectionsRouter.create.handler({
        input: { name: "Original Name" },
        context,
      });

      const result = await collectionsRouter.update.handler({
        input: {
          id: created.id,
          data: {
            name: "Updated Name",
            description: "Updated description",
          },
        },
        context,
      });

      expect(result.name).toBe("Updated Name");
      expect(result.description).toBe("Updated description");
    });

    it("should throw error for non-existent collection", async () => {
      await expect(
        collectionsRouter.update.handler({
          input: {
            id: "non-existent-id",
            data: { name: "test" },
          },
          context,
        })
      ).rejects.toThrow("Collection not found");
    });
  });

  describe("delete", () => {
    it("should delete a collection", async () => {
      const created = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const result = await collectionsRouter.delete.handler({
        input: { id: created.id },
        context,
      });

      expect(result.success).toBe(true);

      // Verify deletion
      const collections = await prisma.collection.findMany({
        where: { id: created.id },
      });
      expect(collections.length).toBe(0);
    });

    it("should preserve bookmarks when deleting collection", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      await collectionsRouter.addBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      await collectionsRouter.delete.handler({
        input: { id: collection.id },
        context,
      });

      // Verify bookmark still exists
      const bookmarks = await prisma.bookmarkPost.findMany({
        where: { id: bookmark.id },
      });
      expect(bookmarks.length).toBe(1);
    });
  });

  describe("addBookmark", () => {
    it("should add a bookmark to collection", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      const result = await collectionsRouter.addBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      expect(result.success).toBe(true);

      // Verify association
      const association = await prisma.bookmarkPostCollection.findUnique({
        where: {
          bookmarkPostId_collectionId: {
            bookmarkPostId: bookmark.id,
            collectionId: collection.id,
          },
        },
      });
      expect(association).toBeDefined();
    });

    it("should throw error for duplicate association", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      await collectionsRouter.addBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      await expect(
        collectionsRouter.addBookmark.handler({
          input: {
            collectionId: collection.id,
            bookmarkId: bookmark.id,
          },
          context,
        })
      ).rejects.toThrow("Bookmark is already in this collection");
    });
  });

  describe("removeBookmark", () => {
    it("should remove a bookmark from collection", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      await collectionsRouter.addBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      const result = await collectionsRouter.removeBookmark.handler({
        input: {
          collectionId: collection.id,
          bookmarkId: bookmark.id,
        },
        context,
      });

      expect(result.success).toBe(true);

      // Verify association removed
      const association = await prisma.bookmarkPostCollection.findUnique({
        where: {
          bookmarkPostId_collectionId: {
            bookmarkPostId: bookmark.id,
            collectionId: collection.id,
          },
        },
      });
      expect(association).toBeNull();
    });

    it("should throw error if bookmark not in collection", async () => {
      const collection = await collectionsRouter.create.handler({
        input: { name: "Test Collection" },
        context,
      });

      const bookmark = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      await expect(
        collectionsRouter.removeBookmark.handler({
          input: {
            collectionId: collection.id,
            bookmarkId: bookmark.id,
          },
          context,
        })
      ).rejects.toThrow("Bookmark is not in this collection");
    });
  });
});
