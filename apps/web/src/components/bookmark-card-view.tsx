import type { BookmarkPost } from "@favy/shared";
import { SelectableBookmarkCard } from "./selectable-bookmark-card";
import { useBookmarkViewStore } from "@/stores/bookmark-view-store";
import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

interface BookmarkCardViewProps {
  bookmarks: BookmarkPost[];
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  emptyState?: React.ReactNode;
}

export const BookmarkCardView = React.memo(
  ({
    bookmarks,
    isLoading = false,
    isFetchingNextPage = false,
    emptyState,
  }: BookmarkCardViewProps) => {
    const { selectedBookmarkIds, toggleSelection } = useBookmarkViewStore();

    // Loading state
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      );
    }

    // Empty state
    if (bookmarks.length === 0) {
      return (
        <div className="text-center py-12">
          {emptyState || (
            <p className="text-muted-foreground">No bookmarks found.</p>
          )}
        </div>
      );
    }

    // Bookmarks grid
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {bookmarks.map((bookmark) => (
            <SelectableBookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              isSelected={selectedBookmarkIds.has(bookmark.id)}
              onSelectionToggle={toggleSelection}
            />
          ))}
        </div>

        {/* Loading indicator for infinite scroll */}
        {isFetchingNextPage && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}
      </>
    );
  }
);

BookmarkCardView.displayName = "BookmarkCardView";
