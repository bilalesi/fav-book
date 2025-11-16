import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";

import { DictProcessingStatus } from "@favy/shared";
import type { ProcessingStatus } from "@favy/shared";

interface UseBookmarkStatusOptions {
  bookmarkId: string;
  initialStatus?: ProcessingStatus;
  enabled?: boolean;
  pollingInterval?: number;
}

/**
 * Hook to poll for bookmark enrichment status updates
 * Automatically polls every 10 seconds for PROCESSING/PENDING bookmarks
 * Stops polling when status reaches a final state (COMPLETED, FAILED, PARTIAL_SUCCESS)
 */
export function useBookmarkStatus({
  bookmarkId,
  initialStatus,
  enabled = true,
}: UseBookmarkStatusOptions) {
  const { data, refetch, isEnabled } = useQuery({
    queryKey: ["bookmarks", "enrichment-status", bookmarkId],
    queryFn: async () => {
      try {
        const enrichment = await client.bookmarks.getEnrichmentStatus({
          id: bookmarkId,
        });
        return enrichment;
      } catch (error) {
        console.error("Failed to fetch enrichment status:", error);
        return null;
      }
    },
    enabled: (data) =>
      enabled &&
      (data.state.data?.processingStatus === DictProcessingStatus.PROCESSING ||
        data.state.data?.processingStatus === DictProcessingStatus.PENDING),
    refetchInterval: (data) => {
      if (
        data.state.data?.processingStatus === DictProcessingStatus.PROCESSING
      ) {
        return 10000;
      }
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 5000,
  });

  return {
    status:
      data?.processingStatus ?? initialStatus ?? DictProcessingStatus.PENDING,
    isPolling: isEnabled,
    refetch,
    data,
  };
}
