# Bookmark Filtering System - Developer Guide

This guide provides technical documentation for developers working with the bookmark filtering system, including the Zustand store API, filter transformer service, and component architecture.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Zustand Store API](#zustand-store-api)
3. [Filter Transformer Service](#filter-transformer-service)
4. [Component Integration](#component-integration)
5. [URL Encoding](#url-encoding)
6. [Backend API](#backend-api)
7. [Type Definitions](#type-definitions)
8. [Testing](#testing)
9. [Performance Optimization](#performance-optimization)
10. [Common Patterns](#common-patterns)

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Bookmarks Page                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ View Toggle  │  │   Filters    │  │ Bulk Actions │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Card View / Table View                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Zustand Store                              │
│  • View Mode State                                          │
│  • Filter Conditions                                        │
│  • Sorting State                                            │
│  • Selection State                                          │
│  • URL Sync                                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Filter Transformer                             │
│  • Convert UI filters to API format                         │
│  • Handle operator mapping                                  │
│  • Date range transformation                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  tRPC API                                   │
│  • Bookmarks Router                                         │
│  • Filter Validation                                        │
│  • Prisma Query Builder                                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User interacts with filter UI
2. Filter state updates in Zustand store
3. Store triggers URL sync
4. Filter transformer converts to API format
5. tRPC query fetches filtered bookmarks
6. Results render in selected view mode

## Zustand Store API

### Store Location

```typescript
// fav-book/apps/web/src/stores/bookmark-view-store.ts
import { useBookmarkViewStore } from "@/stores/bookmark-view-store";
```

### Store Interface

```typescript
interface BookmarkViewState {
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
  toApiFormat: () => BookmarkFiltersType;
}
```

### Usage Examples

#### Basic Usage

```typescript
import { useBookmarkViewStore } from "@/stores/bookmark-view-store";

function BookmarksPage() {
  const { viewMode, setViewMode, filters, addFilter } = useBookmarkViewStore();

  return (
    <div>
      <button onClick={() => setViewMode("table")}>Switch to Table View</button>
      {viewMode === "card" ? <CardView /> : <TableView />}
    </div>
  );
}
```

#### Managing Filters

```typescript
// Add a filter
const addPlatformFilter = () => {
  addFilter({
    field: "platform",
    operator: "equals",
    value: "TWITTER",
  });
};

// Update a filter
const updateFilter = (index: number) => {
  updateFilter(index, {
    field: "platform",
    operator: "in",
    value: ["TWITTER", "LINKEDIN"],
  });
};

// Remove a filter
const removeFilter = (index: number) => {
  removeFilter(index);
};

// Clear all filters
const clearAllFilters = () => {
  clearFilters();
};
```

#### URL Synchronization

```typescript
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

function BookmarksPage() {
  const { filters, toUrlParams, fromUrlParams } = useBookmarkViewStore();
  const navigate = useNavigate();

  // Load filters from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    fromUrlParams(params);
  }, [fromUrlParams]);

  // Sync filters to URL when they change
  useEffect(() => {
    const params = toUrlParams();
    navigate({ search: Object.fromEntries(params) }, { replace: true });
  }, [filters, navigate, toUrlParams]);

  return <div>...</div>;
}
```

#### Bulk Selection

```typescript
function TableView({ bookmarks }: { bookmarks: Bookmark[] }) {
  const { selectedBookmarkIds, toggleSelection, selectAll, clearSelection } =
    useBookmarkViewStore();

  const handleSelectAll = () => {
    if (selectedBookmarkIds.size === bookmarks.length) {
      clearSelection();
    } else {
      selectAll(bookmarks.map((b) => b.id));
    }
  };

  return (
    <div>
      <button onClick={handleSelectAll}>
        {selectedBookmarkIds.size === bookmarks.length
          ? "Deselect All"
          : "Select All"}
      </button>
      {bookmarks.map((bookmark) => (
        <div key={bookmark.id}>
          <input
            type="checkbox"
            checked={selectedBookmarkIds.has(bookmark.id)}
            onChange={() => toggleSelection(bookmark.id)}
          />
          {bookmark.title}
        </div>
      ))}
    </div>
  );
}
```

#### API Integration

```typescript
import { useBookmarksList } from "@/hooks/use-bookmarks-list";

function BookmarksPage() {
  const { toApiFormat, sortBy, sortOrder } = useBookmarkViewStore();

  // Fetch bookmarks with current filters
  const { data, isLoading } = useBookmarksList(toApiFormat(), {
    limit: 20,
    sortBy,
    sortOrder,
  });

  const bookmarks = data?.bookmarks || [];

  return (
    <div>
      {isLoading ? <Spinner /> : <BookmarkList bookmarks={bookmarks} />}
    </div>
  );
}
```

### Store Persistence

The store uses Zustand's persist middleware to save view mode preference:

```typescript
// Only viewMode is persisted to localStorage
// Filters and selection are NOT persisted (URL-based instead)

const persistConfig = {
  name: "bookmark-view-storage",
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    viewMode: state.viewMode,
  }),
};
```

### Store Selectors

For performance optimization, use selective subscriptions:

```typescript
// Subscribe to only viewMode (prevents re-renders on filter changes)
const viewMode = useBookmarkViewStore((state) => state.viewMode);

// Subscribe to only filters
const filters = useBookmarkViewStore((state) => state.filters);

// Subscribe to multiple values
const { viewMode, filters } = useBookmarkViewStore((state) => ({
  viewMode: state.viewMode,
  filters: state.filters,
}));
```

## Filter Transformer Service

### Service Location

```typescript
// fav-book/apps/web/src/services/filter-transformer.ts
import { BookmarkFilterTransformer } from "@/services/filter-transformer";
```

### Class Interface

```typescript
class BookmarkFilterTransformer {
  transform(filters: FilterCondition[]): BookmarkFiltersType;
  private handleDateFilter(
    filter: FilterCondition,
    apiFilters: BookmarkFiltersType,
    field: "savedAt" | "createdAt"
  ): void;
}
```

### Usage Examples

#### Basic Transformation

```typescript
const transformer = new BookmarkFilterTransformer();

const uiFilters: FilterCondition[] = [
  { field: "platform", operator: "equals", value: "TWITTER" },
  { field: "authorUsername", operator: "contains", value: "john" },
];

const apiFilters = transformer.transform(uiFilters);
// Result: { platform: 'TWITTER', authorUsernameContains: 'john' }
```

#### Date Range Transformation

```typescript
const dateFilter: FilterCondition = {
  field: "savedAt",
  operator: "between",
  value: { from: new Date("2024-01-01"), to: new Date("2024-12-31") },
};

const apiFilters = transformer.transform([dateFilter]);
// Result: { dateFrom: Date('2024-01-01'), dateTo: Date('2024-12-31') }
```

#### Multiple Platform Filter

```typescript
const platformFilter: FilterCondition = {
  field: "platform",
  operator: "in",
  value: ["TWITTER", "LINKEDIN"],
};

const apiFilters = transformer.transform([platformFilter]);
// Result: { platforms: ['TWITTER', 'LINKEDIN'] }
```

### Operator Mapping

| UI Operator | Field          | API Field                  | API Operator     |
| ----------- | -------------- | -------------------------- | ---------------- |
| equals      | platform       | platform                   | exact match      |
| in          | platform       | platforms                  | array match      |
| equals      | authorUsername | authorUsername             | exact match      |
| contains    | authorUsername | authorUsernameContains     | partial match    |
| equals      | savedAt        | dateFrom, dateTo           | same date        |
| greaterThan | savedAt        | dateFrom                   | >=               |
| lessThan    | savedAt        | dateTo                     | <=               |
| between     | savedAt        | dateFrom, dateTo           | range            |
| equals      | createdAt      | createdAtFrom, createdAtTo | same date        |
| greaterThan | createdAt      | createdAtFrom              | >=               |
| lessThan    | createdAt      | createdAtTo                | <=               |
| between     | createdAt      | createdAtFrom, createdAtTo | range            |
| in          | categoryIds    | categoryIds                | array match      |
| notIn       | categoryIds    | excludeCategoryIds         | array exclude    |
| contains    | content        | contentSearch              | full-text search |

### Custom Transformer

You can extend the transformer for custom logic:

```typescript
class CustomFilterTransformer extends BookmarkFilterTransformer {
  transform(filters: FilterCondition[]): BookmarkFiltersType {
    const apiFilters = super.transform(filters);

    // Add custom logic
    if (apiFilters.platform === "TWITTER") {
      apiFilters.includeRetweets = false;
    }

    return apiFilters;
  }
}
```

## Component Integration

### ReUI Filters Wrapper

```typescript
// fav-book/apps/web/src/components/reui-filters-wrapper.tsx
import { ReUIFiltersWrapper } from "@/components/reui-filters-wrapper";

function BookmarksPage() {
  const {
    filters,
    setFilters,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
  } = useBookmarkViewStore();

  return (
    <ReUIFiltersWrapper
      filters={filters}
      onFiltersChange={setFilters}
      onAddFilter={addFilter}
      onUpdateFilter={updateFilter}
      onRemoveFilter={removeFilter}
      onClearFilters={clearFilters}
    />
  );
}
```

### Filter Field Configuration

```typescript
// fav-book/apps/web/src/config/filter-fields.ts
import { filterFieldConfig } from "@/config/filter-fields";

// Access field configuration
const platformConfig = filterFieldConfig.platform;
// { label: 'Platform', type: 'select', operators: ['equals', 'in'], options: [...] }

// Get available operators for a field
const operators = filterFieldConfig.authorUsername.operators;
// ['equals', 'contains']
```

### View Toggle Component

```typescript
// fav-book/apps/web/src/components/view-toggle.tsx
import { ViewToggle } from "@/components/view-toggle";

function BookmarksPage() {
  const { viewMode, setViewMode } = useBookmarkViewStore();

  return <ViewToggle currentView={viewMode} onViewChange={setViewMode} />;
}
```

### Table View Component

```typescript
// fav-book/apps/web/src/components/bookmark-table-view.tsx
import { BookmarkTableView } from "@/components/bookmark-table-view";

function BookmarksPage() {
  const {
    sortBy,
    sortOrder,
    setSorting,
    selectedBookmarkIds,
    toggleSelection,
  } = useBookmarkViewStore();

  return (
    <BookmarkTableView
      bookmarks={bookmarks}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={setSorting}
      selectedIds={selectedBookmarkIds}
      onToggleSelection={toggleSelection}
    />
  );
}
```

### Card View Component

```typescript
// fav-book/apps/web/src/components/bookmark-card-view.tsx
import { BookmarkCardView } from "@/components/bookmark-card-view";

function BookmarksPage() {
  const { selectedBookmarkIds, toggleSelection } = useBookmarkViewStore();

  return (
    <BookmarkCardView
      bookmarks={bookmarks}
      selectedIds={selectedBookmarkIds}
      onToggleSelection={toggleSelection}
    />
  );
}
```

## URL Encoding

### Encoding Format

Filters are encoded in URL query parameters using a compact format:

```
?filters=field:operator:value[,field:operator:value...]
```

### Encoding Rules

1. **Field names** - Use exact field names (platform, authorUsername, etc.)
2. **Operators** - Use abbreviated operators (eq, contains, in, between, etc.)
3. **Values** - URL-encode special characters
4. **Multiple values** - Separate with pipe `|` for array values
5. **Date ranges** - Separate from/to with colon `:`
6. **Multiple filters** - Separate with comma `,`

### Examples

#### Single Filter

```
?filters=platform:eq:TWITTER
```

#### Multiple Filters

```
?filters=platform:eq:TWITTER,authorUsername:contains:john
```

#### Array Values

```
?filters=platform:in:TWITTER|LINKEDIN
```

#### Date Range

```
?filters=savedAt:between:2024-01-01:2024-12-31
```

#### Complex Query

```
?filters=platform:in:TWITTER|LINKEDIN,savedAt:gt:2024-11-01,content:contains:react
```

### Parsing URL Filters

```typescript
// Automatic parsing via store
const { fromUrlParams } = useBookmarkViewStore();

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  fromUrlParams(params);
}, []);

// Manual parsing
import { parseFiltersFromUrl } from "@/stores/bookmark-view-store";

const filterString = searchParams.get("filters");
if (filterString) {
  const filters = parseFiltersFromUrl(filterString);
  // Use filters...
}
```

### Generating URL Filters

```typescript
// Automatic generation via store
const { toUrlParams } = useBookmarkViewStore();

const params = toUrlParams();
const url = `/bookmarks?${params.toString()}`;

// Manual generation
const encodeFilters = (filters: FilterCondition[]): string => {
  return filters
    .map((f) => {
      const value = Array.isArray(f.value)
        ? f.value.join("|")
        : typeof f.value === "object" && "from" in f.value
        ? `${f.value.from.toISOString()}:${f.value.to.toISOString()}`
        : String(f.value);

      return `${f.field}:${f.operator}:${encodeURIComponent(value)}`;
    })
    .join(",");
};
```

## Backend API

### tRPC Router

```typescript
// fav-book/packages/api/src/routers/bookmarks.ts

export const bookmarksRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        filters: bookmarkFiltersSchema.optional(),
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        sortBy: z.enum(["savedAt", "createdAt"]).default("savedAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { filters, limit, cursor, sortBy, sortOrder } = input;

      // Build Prisma where clause from filters
      const where = buildWhereClause(filters, ctx.user.id);

      // Execute query
      const bookmarks = await ctx.db.bookmarkPost.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { [sortBy]: sortOrder },
        include: {
          categories: true,
          collections: true,
        },
      });

      // Handle pagination
      let nextCursor: string | undefined = undefined;
      if (bookmarks.length > limit) {
        const nextItem = bookmarks.pop();
        nextCursor = nextItem?.id;
      }

      return {
        bookmarks,
        nextCursor,
      };
    }),
});
```

### Filter Schema

```typescript
// fav-book/packages/shared/src/types.ts

export const bookmarkFiltersSchema = z.object({
  platform: z.enum(["TWITTER", "LINKEDIN", "GENERIC_URL"]).optional(),
  platforms: z.array(z.enum(["TWITTER", "LINKEDIN", "GENERIC_URL"])).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  authorUsername: z.string().optional(),
  authorUsernameContains: z.string().optional(),
  createdAtFrom: z.date().optional(),
  createdAtTo: z.date().optional(),
  categoryIds: z.array(z.string()).optional(),
  excludeCategoryIds: z.array(z.string()).optional(),
  collectionId: z.string().optional(),
  contentSearch: z.string().optional(),
});

export type BookmarkFiltersType = z.infer<typeof bookmarkFiltersSchema>;
```

### Query Builder

```typescript
function buildWhereClause(
  filters: BookmarkFiltersType | undefined,
  userId: string
): Prisma.BookmarkPostWhereInput {
  const where: Prisma.BookmarkPostWhereInput = {
    userId, // Always filter by user
  };

  if (!filters) return where;

  // Platform filter
  if (filters.platform) {
    where.platform = filters.platform;
  } else if (filters.platforms && filters.platforms.length > 0) {
    where.platform = { in: filters.platforms };
  }

  // Author filters
  if (filters.authorUsername) {
    where.authorUsername = filters.authorUsername;
  } else if (filters.authorUsernameContains) {
    where.authorUsername = {
      contains: filters.authorUsernameContains,
      mode: "insensitive",
    };
  }

  // Saved date filters
  if (filters.dateFrom || filters.dateTo) {
    where.savedAt = {};
    if (filters.dateFrom) {
      where.savedAt.gte = filters.dateFrom;
    }
    if (filters.dateTo) {
      where.savedAt.lte = filters.dateTo;
    }
  }

  // Created date filters
  if (filters.createdAtFrom || filters.createdAtTo) {
    where.createdAt = {};
    if (filters.createdAtFrom) {
      where.createdAt.gte = filters.createdAtFrom;
    }
    if (filters.createdAtTo) {
      where.createdAt.lte = filters.createdAtTo;
    }
  }

  // Category filters
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.categories = {
      some: {
        id: { in: filters.categoryIds },
      },
    };
  }

  if (filters.excludeCategoryIds && filters.excludeCategoryIds.length > 0) {
    where.categories = {
      none: {
        id: { in: filters.excludeCategoryIds },
      },
    };
  }

  // Collection filter
  if (filters.collectionId) {
    where.collections = {
      some: {
        id: filters.collectionId,
      },
    };
  }

  // Content search (full-text)
  if (filters.contentSearch) {
    where.OR = [
      { content: { contains: filters.contentSearch, mode: "insensitive" } },
      { title: { contains: filters.contentSearch, mode: "insensitive" } },
      { description: { contains: filters.contentSearch, mode: "insensitive" } },
    ];
  }

  return where;
}
```

### Database Indexes

Ensure these indexes exist for optimal query performance:

```prisma
// fav-book/packages/db/prisma/schema/bookmark.prisma

model BookmarkPost {
  // ... fields ...

  @@index([userId, platform])
  @@index([userId, savedAt])
  @@index([userId, createdAt])
  @@index([userId, authorUsername])
  @@index([platform, savedAt])
}
```

## Type Definitions

### Filter Types

```typescript
// fav-book/apps/web/src/types/filters.ts

export type FilterField =
  | "platform"
  | "authorUsername"
  | "savedAt"
  | "createdAt"
  | "categoryIds"
  | "content";

export type FilterOperator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "in"
  | "notIn"
  | "greaterThan"
  | "lessThan"
  | "between";

export type FilterValue = string | string[] | Date | { from: Date; to: Date };

export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: FilterValue;
}

export interface FieldConfig {
  label: string;
  type: "text" | "select" | "multiselect" | "date";
  operators: FilterOperator[];
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
}
```

### Store Types

```typescript
// fav-book/apps/web/src/stores/bookmark-view-store.ts

export interface BookmarkViewState {
  viewMode: "card" | "table";
  filters: FilterCondition[];
  sortBy: "savedAt" | "createdAt";
  sortOrder: "asc" | "desc";
  selectedBookmarkIds: Set<string>;

  // Actions
  setViewMode: (mode: "card" | "table") => void;
  addFilter: (filter: FilterCondition) => void;
  updateFilter: (index: number, filter: FilterCondition) => void;
  removeFilter: (index: number) => void;
  clearFilters: () => void;
  setFilters: (filters: FilterCondition[]) => void;
  setSorting: (
    sortBy: "savedAt" | "createdAt",
    sortOrder: "asc" | "desc"
  ) => void;
  toggleSelection: (bookmarkId: string) => void;
  selectAll: (bookmarkIds: string[]) => void;
  clearSelection: () => void;

  // Helpers
  toUrlParams: () => URLSearchParams;
  fromUrlParams: (params: URLSearchParams) => void;
  toApiFormat: () => BookmarkFiltersType;
}
```

### Component Props

```typescript
// View Toggle
export interface ViewToggleProps {
  currentView: "card" | "table";
  onViewChange: (view: "card" | "table") => void;
}

// Filters Wrapper
export interface ReUIFiltersWrapperProps {
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
  onAddFilter: (filter: FilterCondition) => void;
  onUpdateFilter: (index: number, filter: FilterCondition) => void;
  onRemoveFilter: (index: number) => void;
  onClearFilters: () => void;
}

// Table View
export interface BookmarkTableViewProps {
  bookmarks: BookmarkPost[];
  sortBy: "savedAt" | "createdAt";
  sortOrder: "asc" | "desc";
  onSort: (sortBy: "savedAt" | "createdAt", sortOrder: "asc" | "desc") => void;
  selectedIds: Set<string>;
  onToggleSelection: (bookmarkId: string) => void;
}

// Card View
export interface BookmarkCardViewProps {
  bookmarks: BookmarkPost[];
  selectedIds: Set<string>;
  onToggleSelection: (bookmarkId: string) => void;
}
```

## Testing

### Unit Tests

#### Testing Filter Transformer

```typescript
// fav-book/apps/web/src/services/filter-transformer.test.ts
import { describe, it, expect } from "vitest";
import { BookmarkFilterTransformer } from "./filter-transformer";

describe("BookmarkFilterTransformer", () => {
  const transformer = new BookmarkFilterTransformer();

  it("should transform equals operator", () => {
    const filters = [
      { field: "platform", operator: "equals", value: "TWITTER" },
    ];
    const result = transformer.transform(filters);
    expect(result.platform).toBe("TWITTER");
  });

  it("should transform in operator for platforms", () => {
    const filters = [
      { field: "platform", operator: "in", value: ["TWITTER", "LINKEDIN"] },
    ];
    const result = transformer.transform(filters);
    expect(result.platforms).toEqual(["TWITTER", "LINKEDIN"]);
  });

  it("should transform between operator for dates", () => {
    const filters = [
      {
        field: "savedAt",
        operator: "between",
        value: { from: new Date("2024-01-01"), to: new Date("2024-12-31") },
      },
    ];
    const result = transformer.transform(filters);
    expect(result.dateFrom).toEqual(new Date("2024-01-01"));
    expect(result.dateTo).toEqual(new Date("2024-12-31"));
  });

  it("should handle multiple filters", () => {
    const filters = [
      { field: "platform", operator: "equals", value: "TWITTER" },
      { field: "authorUsername", operator: "contains", value: "john" },
    ];
    const result = transformer.transform(filters);
    expect(result.platform).toBe("TWITTER");
    expect(result.authorUsernameContains).toBe("john");
  });
});
```

#### Testing Zustand Store

```typescript
// fav-book/apps/web/src/stores/bookmark-view-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBookmarkViewStore } from "./bookmark-view-store";

describe("useBookmarkViewStore", () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useBookmarkViewStore());
    act(() => {
      result.current.clearFilters();
      result.current.clearSelection();
      result.current.setViewMode("card");
    });
  });

  it("should set view mode", () => {
    const { result } = renderHook(() => useBookmarkViewStore());

    act(() => {
      result.current.setViewMode("table");
    });

    expect(result.current.viewMode).toBe("table");
  });

  it("should add filter", () => {
    const { result } = renderHook(() => useBookmarkViewStore());

    act(() => {
      result.current.addFilter({
        field: "platform",
        operator: "equals",
        value: "TWITTER",
      });
    });

    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].field).toBe("platform");
  });

  it("should remove filter", () => {
    const { result } = renderHook(() => useBookmarkViewStore());

    act(() => {
      result.current.addFilter({
        field: "platform",
        operator: "equals",
        value: "TWITTER",
      });
      result.current.removeFilter(0);
    });

    expect(result.current.filters).toHaveLength(0);
  });

  it("should toggle selection", () => {
    const { result } = renderHook(() => useBookmarkViewStore());

    act(() => {
      result.current.toggleSelection("bookmark-1");
    });

    expect(result.current.selectedBookmarkIds.has("bookmark-1")).toBe(true);

    act(() => {
      result.current.toggleSelection("bookmark-1");
    });

    expect(result.current.selectedBookmarkIds.has("bookmark-1")).toBe(false);
  });

  it("should encode filters to URL params", () => {
    const { result } = renderHook(() => useBookmarkViewStore());

    act(() => {
      result.current.addFilter({
        field: "platform",
        operator: "equals",
        value: "TWITTER",
      });
    });

    const params = result.current.toUrlParams();
    expect(params.get("filters")).toBe("platform:equals:TWITTER");
  });
});
```

### Integration Tests

```typescript
// fav-book/apps/web/src/__tests__/bookmark-filtering.integration.test.ts
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBookmarksList } from "@/hooks/use-bookmarks-list";
import { BookmarkFilterTransformer } from "@/services/filter-transformer";

describe("Bookmark Filtering Integration", () => {
  it("should fetch bookmarks with platform filter", async () => {
    const transformer = new BookmarkFilterTransformer();
    const filters = [
      { field: "platform", operator: "equals", value: "TWITTER" },
    ];
    const apiFilters = transformer.transform(filters);

    const { result } = renderHook(() => useBookmarksList(apiFilters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const bookmarks = result.current.data?.bookmarks || [];
    expect(bookmarks.every((b) => b.platform === "TWITTER")).toBe(true);
  });

  it("should fetch bookmarks with date range", async () => {
    const transformer = new BookmarkFilterTransformer();
    const filters = [
      {
        field: "savedAt",
        operator: "between",
        value: { from: new Date("2024-01-01"), to: new Date("2024-12-31") },
      },
    ];
    const apiFilters = transformer.transform(filters);

    const { result } = renderHook(() => useBookmarksList(apiFilters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const bookmarks = result.current.data?.bookmarks || [];
    expect(
      bookmarks.every(
        (b) =>
          b.savedAt >= new Date("2024-01-01") &&
          b.savedAt <= new Date("2024-12-31")
      )
    ).toBe(true);
  });
});
```

## Performance Optimization

### Debouncing

Filter inputs are debounced to reduce API calls:

```typescript
// fav-book/apps/web/src/hooks/use-debounced-filters.ts
import { useEffect, useState } from "react";
import { FilterCondition } from "@/types/filters";

export function useDebouncedFilters(
  filters: FilterCondition[],
  delay: number = 300
): FilterCondition[] {
  const [debouncedFilters, setDebouncedFilters] = useState(filters);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedFilters(filters);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [filters, delay]);

  return debouncedFilters;
}

// Usage
function BookmarksPage() {
  const { filters, toApiFormat } = useBookmarkViewStore();
  const debouncedFilters = useDebouncedFilters(filters);

  const { data } = useBookmarksList(toApiFormat());
  // API call only fires after 300ms of no filter changes
}
```

### Memoization

Use React.memo and useMemo for expensive computations:

```typescript
import { useMemo } from "react";

function BookmarksPage() {
  const { filters, toApiFormat } = useBookmarkViewStore();

  // Memoize API format transformation
  const apiFilters = useMemo(() => toApiFormat(), [filters]);

  const { data } = useBookmarksList(apiFilters);
}

// Memoize components
export const BookmarkCard = React.memo(({ bookmark }) => {
  return <div>{bookmark.title}</div>;
});
```

### Virtual Scrolling

Table view uses virtual scrolling for large datasets:

```typescript
// Automatically enabled in ReUI DataGrid
<DataGrid
  data={bookmarks}
  columns={columns}
  virtualScrolling={true}
  rowHeight={60}
  overscan={5}
/>
```

### Query Optimization

Backend query optimization strategies:

```typescript
// 1. Use select to fetch only needed fields
const bookmarks = await ctx.db.bookmarkPost.findMany({
  where,
  select: {
    id: true,
    title: true,
    authorName: true,
    platform: true,
    savedAt: true,
    // Exclude large fields like content, images
  },
});

// 2. Use cursor-based pagination
const bookmarks = await ctx.db.bookmarkPost.findMany({
  where,
  take: limit + 1,
  cursor: cursor ? { id: cursor } : undefined,
  orderBy: { savedAt: 'desc' },
});

// 3. Add database indexes
@@index([userId, platform])
@@index([userId, savedAt])
@@index([userId, authorUsername])
```

### Caching

Implement query caching with TanStack Query:

```typescript
// fav-book/apps/web/src/hooks/use-bookmarks-list.ts
export function useBookmarksList(
  filters: BookmarkFiltersType,
  options?: { limit?: number }
) {
  return useQuery({
    queryKey: ["bookmarks", "list", filters, options],
    queryFn: () => trpc.bookmarks.list.query({ filters, ...options }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

## Common Patterns

### Pattern 1: Adding a New Filter Field

To add a new filter field (e.g., "tags"):

**Step 1: Update Types**

```typescript
// fav-book/apps/web/src/types/filters.ts
export type FilterField =
  | "platform"
  | "authorUsername"
  | "savedAt"
  | "createdAt"
  | "categoryIds"
  | "content"
  | "tags"; // Add new field
```

**Step 2: Update Field Configuration**

```typescript
// fav-book/apps/web/src/config/filter-fields.ts
export const filterFieldConfig: Record<FilterField, FieldConfig> = {
  // ... existing fields ...
  tags: {
    label: "Tags",
    type: "multiselect",
    operators: ["in", "notIn"],
    options: [], // Populated dynamically
  },
};
```

**Step 3: Update Filter Transformer**

```typescript
// fav-book/apps/web/src/services/filter-transformer.ts
class BookmarkFilterTransformer {
  transform(filters: FilterCondition[]): BookmarkFiltersType {
    // ... existing code ...

    // Add tags handling
    const tagsFilter = filters.find((f) => f.field === "tags");
    if (tagsFilter) {
      if (tagsFilter.operator === "in") {
        apiFilters.tags = tagsFilter.value as string[];
      } else if (tagsFilter.operator === "notIn") {
        apiFilters.excludeTags = tagsFilter.value as string[];
      }
    }

    return apiFilters;
  }
}
```

**Step 4: Update Backend Schema**

```typescript
// fav-book/packages/shared/src/types.ts
export const bookmarkFiltersSchema = z.object({
  // ... existing fields ...
  tags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
});
```

**Step 5: Update Backend Query Builder**

```typescript
// fav-book/packages/api/src/routers/bookmarks.ts
function buildWhereClause(filters: BookmarkFiltersType, userId: string) {
  // ... existing code ...

  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      some: {
        name: { in: filters.tags },
      },
    };
  }

  if (filters.excludeTags && filters.excludeTags.length > 0) {
    where.tags = {
      none: {
        name: { in: filters.excludeTags },
      },
    };
  }

  return where;
}
```

### Pattern 2: Custom Filter Validation

Add custom validation for filter values:

```typescript
// fav-book/apps/web/src/utils/filter-validation.ts
export class FilterValidationError extends Error {
  constructor(
    public field: FilterField,
    public operator: FilterOperator,
    public value: FilterValue,
    message: string
  ) {
    super(message);
    this.name = "FilterValidationError";
  }
}

export function validateFilter(filter: FilterCondition): void {
  // Date validation
  if (filter.field === "savedAt" || filter.field === "createdAt") {
    if (filter.operator === "between") {
      const range = filter.value as { from: Date; to: Date };
      if (range.from > range.to) {
        throw new FilterValidationError(
          filter.field,
          filter.operator,
          filter.value,
          "Start date must be before end date"
        );
      }
    }
  }

  // Array validation
  if (filter.operator === "in" || filter.operator === "notIn") {
    if (!Array.isArray(filter.value) || filter.value.length === 0) {
      throw new FilterValidationError(
        filter.field,
        filter.operator,
        filter.value,
        "Must select at least one value"
      );
    }
  }

  // String validation
  if (filter.operator === "contains" || filter.operator === "equals") {
    if (typeof filter.value !== "string" || filter.value.trim() === "") {
      throw new FilterValidationError(
        filter.field,
        filter.operator,
        filter.value,
        "Value cannot be empty"
      );
    }
  }
}

// Usage in component
function ReUIFiltersWrapper() {
  const handleAddFilter = (filter: FilterCondition) => {
    try {
      validateFilter(filter);
      addFilter(filter);
    } catch (error) {
      if (error instanceof FilterValidationError) {
        toast.error(error.message);
      }
    }
  };
}
```

### Pattern 3: Filter Presets

Create reusable filter presets:

```typescript
// fav-book/apps/web/src/config/filter-presets.ts
export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: FilterCondition[];
}

export const filterPresets: FilterPreset[] = [
  {
    id: "recent-twitter",
    name: "Recent Twitter Posts",
    description: "Twitter posts from the last 7 days",
    filters: [
      { field: "platform", operator: "equals", value: "TWITTER" },
      {
        field: "savedAt",
        operator: "greaterThan",
        value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    ],
  },
  {
    id: "tech-articles",
    name: "Technology Articles",
    description: "URL bookmarks in Technology category",
    filters: [
      { field: "platform", operator: "equals", value: "GENERIC_URL" },
      { field: "categoryIds", operator: "in", value: ["tech-category-id"] },
    ],
  },
];

// Usage
function FilterPresetSelector() {
  const { setFilters } = useBookmarkViewStore();

  const applyPreset = (preset: FilterPreset) => {
    setFilters(preset.filters);
  };

  return (
    <div>
      {filterPresets.map((preset) => (
        <button key={preset.id} onClick={() => applyPreset(preset)}>
          {preset.name}
        </button>
      ))}
    </div>
  );
}
```

### Pattern 4: Filter Analytics

Track filter usage for analytics:

```typescript
// fav-book/apps/web/src/utils/filter-analytics.ts
export function trackFilterUsage(filters: FilterCondition[]): void {
  // Track which fields are used
  const fieldsUsed = filters.map((f) => f.field);

  // Track which operators are used
  const operatorsUsed = filters.map((f) => f.operator);

  // Track filter complexity
  const complexity = filters.length;

  // Send to analytics service
  analytics.track("filters_applied", {
    fields: fieldsUsed,
    operators: operatorsUsed,
    complexity,
    timestamp: new Date().toISOString(),
  });
}

// Usage in store
const useBookmarkViewStore = create<BookmarkViewState>((set, get) => ({
  // ... existing code ...

  setFilters: (filters) => {
    set({ filters });
    trackFilterUsage(filters);
  },
}));
```

## Troubleshooting

### Common Issues

**Issue: Filters not applying**

- Check browser console for errors
- Verify filter values are valid
- Ensure backend API is running
- Check network tab for failed requests

**Issue: URL encoding errors**

- Special characters must be URL-encoded
- Use `encodeURIComponent()` for values
- Check for malformed date strings

**Issue: Performance degradation**

- Enable virtual scrolling for large datasets
- Add database indexes for filtered fields
- Use debouncing for text inputs
- Implement query result caching

**Issue: Type errors**

- Ensure filter types match backend schema
- Update type definitions after schema changes
- Use TypeScript strict mode

## Best Practices

1. **Always validate filter inputs** - Prevent invalid queries
2. **Use debouncing for text inputs** - Reduce API calls
3. **Implement proper error handling** - Show user-friendly messages
4. **Add database indexes** - Optimize query performance
5. **Use TypeScript** - Catch type errors at compile time
6. **Write tests** - Ensure filter logic works correctly
7. **Document custom filters** - Help other developers
8. **Monitor performance** - Track slow queries
9. **Cache results** - Reduce redundant API calls
10. **Use URL persistence** - Enable sharing and bookmarking

## Resources

- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Prisma Documentation](https://www.prisma.io/docs)
- [tRPC Documentation](https://trpc.io/docs)
- [ReUI Components](https://reui.dev)

## Conclusion

This developer guide covers the core concepts and patterns for working with the bookmark filtering system. For user-facing documentation, see [BOOKMARK_FILTERING.md](./BOOKMARK_FILTERING.md).

For questions or contributions, please refer to the main project documentation.
