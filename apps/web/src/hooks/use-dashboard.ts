import { orpc, client } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery(orpc.dashboard.getStats.queryOptions());
}

/**
 * Hook to fetch recent bookmarks
 */
export function useRecentBookmarks(limit: number = 5) {
  return useQuery({
    queryKey: ["dashboard", "recent", limit],
    queryFn: () => client.dashboard.getRecentBookmarks({ limit }),
  });
}

/**
 * Hook to fetch most viewed bookmarks
 */
export function useMostViewedBookmarks(limit: number = 5) {
  return useQuery({
    queryKey: ["dashboard", "mostViewed", limit],
    queryFn: () => client.dashboard.getMostViewed({ limit }),
  });
}

/**
 * Hook to fetch topic breakdown
 */
export function useTopicBreakdown() {
  return useQuery(orpc.dashboard.getTopicBreakdown.queryOptions());
}
