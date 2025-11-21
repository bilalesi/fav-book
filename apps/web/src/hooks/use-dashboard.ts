import { useQuery } from "@tanstack/react-query";
import { orpc, client } from "@/utils/orpc";

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery(orpc.dashboard.retrieve_stats.queryOptions());
}

/**
 * Hook to fetch recent bookmarks
 */
export function useRecentBookmarks(limit: number = 5) {
  return useQuery({
    queryKey: ["dashboard", "recent", limit],
    queryFn: () => client.dashboard.retrieve_recent_bookmarks({ limit }),
  });
}

/**
 * Hook to fetch most viewed bookmarks
 */
export function useMostViewedBookmarks(limit: number = 5) {
  return useQuery({
    queryKey: ["dashboard", "mostViewed", limit],
    queryFn: () => client.dashboard.retrieve_most_viewed({ limit }),
  });
}

/**
 * Hook to fetch topic breakdown
 */
export function useTopicBreakdown() {
  return useQuery(orpc.dashboard.retrieve_topic_breakdown.queryOptions());
}
