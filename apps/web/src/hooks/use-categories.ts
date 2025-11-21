import { orpc, client } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch all categories
 */
export function useCategoriesList() {
  return useQuery(orpc.categories.list.queryOptions({}));
}

export function useBookmarkCategoriesList(bookmarkId: string) {
  return useQuery(orpc.categories.retrieve_bookmark_categories.queryOptions({ input: { id: bookmarkId } }));
}

/**
 * Hook to create a new category
 */
export function useCreateCategory() {
  return useMutation({
    mutationFn: (name: string) => client.categories.create({ name }),
  });
}

/**
 * Hook to assign a category to a bookmark
 */
export function useAssignCategoryToBookmark() {
  return useMutation({
    mutationFn: ({
      categoryId,
      bookmarkId,
    }: {
      categoryId: string;
      bookmarkId: string;
    }) => client.categories.assign_bookmark({ categoryId, bookmarkId }),
  });
}

/**
 * Hook to remove a category from a bookmark
 */
export function useRemoveCategoryFromBookmark() {
  return useMutation({
    mutationFn: ({
      categoryId,
      bookmarkId,
    }: {
      categoryId: string;
      bookmarkId: string;
    }) => client.categories.remove_from_bookmark({ categoryId, bookmarkId }),
  });
}
