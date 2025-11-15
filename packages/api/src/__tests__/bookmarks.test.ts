import { describe, it, expect, beforeEach } from "bun:test";
import { bookmarksRouter } from "../routers/bookmarks";
import { createTestContext, createTestBookmarkData } from "./setup";
import prisma from "@my-better-t-app/db";

describe("Bookmarks Router", () => {
  const userId = "test-user-bookmarks";
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
    it("should create a new bookmark", async () => {
      const input = createTestBookmarkData();

      const result = await bookmarksRouter.create.handler({
        input,
        context,
      });

      expect(result).toBeDefined();
      expect(result.platform).toBe(input.platform);
      expect(result.postId).toBe(input.postId);
      expect(result.content).toBe(input.content);
      expect(result.userId).toBe(userId);
    });

    it("should create a bookmark with media", async () => {
      const input = createTestBookmarkData({
        media: [
          {
            type: "IMAGE" as const,
            url: "https://example.com/image.jpg",
            thumbnailUrl: "https://example.com/thumb.jpg",
          },
        ],
      });

      const result = await bookmarksRouter.create.handler({
        input,
        context,
      });

      expect(result.media).toBeDefined();
      expect(result.media?.length).toBe(1);
      expect(result.media?.[0]?.type).toBe("IMAGE");
    });

    it("should throw error for duplicate bookmark", async () => {
      const input = createTestBookmarkData();

      // Create first bookmark
      await bookmarksRouter.create.handler({ input, context });

      // Try to create duplicate
      await expect(
        bookmarksRouter.create.handler({ input, context })
      ).rejects.toThrow("Bookmark already exists");
    });
  });

  describe("list", () => {
    it("should list bookmarks for user", async () => {
      // Create test bookmarks
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({ postId: "post-1" }),
        context,
      });
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({ postId: "post-2" }),
        context,
      });

      const result = await bookmarksRouter.list.handler({
        input: {},
        context,
      });

      expect(result.bookmarks).toBeDefined();
      expect(result.bookmarks.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("should filter bookmarks by platform", async () => {
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({
          postId: "post-1",
          platform: "TWITTER",
        }),
        context,
      });
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({
          postId: "post-2",
          platform: "LINKEDIN",
        }),
        context,
      });

      const result = await bookmarksRouter.list.handler({
        input: { filters: { platform: "TWITTER" } },
        context,
      });

      expect(result.bookmarks.length).toBe(1);
      expect(result.bookmarks[0]?.platform).toBe("TWITTER");
    });

    it("should paginate results", async () => {
      // Create multiple bookmarks
      for (let i = 0; i < 5; i++) {
        await bookmarksRouter.create.handler({
          input: createTestBookmarkData({ postId: `post-${i}` }),
          context,
        });
      }

      const result = await bookmarksRouter.list.handler({
        input: { pagination: { limit: 2 } },
        context,
      });

      expect(result.bookmarks.length).toBe(2);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe("get", () => {
    it("should get a bookmark by id", async () => {
      const created = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      const result = await bookmarksRouter.get.handler({
        input: { id: created.id },
        context,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.viewCount).toBe(1); // Should increment view count
    });

    it("should throw error for non-existent bookmark", async () => {
      await expect(
        bookmarksRouter.get.handler({
          input: { id: "non-existent-id" },
          context,
        })
      ).rejects.toThrow("Bookmark not found");
    });
  });

  describe("update", () => {
    it("should update bookmark content", async () => {
      const created = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      const updatedContent = "Updated content";
      const result = await bookmarksRouter.update.handler({
        input: {
          id: created.id,
          data: { content: updatedContent },
        },
        context,
      });

      expect(result.content).toBe(updatedContent);
    });

    it("should throw error for non-existent bookmark", async () => {
      await expect(
        bookmarksRouter.update.handler({
          input: {
            id: "non-existent-id",
            data: { content: "test" },
          },
          context,
        })
      ).rejects.toThrow("Bookmark not found");
    });
  });

  describe("delete", () => {
    it("should delete a bookmark", async () => {
      const created = await bookmarksRouter.create.handler({
        input: createTestBookmarkData(),
        context,
      });

      const result = await bookmarksRouter.delete.handler({
        input: { id: created.id },
        context,
      });

      expect(result.success).toBe(true);

      // Verify deletion
      const bookmarks = await prisma.bookmarkPost.findMany({
        where: { id: created.id },
      });
      expect(bookmarks.length).toBe(0);
    });
  });

  describe("search", () => {
    it("should search bookmarks by content", async () => {
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({
          postId: "post-1",
          content: "JavaScript programming tutorial",
        }),
        context,
      });
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({
          postId: "post-2",
          content: "Python data science guide",
        }),
        context,
      });

      const result = await bookmarksRouter.search.handler({
        input: { query: "JavaScript" },
        context,
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0]?.content).toContain("JavaScript");
    });
  });

  describe("bulkImport", () => {
    it("should import multiple bookmarks", async () => {
      const input = {
        platform: "TWITTER" as const,
        bookmarks: [
          {
            postId: "bulk-1",
            postUrl: "https://twitter.com/user/status/1",
            content: "Bulk import test 1",
            author: {
              name: "Author 1",
              username: "author1",
              profileUrl: "https://twitter.com/author1",
            },
            timestamp: new Date().toISOString(),
          },
          {
            postId: "bulk-2",
            postUrl: "https://twitter.com/user/status/2",
            content: "Bulk import test 2",
            author: {
              name: "Author 2",
              username: "author2",
              profileUrl: "https://twitter.com/author2",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await bookmarksRouter.bulkImport.handler({
        input,
        context,
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
    });

    it("should skip duplicate bookmarks during import", async () => {
      // Create existing bookmark
      await bookmarksRouter.create.handler({
        input: createTestBookmarkData({ postId: "existing-post" }),
        context,
      });

      const input = {
        platform: "TWITTER" as const,
        bookmarks: [
          {
            postId: "existing-post",
            postUrl: "https://twitter.com/user/status/1",
            content: "Duplicate",
            author: {
              name: "Author",
              username: "author",
              profileUrl: "https://twitter.com/author",
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      const result = await bookmarksRouter.bulkImport.handler({
        input,
        context,
      });

      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
    });
  });
});
