import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ReUIFiltersWrapper } from "@/components/reui-filters-wrapper";
import { ViewToggle } from "@/components/view-toggle";
import { BookmarkCardView } from "@/components/bookmark-card-view";
import { BookmarkTableView } from "@/components/bookmark-table-view";
import { useBookmarksList } from "@/hooks/use-bookmarks";
import { useDebouncedFilters } from "@/hooks/use-debounced-filters";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBookmarkViewStore } from "@/stores/bookmark-view-store";
import { z } from "zod";
import { useEffect, useState, useRef, useCallback } from "react";
import { client } from "@/utils/orpc";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCollectionsList } from "@/hooks/use-collections";
import { Loader2 } from "lucide-react";

// Define search params schema - now includes filters string
const bookmarksSearchSchema = z.object({
  filters: z.string().optional(), // Encoded filter conditions
  sortBy: z.enum(["savedAt", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const Route = createFileRoute("/bookmarks/")({
  component: BookmarksListPage,
  validateSearch: bookmarksSearchSchema,
});

type CollectionsList = Awaited<ReturnType<typeof client.collections.list>>;

function BookmarksListPage() {
  const navigate = useNavigate({ from: "/bookmarks" });
  const queryClient = useQueryClient();

  // Get state and actions from Zustand store
  const {
    viewMode,
    filters,
    sortBy,
    sortOrder,
    selectedBookmarkIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setSorting,
    toUrlParams,
    fromUrlParams,
  } = useBookmarkViewStore();

  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Debounce filter changes to reduce API requests
  const { debouncedFilters, isDebouncing } = useDebouncedFilters(filters, 300);

  // Fetch collections for bulk operations
  const { data: collectionsData } = useCollectionsList();
  const collections: CollectionsList = collectionsData ?? [];

  // Sync URL params to store on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fromUrlParams(params);
  }, [fromUrlParams]);

  // Sync store state to URL when filters or sorting change
  useEffect(() => {
    const params = toUrlParams();
    const paramsObj = Object.fromEntries(params);
    navigate({
      search: paramsObj,
      replace: true,
    });
  }, [filters, sortBy, sortOrder, navigate, toUrlParams]);

  // Fetch bookmarks with debounced filters and sorting from store
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBookmarksList(debouncedFilters, { limit: 20, sortBy, sortOrder });

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

  // Handle sorting changes
  const handleSortChange = (
    newSortBy: "savedAt" | "createdAt",
    newSortOrder: "asc" | "desc"
  ) => {
    setSorting(newSortBy, newSortOrder);
  };

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedBookmarkIds.size === bookmarks.length && bookmarks.length > 0) {
      clearSelection();
    } else {
      selectAll(bookmarks.map((b) => b.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBookmarkIds.size === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete ${selectedBookmarkIds.size} bookmark(s)?`
      )
    ) {
      return;
    }

    setIsProcessingBulk(true);
    try {
      await client.bookmarks.bulkDelete({
        bookmarkIds: Array.from(selectedBookmarkIds),
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });

      toast.success(
        `Successfully deleted ${selectedBookmarkIds.size} bookmark(s)`
      );
      clearSelection();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete bookmarks"
      );
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkAddToCollection = async (collectionId: string) => {
    if (selectedBookmarkIds.size === 0) return;

    setIsProcessingBulk(true);
    try {
      await client.bookmarks.bulkAddToCollections({
        bookmarkIds: Array.from(selectedBookmarkIds),
        collectionIds: [collectionId],
      });

      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      const collection = collections.find(
        (c: CollectionsList[number]) => c.id === collectionId
      );
      toast.success(
        `Successfully added ${selectedBookmarkIds.size} bookmark(s) to ${
          collection?.name || "collection"
        }`
      );
      clearSelection();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add bookmarks to collection"
      );
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Page Header with View Toggle */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Bookmarks</h1>
          <p className="text-muted-foreground">
            Browse and filter your saved bookmarks
          </p>
        </div>
        <ViewToggle />
      </div>

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <ReUIFiltersWrapper />
          </div>
          {isDebouncing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Applying filters...</span>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {bookmarks.length > 0 && (
        <div className="mb-4 flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={
                selectedBookmarkIds.size === bookmarks.length &&
                bookmarks.length > 0
              }
              onCheckedChange={handleSelectAll}
              aria-label="Select all bookmarks"
            />
            <span className="text-sm text-muted-foreground">
              {selectedBookmarkIds.size > 0
                ? `${selectedBookmarkIds.size} selected`
                : "Select all"}
            </span>
          </div>

          {selectedBookmarkIds.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessingBulk}
                  >
                    Add to Collection
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {collections.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No collections available
                    </div>
                  ) : (
                    collections.map((collection: CollectionsList[number]) => (
                      <DropdownMenuItem
                        key={collection.id}
                        onClick={() => handleBulkAddToCollection(collection.id)}
                      >
                        {collection.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isProcessingBulk}
              >
                {isProcessingBulk ? "Deleting..." : "Delete"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Bookmarks Display - Conditional rendering based on view mode */}
      {error ? (
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
          </div>
        </div>
      ) : viewMode === "card" ? (
        <>
          <BookmarkCardView
            bookmarks={bookmarks}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            emptyState={
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  No bookmarks found matching your filters.
                </p>
              </div>
            }
          />

          {/* Infinite scroll trigger */}
          {hasNextPage && (
            <div ref={observerTarget} className="mt-8 text-center py-4" />
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
      ) : (
        <>
          <BookmarkTableView
            bookmarks={bookmarks}
            selectedIds={selectedBookmarkIds}
            onToggleSelection={toggleSelection}
            onToggleSelectAll={handleSelectAll}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSortChange}
            isLoading={isLoading}
          />

          {/* Infinite scroll trigger for table view */}
          {hasNextPage && (
            <div ref={observerTarget} className="mt-8 text-center py-4" />
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
