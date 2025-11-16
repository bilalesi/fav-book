# Filter Debouncing Implementation

## Overview

This document describes the implementation of filter debouncing for the bookmark view enhancements feature. The debouncing mechanism improves performance by reducing the number of API requests when users rapidly change filter conditions.

## Implementation Details

### 1. Custom Hook: `useDebouncedFilters`

**Location:** `fav-book/apps/web/src/hooks/use-debounced-filters.ts`

**Purpose:** Debounces filter changes before triggering API requests.

**Features:**

- Debounces filter changes by 300ms (configurable)
- Provides a loading state (`isDebouncing`) during the debounce period
- Automatically cancels pending timeouts when filters change
- Transforms filters to API format using `BookmarkFilterTransformer`

**API:**

```typescript
function useDebouncedFilters(
  filters: FilterCondition[],
  delay?: number
): {
  debouncedFilters: ExtendedBookmarkFilters;
  isDebouncing: boolean;
};
```

**How it works:**

1. When filters change, sets `isDebouncing` to `true`
2. Clears any existing timeout
3. Sets a new timeout for the specified delay (default 300ms)
4. After the delay, transforms filters to API format and updates `debouncedFilters`
5. Sets `isDebouncing` to `false`
6. Cleanup function cancels pending timeouts on unmount

### 2. Integration in BookmarksListPage

**Location:** `fav-book/apps/web/src/routes/bookmarks.index.tsx`

**Changes:**

1. Import the `useDebouncedFilters` hook and `Loader2` icon
2. Call the hook with current filters from the store
3. Use `debouncedFilters` instead of `toApiFormat()` in the `useBookmarksList` hook
4. Display a loading indicator when `isDebouncing` is true

**Code snippet:**

```typescript
// Debounce filter changes to reduce API requests
const { debouncedFilters, isDebouncing } = useDebouncedFilters(filters, 300);

// Fetch bookmarks with debounced filters
const { data, isLoading, error, ... } = useBookmarksList(
  debouncedFilters,
  { limit: 20, sortBy, sortOrder }
);
```

**Loading Indicator:**

```tsx
{
  isDebouncing && (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Applying filters...</span>
    </div>
  );
}
```

### 3. Request Cancellation

**Automatic Cancellation:** TanStack Query automatically cancels in-flight requests when the query key changes. Since `debouncedFilters` is part of the query key in `useBookmarksList`, changing filters will:

1. Trigger the debounce timer
2. After 300ms, update `debouncedFilters`
3. TanStack Query detects the query key change
4. Automatically cancels any pending request for the old filters
5. Initiates a new request with the updated filters

## Performance Benefits

1. **Reduced API Calls:** Rapid filter changes (e.g., typing in a search field) only trigger one API request after the user stops typing for 300ms
2. **Better UX:** Loading indicator provides feedback during the debounce period
3. **Resource Efficiency:** Prevents unnecessary server load from intermediate filter states
4. **Automatic Cleanup:** Pending requests are cancelled when filters change, preventing race conditions

## Testing

**Test File:** `fav-book/apps/web/src/hooks/__tests__/use-debounced-filters.test.ts`

**Test Coverage:**

- Initial filters are returned immediately
- Filter changes are debounced by 300ms
- Previous debounce is cancelled when filters change rapidly
- Custom delay can be specified
- Loading state is correctly managed

## Usage Example

```typescript
// In a component
const { filters } = useBookmarkViewStore();
const { debouncedFilters, isDebouncing } = useDebouncedFilters(filters, 300);

// Use debouncedFilters for API calls
const { data } = useBookmarksList(debouncedFilters);

// Show loading indicator
{
  isDebouncing && <LoadingSpinner />;
}
```

## Configuration

The debounce delay can be adjusted by changing the second parameter:

```typescript
// 500ms delay
const { debouncedFilters, isDebouncing } = useDebouncedFilters(filters, 500);

// Default 300ms delay
const { debouncedFilters, isDebouncing } = useDebouncedFilters(filters);
```

## Requirements Satisfied

This implementation satisfies **Requirement 7.5** from the design document:

> WHEN filter conditions change, THE BookmarkSystem SHALL debounce API requests by 300 milliseconds to reduce server load

## Future Enhancements

Potential improvements for future iterations:

1. Add configurable debounce delay in user settings
2. Implement adaptive debouncing based on network conditions
3. Add analytics to track debounce effectiveness
4. Consider different debounce delays for different filter types
