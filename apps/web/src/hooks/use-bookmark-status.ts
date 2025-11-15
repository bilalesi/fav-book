import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import type { ProcessingStatus } from "@my-better-t-app/shared";

interface UseBookmarkStatusOptions {
  bookmarkId: string;
  initialStatus?: ProcessingStatus;
  enabled?: boolean;
  pollingInterval?: number;
}

interface BookmarkStatusResult {
  status: ProcessingStatus;
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
  pollingInterval = 10000, // 10 seconds
}: UseBookmarkStatusOptions): BookmarkStatusResult {
  const [status, setStatus] = useState<ProcessingStatus>(
    initialStatus || "PENDING"
  );

  // Determine if we should poll based on current status
  const shouldPoll =
    enabled && (status === "PROCESSING" || status === "PENDING");

  // Query for bookmark enrichment status
  const { data, refetch } = useQuery({
    queryKey: ["bookmarks", "enrichment-status", bookmarkId],
    queryFn: async () => {
      try {
        const bookmark = await client.bookmarks.get({ id: bookmarkId });
        return bookmark.enrichment;
      } catch (error) {
        console.error("Failed to fetch enrichment status:", error);
        return null;
      }
    },
    enabled: enabled && shouldPoll,
    refetchInterval: shouldPoll ? pollingInterval : false,
    refetchIntervalInBackground: false,
    staleTime: 5000, // Consider data stale after 5 seconds
  });

  // Update local status when data changes
  useEffect(() => {
    if (data?.processingStatus) {
      setStatus(data.processingStatus);
    }
  }, [data?.processingStatus]);

  return {
    status,
    isPolling: shouldPoll,
    refetch,
  };
}
