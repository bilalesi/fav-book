import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import type { BookmarkPost } from "@favy/shared";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { createBookmarkColumns } from "@/config/bookmark-table-columns";
import { Skeleton } from "@/components/ui/skeleton";

interface BookmarkTableViewProps {
  bookmarks: BookmarkPost[];
  selectedIds: Set<string>;
  onToggleSelection: (bookmarkId: string) => void;
  onToggleSelectAll: () => void;
  sortBy: "savedAt" | "createdAt";
  sortOrder: "asc" | "desc";
  onSort: (sortBy: "savedAt" | "createdAt", sortOrder: "asc" | "desc") => void;
  isLoading?: boolean;
}

export function BookmarkTableView({
  bookmarks,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  sortBy,
  sortOrder,
  onSort,
  isLoading = false,
}: BookmarkTableViewProps) {
  // Create column definitions with selection handlers
  const columns = useMemo<ColumnDef<BookmarkPost>[]>(() => {
    const bookmarkColumns = createBookmarkColumns({
      selectedIds,
      onToggleSelection,
      onToggleSelectAll,
    });

    // Convert BookmarkTableColumn to TanStack Table ColumnDef
    return bookmarkColumns.map((col) => ({
      id: col.id,
      accessorKey: col.accessorKey,
      header: col.header,
      cell: col.cell,
      enableSorting: col.sortable || false,
      size: col.width ? parseInt(col.width) : undefined,
      meta: {
        headerClassName: "text-xs font-medium uppercase tracking-wider",
        cellClassName: "text-sm",
        skeleton: <Skeleton className="h-4 w-full" />,
      },
    }));
  }, [selectedIds, onToggleSelection, onToggleSelectAll]);

  // Convert sortBy/sortOrder to TanStack Table sorting state
  const sorting: SortingState = useMemo(
    () => [
      {
        id: sortBy,
        desc: sortOrder === "desc",
      },
    ],
    [sortBy, sortOrder]
  );

  // Handle sorting changes
  const handleSortingChange = (
    updaterOrValue: SortingState | ((old: SortingState) => SortingState)
  ) => {
    const newSorting =
      typeof updaterOrValue === "function"
        ? updaterOrValue(sorting)
        : updaterOrValue;

    if (newSorting.length > 0) {
      const sort = newSorting[0];
      onSort(sort.id as "savedAt" | "createdAt", sort.desc ? "desc" : "asc");
    }
  };

  // Create table instance
  const table = useReactTable({
    data: bookmarks,
    columns,
    state: {
      sorting,
    },
    onSortingChange: handleSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true, // We handle sorting via API
    enableRowSelection: true,
  });

  // Handle row click to navigate to bookmark detail
  const handleRowClick = (bookmark: BookmarkPost) => {
    // For now, we'll just open the original post URL in a new tab
    // since there's no bookmark detail page yet
    if (bookmark.postUrl) {
      window.open(bookmark.postUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <DataGridContainer className="overflow-hidden">
      <div className="overflow-x-auto">
        <DataGrid
          table={table}
          recordCount={bookmarks.length}
          isLoading={isLoading}
          loadingMode="skeleton"
          onRowClick={handleRowClick}
          emptyMessage="No bookmarks found"
          tableLayout={{
            dense: false,
            cellBorder: false,
            rowBorder: true,
            rowRounded: false,
            stripped: false,
            headerSticky: true,
            headerBackground: true,
            headerBorder: true,
            width: "fixed",
            columnsResizable: false,
          }}
          tableClassNames={{
            base: "min-w-full",
            headerSticky:
              "sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
            bodyRow: "transition-colors hover:bg-muted/50 cursor-pointer",
          }}
        >
          <DataGridTable />
        </DataGrid>
      </div>
    </DataGridContainer>
  );
}
