import { orpc, client } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch all collections
 */
export function useCollectionsList() {
  return useQuery(orpc.collections.list.queryOptions());
}

/**
 * Hook to fetch a single collection by ID
 */
export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collections", "get", id],
    queryFn: () => client.collections.get({ id }),
    enabled: !!id, // Only run query if id exists
  });
}

/**
 * Hook to create a new collection
 */
export function useCreateCollection() {
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      client.collections.create(data),
  });
}

/**
 * Hook to update a collection
 */
export function useUpdateCollection() {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; description?: string };
    }) => client.collections.update({ id, data }),
  });
}

/**
 * Hook to delete a collection
 */
export function useDeleteCollection() {
  return useMutation({
    mutationFn: (id: string) => client.collections.delete({ id }),
  });
}

/**
 * Hook to add a bookmark to a collection
 */
export function useAddBookmarkToCollection() {
  return useMutation({
    mutationFn: ({
      collectionId,
      bookmarkId,
    }: {
      collectionId: string;
      bookmarkId: string;
    }) => client.collections.addBookmark({ collectionId, bookmarkId }),
  });
}

/**
 * Hook to remove a bookmark from a collection
 */
export function useRemoveBookmarkFromCollection() {
  return useMutation({
    mutationFn: ({
      collectionId,
      bookmarkId,
    }: {
      collectionId: string;
      bookmarkId: string;
    }) => client.collections.removeBookmark({ collectionId, bookmarkId }),
  });
}
