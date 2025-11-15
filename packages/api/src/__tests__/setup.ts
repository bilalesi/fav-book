import { beforeAll, afterAll, beforeEach } from "bun:test";
import prisma from "@my-better-t-app/db";

// Test database setup
beforeAll(async () => {
  // Database is already configured via DATABASE_URL env variable
  console.log("Test database connected");
});

afterAll(async () => {
  // Cleanup and disconnect
  await prisma.$disconnect();
});

// Clean up database before each test
beforeEach(async () => {
  // Delete all test data in reverse order of dependencies
  await prisma.bookmarkPostCategory.deleteMany();
  await prisma.bookmarkPostCollection.deleteMany();
  await prisma.media.deleteMany();
  await prisma.bookmarkPost.deleteMany();
  await prisma.category.deleteMany();
  await prisma.collection.deleteMany();
  // Note: We don't delete users/sessions as they're managed by better-auth
});

// Helper to create a test user context
export function createTestContext(userId: string) {
  return {
    session: {
      user: {
        id: userId,
        email: `test-${userId}@example.com`,
        name: "Test User",
      },
      session: {
        id: "test-session",
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      },
    },
  };
}

// Helper to create test bookmark data
export function createTestBookmarkData(overrides = {}) {
  return {
    platform: "TWITTER" as const,
    postId: `test-post-${Date.now()}`,
    postUrl: "https://twitter.com/user/status/123",
    content: "Test bookmark content",
    authorName: "Test Author",
    authorUsername: "testauthor",
    authorProfileUrl: "https://twitter.com/testauthor",
    createdAt: new Date(),
    ...overrides,
  };
}
