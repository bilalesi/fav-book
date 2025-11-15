import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BookmarkFilters } from "@/components/bookmark-filters";
import { BookmarkCard } from "@/components/bookmark-card";
import { useBookmarksList } from "@/hooks/use-bookmarks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { BookmarkFilters as BookmarkFiltersType } from "@my-better-t-app/shared";
import { z } from "zod";
import { useEffect, useState, useRef, useCallback } from "react";

// Define search params schema
const bookmarksSearchSchema = z.object({
  platform: z.enum(["TWITTER", "LINKEDIN"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  authorUsername: z.string().optional(),
  categoryIds: z.string().optional(), // Comma-separated IDs
  sortBy: z.enum(["savedAt", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarksListPage,
  validateSearch: bookmarksSearchSchema,
});

function BookmarksListPage() {
  const navigate = useNavigate({ from: "/bookmarks" });
  const searchParams = Route.useSearch();

  // Parse filters from URL
  const [filters, setFilters] = useState<BookmarkFiltersType>(() => {
    const parsed: BookmarkFiltersType = {};

    if (searchParams.platform) {
      parsed.platform = searchParams.platform;
    }

    if (searchParams.dateFrom) {
      parsed.dateFrom = new Date(searchParams.dateFrom);
    }

    if (searchParams.dateTo) {
      parsed.dateTo = new Date(searchParams.dateTo);
    }

    if (searchParams.authorUsername) {
      parsed.authorUsername = searchParams.authorUsername;
    }

    if (searchParams.categoryIds) {
      parsed.categoryIds = searchParams.categoryIds.split(",");
    }

    return parsed;
  });

  // Parse sorting from URL
  const [sortBy, setSortBy] = useState<"savedAt" | "createdAt">(
    searchParams.sortBy || "savedAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(
    searchParams.sortOrder || "desc"
  );

  // Sync filters and sorting with URL on mount and when searchParams change
  useEffect(() => {
    const parsed: BookmarkFiltersType = {};

    if (searchParams.platform) {
      parsed.platform = searchParams.platform;
    }

    if (searchParams.dateFrom) {
      parsed.dateFrom = new Date(searchParams.dateFrom);
    }

    if (searchParams.dateTo) {
      parsed.dateTo = new Date(searchParams.dateTo);
    }

    if (searchParams.authorUsername) {
      parsed.authorUsername = searchParams.authorUsername;
    }

    if (searchParams.categoryIds) {
      parsed.categoryIds = searchParams.categoryIds.split(",");
    }

    setFilters(parsed);
    setSortBy(searchParams.sortBy || "savedAt");
    setSortOrder(searchParams.sortOrder || "desc");
  }, [searchParams]);

  // Fetch bookmarks with filters and sorting
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookmarksList(filters, { limit: 20, sortBy, sortOrder });

  const bookmarks = data?.bookmarks || [];

  // Infinite scroll with Intersection Observer
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: "100px", // Start loading 100px before reaching the element
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  // Update URL when filters change
  const handleFiltersChange = (newFilters: BookmarkFiltersType) => {
    setFilters(newFilters);

    // Convert filters to URL params
    const params: Record<string, string> = {};

    if (newFilters.platform) {
      params.platform = newFilters.platform;
    }

    if (newFilters.dateFrom) {
      params.dateFrom = newFilters.dateFrom.toISOString().split("T")[0];
    }

    if (newFilters.dateTo) {
      params.dateTo = newFilters.dateTo.toISOString().split("T")[0];
    }

    if (newFilters.authorUsername) {
      params.authorUsername = newFilters.authorUsername;
    }

    if (newFilters.categoryIds && newFilters.categoryIds.length > 0) {
      params.categoryIds = newFilters.categoryIds.join(",");
    }

    // Preserve sorting params
    if (sortBy !== "savedAt") {
      params.sortBy = sortBy;
    }
    if (sortOrder !== "desc") {
      params.sortOrder = sortOrder;
    }

    navigate({
      search: params,
      replace: true,
    });
  };

  const handleSortChange = (
    newSortBy: "savedAt" | "createdAt",
    newSortOrder: "asc" | "desc"
  ) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);

    // Convert filters to URL params
    const params: Record<string, string> = {};

    if (filters.platform) {
      params.platform = filters.platform;
    }

    if (filters.dateFrom) {
      params.dateFrom = filters.dateFrom.toISOString().split("T")[0];
    }

    if (filters.dateTo) {
      params.dateTo = filters.dateTo.toISOString().split("T")[0];
    }

    if (filters.authorUsername) {
      params.authorUsername = filters.authorUsername;
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      params.categoryIds = filters.categoryIds.join(",");
    }

    // Add sorting params
    if (newSortBy !== "savedAt") {
      params.sortBy = newSortBy;
    }
    if (newSortOrder !== "desc") {
      params.sortOrder = newSortOrder;
    }

    navigate({
      search: params,
      replace: true,
    });
  };

  const handleClearFilters = () => {
    setFilters({});
    setSortBy("savedAt");
    setSortOrder("desc");
    navigate({
      search: {},
      replace: true,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Bookmarks</h1>
        <p className="text-muted-foreground">
          Browse and filter your saved bookmarks
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <BookmarkFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-2">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">Failed to load bookmarks</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {error.message || "An unexpected error occurred"}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Clear filters and try again
                handleClearFilters();
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            No bookmarks found matching your filters.
          </p>
          {Object.keys(filters).length > 0 && (
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          {hasNextPage && (
            <div ref={observerTarget} className="mt-8 text-center py-4">
              {isFetchingNextPage && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="h-48 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fallback manual load button */}
          {hasNextPage && !isFetchingNextPage && (
            <div className="mt-4 text-center">
              <Button
                onClick={() => fetchNextPage()}
                variant="outline"
                size="sm"
              >
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
