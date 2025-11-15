import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { BookmarkPost, Platform } from "@my-better-t-app/shared";
import type { ReactElement } from "react";

export function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

export function createMockBookmark(
  overrides: Partial<BookmarkPost> = {}
): BookmarkPost {
  return {
    id: "test-bookmark-id",
    userId: "test-user-id",
    platform: "TWITTER" as Platform,
    postId: "test-post-id",
    postUrl: "https://twitter.com/user/status/123",
    content: "Test bookmark content",
    authorName: "Test Author",
    authorUsername: "testauthor",
    authorProfileUrl: "https://twitter.com/testauthor",
    savedAt: new Date("2024-01-01"),
    createdAt: new Date("2024-01-01"),
    viewCount: 0,
    metadata: {},
    media: [],
    collections: [],
    categories: [],
    ...overrides,
  };
}
