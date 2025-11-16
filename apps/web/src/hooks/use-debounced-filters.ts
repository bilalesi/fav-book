import { useEffect, useState, useRef } from "react";
import type { FilterCondition } from "@/types/filters";
import type { ExtendedBookmarkFilters } from "@/services/filter-transformer";
import { BookmarkFilterTransformer } from "@/services/filter-transformer";

/**
 * Hook to debounce filter changes before triggering API requests
 *
 * This hook:
 * - Debounces filter changes by 300ms
 * - Provides a loading state during the debounce period
 * - Returns the debounced API-formatted filters
 *
 * @param filters - The current filter conditions from the store
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns Object containing debounced filters and loading state
 */
export function useDebouncedFilters(
  filters: FilterCondition[],
  delay = 300
): {
  debouncedFilters: ExtendedBookmarkFilters;
  isDebouncing: boolean;
} {
  const [debouncedFilters, setDebouncedFilters] =
    useState<ExtendedBookmarkFilters>(() => {
      return new BookmarkFilterTransformer().transform(filters);
    });
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set debouncing state to true when filters change
    setIsDebouncing(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to update debounced filters
    timeoutRef.current = setTimeout(() => {
      const transformer = new BookmarkFilterTransformer();
      const apiFilters = transformer.transform(filters);
      setDebouncedFilters(apiFilters);
      setIsDebouncing(false);
      timeoutRef.current = null;
    }, delay);

    // Cleanup function to cancel pending timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [filters, delay]);

  return { debouncedFilters, isDebouncing };
}
