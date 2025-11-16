import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import type { DownloadStatus, MediaType, ProcessingStatus } from "@favy/shared";

type EnrichedBookmark = {
  bookmarkId: string;
  processingStatus: ProcessingStatus;
  workflowId: string | null | undefined;
  summary: string | null | undefined;
  keywords: string[] | undefined;
  tags: string[] | undefined;
  enrichedAt: Date | null | undefined;
  errorMessage: string | null | undefined;
  downloadedMedia: {
    id: string;
    type: MediaType;
    downloadStatus: DownloadStatus;
    storageUrl: string | null;
    fileSize: string;
    duration: number | null;
    quality: string | null;
    format: string | null;
    errorMessage: string | null;
  }[];
};

interface UseBookmarkStatusOptions {
  bookmarkId: string;
  initialStatus?: ProcessingStatus;
  enabled?: boolean;
  pollingInterval?: number;
}

interface BookmarkStatusResult {
  status: ProcessingStatus;
  data?: EnrichedBookmark | null;
  isPolling: boolean;
  refetch: () => void;
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
}: UseBookmarkStatusOptions): BookmarkStatusResult {
  // Determine if we should poll based on current status
  const shouldPoll =
    enabled && (status === "PROCESSING" || status === "PENDING");

  // Query for bookmark enrichment status
  const { data, refetch } = useQuery({
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
    enabled: enabled && shouldPoll,
    refetchInterval: (data) => {
      // Poll every 10 seconds if processing
      if (data.state.data?.processingStatus === "PROCESSING") {
        return 10000;
      }
      return false;
    },
    refetchIntervalInBackground: false,
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  return {
    status: data?.processingStatus ?? initialStatus ?? "PENDING",
    isPolling: shouldPoll,
    refetch,
    data,
  };
}
