import { useMutation, useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { client, queryClient } from "@/utils/orpc";

/**
 * Hook to fetch a list of bookmarks with filters and pagination
 */
export function useBookmarksList(filters?: any, pagination?: any) {
  return useInfiniteQuery({
    queryKey: ["bookmarks", "list", filters, pagination],
    queryFn: async ({ pageParam }) => {
      return client.bookmarks.list({
        filters,
        pagination: {
          ...pagination,
          cursor: pageParam,
        },
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    select: (data) => ({
      bookmarks: data.pages.flatMap((page) => page.bookmarks),
      total: data.pages[0]?.total || 0,
    }),
    staleTime: 2 * 60 * 1000, // 2 minutes for list data
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
  });
}

/**
 * Hook to fetch a single bookmark by ID
 */
export function useBookmark(id: string) {
  return useQuery({
    queryKey: ["bookmarks", "get", id],
    queryFn: () => client.bookmarks.get({ id }),
    staleTime: 10 * 60 * 1000, // 10 minutes for individual bookmarks
    gcTime: 15 * 60 * 1000, // 15 minutes cache time
  });
}

/**
 * Hook to search bookmarks
 */
export function useBookmarksSearch(
  query: string,
  filters?: any,
  sortBy?: "relevance" | "date" | "views"
) {
  return useQuery({
    queryKey: ["bookmarks", "search", query, filters, sortBy],
    queryFn: () => client.bookmarks.search({ query, filters, sortBy }),
    enabled: !!query && query.trim().length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes for search results
    gcTime: 10 * 60 * 1000, // 10 minutes cache time
  });
}

/**
 * Hook to create a new bookmark
 */
export function useCreateBookmark() {
  return useMutation({
    mutationFn: (data: any) => client.bookmarks.create(data),
    onSuccess: () => {
      // Invalidate bookmarks list and dashboard stats
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Bookmark created successfully");
    },
  });
}

/**
 * Hook to update a bookmark
 */
export function useUpdateBookmark() {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      client.bookmarks.update({ id, data }),
    onSuccess: (_, variables) => {
      // Invalidate specific bookmark and lists
      queryClient.invalidateQueries({
        queryKey: ["bookmarks", "get", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      toast.success("Bookmark updated successfully");
    },
  });
}

/**
 * Hook to delete a bookmark
 */
export function useDeleteBookmark() {
  return useMutation({
    mutationFn: (id: string) => client.bookmarks.delete({ id }),
    onSuccess: () => {
      // Invalidate bookmarks list and dashboard stats
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Bookmark deleted successfully");
    },
  });
}

/**
 * Hook to bulk import bookmarks
 */
export function useBulkImportBookmarks() {
  return useMutation({
    mutationFn: (data: any) => client.bookmarks.bulkImport(data),
    onSuccess: (result) => {
      // Invalidate bookmarks list and dashboard stats
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Imported ${result.successCount} bookmarks successfully`);
      if (result.failureCount > 0) {
        toast.warning(`${result.failureCount} bookmarks failed to import`);
      }
    },
  });
}

/**
 * Hook to bulk delete bookmarks
 */
export function useBulkDeleteBookmarks() {
  return useMutation({
    mutationFn: (bookmarkIds: string[]) =>
      client.bookmarks.bulkDelete({ bookmarkIds }),
    onSuccess: (result) => {
      // Invalidate bookmarks list and dashboard stats
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Deleted ${result.deletedCount} bookmark(s) successfully`);
    },
  });
}

/**
 * Hook to bulk add bookmarks to collections
 */
export function useBulkAddToCollections() {
  return useMutation({
    mutationFn: ({
      bookmarkIds,
      collectionIds,
    }: {
      bookmarkIds: string[];
      collectionIds: string[];
    }) => client.bookmarks.bulkAddToCollections({ bookmarkIds, collectionIds }),
    onSuccess: (result) => {
      // Invalidate bookmarks list and collections
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success(
        `Added ${result.bookmarkCount} bookmark(s) to ${result.collectionCount} collection(s)`
      );
    },
  });
}
