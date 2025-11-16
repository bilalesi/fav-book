import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  FilterCondition,
  FilterField,
  FilterOperator,
  FilterValue,
} from "../types/filters";
import {
  BookmarkFilterTransformer,
  type ExtendedBookmarkFilters,
} from "../services/filter-transformer";

// Re-export filter types for convenience
export type { FilterCondition, FilterField, FilterOperator, FilterValue };

// Store state interface
export interface BookmarkViewState {
  // View Mode
  viewMode: "card" | "table";
  setViewMode: (mode: "card" | "table") => void;

  // Filters
  filters: FilterCondition[];
  addFilter: (filter: FilterCondition) => void;
  updateFilter: (index: number, filter: FilterCondition) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  setFilters: (filters: FilterCondition[]) => void;

  // Sorting
  sortBy: "savedAt" | "createdAt";
  sortOrder: "asc" | "desc";
  setSorting: (
    sortBy: "savedAt" | "createdAt",
    sortOrder: "asc" | "desc"
  ) => void;

  // Bulk Selection
  selectedBookmarkIds: Set<string>;
  toggleSelection: (bookmarkId: string) => void;
  selectAll: (bookmarkIds: string[]) => void;
  clearSelection: () => void;

  // Helper Methods
  toUrlParams: () => URLSearchParams;
  fromUrlParams: (params: URLSearchParams) => void;
  toApiFormat: () => ExtendedBookmarkFilters;
}

// Helper function to parse filters from URL
function parseFiltersFromUrl(filterString: string): FilterCondition[] {
  try {
    return filterString.split(",").map((filterPart) => {
      const [field, operator, ...valueParts] = filterPart.split(":");
      const value = valueParts.map(decodeURIComponent).join(":");

      // Parse value based on field type and operator
      let parsedValue: FilterValue;
      if (operator === "between") {
        const [from, to] = value.split(":");
        parsedValue = { from: new Date(from), to: new Date(to) };
      } else if (operator === "in" || operator === "notIn") {
        parsedValue = value.split("|");
      } else if (field.includes("At")) {
        parsedValue = new Date(value);
      } else {
        parsedValue = value;
      }

      return {
        field: field as FilterField,
        operator: operator as FilterOperator,
        value: parsedValue,
      };
    });
  } catch (error) {
    console.error("Failed to parse filters from URL:", error);
    return [];
  }
}

// Create the Zustand store
export const useBookmarkViewStore = create<BookmarkViewState>()(
  persist(
    (set, get) => ({
      // Initial state
      viewMode: "card",
      filters: [],
      sortBy: "savedAt",
      sortOrder: "desc",
      selectedBookmarkIds: new Set(),

      // View mode actions
      setViewMode: (mode) => set({ viewMode: mode }),

      // Filter actions
      addFilter: (filter) =>
        set((state) => ({ filters: [...state.filters, filter] })),

      updateFilter: (index, filter) =>
        set((state) => ({
          filters: state.filters.map((f, i) => (i === index ? filter : f)),
        })),

      removeFilter: (index) =>
        set((state) => ({
          filters: state.filters.filter((_, i) => i !== index),
        })),

      clearFilters: () => set({ filters: [] }),

      setFilters: (filters) => set({ filters }),

      // Sorting actions
      setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),

      // Selection actions
      toggleSelection: (bookmarkId) =>
        set((state) => {
          const newSelection = new Set(state.selectedBookmarkIds);
          if (newSelection.has(bookmarkId)) {
            newSelection.delete(bookmarkId);
          } else {
            newSelection.add(bookmarkId);
          }
          return { selectedBookmarkIds: newSelection };
        }),

      selectAll: (bookmarkIds) =>
        set({ selectedBookmarkIds: new Set(bookmarkIds) }),

      clearSelection: () => set({ selectedBookmarkIds: new Set() }),

      // Helper methods
      toUrlParams: () => {
        const state = get();
        const params = new URLSearchParams();

        if (state.filters.length > 0) {
          const filterString = state.filters
            .filter((f) => {
              // Filter out invalid dates
              if (f.value instanceof Date) {
                return !isNaN(f.value.getTime());
              }
              if (typeof f.value === "object" && "from" in f.value) {
                return (
                  f.value.from instanceof Date &&
                  !isNaN(f.value.from.getTime()) &&
                  f.value.to instanceof Date &&
                  !isNaN(f.value.to.getTime())
                );
              }
              return true;
            })
            .map((f) => {
              let encodedValue: string;
              if (typeof f.value === "object" && "from" in f.value) {
                encodedValue = `${f.value.from.toISOString()}:${f.value.to.toISOString()}`;
              } else if (Array.isArray(f.value)) {
                encodedValue = f.value.join("|");
              } else if (f.value instanceof Date) {
                encodedValue = f.value.toISOString();
              } else {
                encodedValue = String(f.value);
              }
              return `${f.field}:${f.operator}:${encodeURIComponent(
                encodedValue
              )}`;
            })
            .join(",");
          params.set("filters", filterString);
        }

        if (state.sortBy !== "savedAt") {
          params.set("sortBy", state.sortBy);
        }
        if (state.sortOrder !== "desc") {
          params.set("sortOrder", state.sortOrder);
        }

        return params;
      },

      fromUrlParams: (params) => {
        const filterString = params.get("filters");
        const sortBy = params.get("sortBy") as "savedAt" | "createdAt" | null;
        const sortOrder = params.get("sortOrder") as "asc" | "desc" | null;

        const updates: Partial<BookmarkViewState> = {};

        if (filterString) {
          const filters = parseFiltersFromUrl(filterString);
          if (filters.length > 0) {
            updates.filters = filters;
          }
        }

        if (sortBy) updates.sortBy = sortBy;
        if (sortOrder) updates.sortOrder = sortOrder;

        set(updates);
      },

      toApiFormat: () => {
        const state = get();
        return new BookmarkFilterTransformer().transform(state.filters);
      },
    }),
    {
      name: "bookmark-view-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist view mode, not filters or selections
        viewMode: state.viewMode,
      }),
    }
  )
);
