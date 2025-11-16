import type { BookmarkPost, Platform } from "@favy/shared";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { BookmarkActions } from "@/components/bookmark-actions";
import type { ReactNode } from "react";

// Column definition interface
export interface BookmarkTableColumn {
  id: string;
  header: string | ((props: { table: any }) => ReactNode);
  accessorKey?: string;
  cell?: (props: { row: { original: BookmarkPost } }) => ReactNode;
  sortable?: boolean;
  width?: string;
}

// Cell Renderer Components

/**
 * Thumbnail cell renderer - displays bookmark thumbnail or platform icon
 */
export function BookmarkThumbnail({ bookmark }: { bookmark: BookmarkPost }) {
  const firstMedia = bookmark.media?.[0];
  const thumbnailUrl = firstMedia?.thumbnailUrl || firstMedia?.url;

  if (thumbnailUrl) {
    return (
      <div className="relative w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
        <img
          src={thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback to platform icon
  return (
    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
      <PlatformIcon platform={bookmark.platform} />
    </div>
  );
}

/**
 * Title cell renderer - displays bookmark title with content preview
 */
export function BookmarkTitleCell({ bookmark }: { bookmark: BookmarkPost }) {
  const truncatedContent =
    bookmark.content.length > 100
      ? `${bookmark.content.substring(0, 100)}...`
      : bookmark.content;

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <div className="font-medium text-sm line-clamp-2 wrap-break-word">
        {truncatedContent || "No content"}
      </div>
      {bookmark.enrichment?.summary && (
        <div className="text-xs text-muted-foreground line-clamp-1">
          {bookmark.enrichment.summary}
        </div>
      )}
    </div>
  );
}

/**
 * Platform badge renderer - displays platform with appropriate styling
 */
export function PlatformBadge({ platform }: { platform: Platform }) {
  const platformConfig: Record<
    Platform,
    { label: string; variant: "primary" | "success" | "info" }
  > = {
    TWITTER: { label: "Twitter", variant: "primary" },
    LINKEDIN: { label: "LinkedIn", variant: "info" },
    GENERIC_URL: { label: "URL", variant: "success" },
  };

  const config = platformConfig[platform] || {
    label: platform,
    variant: "primary" as const,
  };

  return (
    <Badge variant={config.variant} appearance="light" size="sm">
      {config.label}
    </Badge>
  );
}

/**
 * Platform icon component
 */
function PlatformIcon({ platform }: { platform: Platform }) {
  const iconClass = "w-5 h-5";

  switch (platform) {
    case "TWITTER":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-label="Twitter"
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "LINKEDIN":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-label="LinkedIn"
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "GENERIC_URL":
      return (
        <svg
          className={iconClass}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-label="URL"
        >
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Date cell renderer - displays formatted date
 */
export function DateCell({ date }: { date: Date }) {
  const dateObj = date instanceof Date ? date : new Date(date);

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <time
      className="text-sm text-muted-foreground whitespace-nowrap"
      dateTime={dateObj.toISOString()}
    >
      {formatDate(dateObj)}
    </time>
  );
}

// BookmarkActions component is now imported from @/components/bookmark-actions
// It handles edit, delete, and add to collection actions with integrated dialogs

/**
 * Select all checkbox for table header
 */
export function SelectAllCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label="Select all bookmarks"
    />
  );
}

/**
 * Row checkbox for individual bookmark selection
 */
export function RowCheckbox({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Checkbox
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label="Select bookmark"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/**
 * Column definitions for bookmark table
 */
export function createBookmarkColumns({
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
}: {
  selectedIds: Set<string>;
  onToggleSelection: (bookmarkId: string) => void;
  onToggleSelectAll: () => void;
}): BookmarkTableColumn[] {
  return [
    {
      id: "select",
      header: () => (
        <SelectAllCheckbox
          checked={selectedIds.size > 0}
          onCheckedChange={onToggleSelectAll}
        />
      ),
      cell: ({ row }) => (
        <RowCheckbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={() => onToggleSelection(row.original.id)}
        />
      ),
      width: "40px",
    },
    {
      id: "thumbnail",
      header: "",
      cell: ({ row }) => <BookmarkThumbnail bookmark={row.original} />,
      width: "60px",
    },
    {
      id: "title",
      header: "Title",
      cell: ({ row }) => <BookmarkTitleCell bookmark={row.original} />,
      sortable: true,
      width: "auto",
    },
    {
      id: "author",
      header: "Author",
      accessorKey: "authorName",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium">{row.original.authorName}</div>
          <div className="text-xs text-muted-foreground">
            @{row.original.authorUsername}
          </div>
        </div>
      ),
      sortable: true,
      width: "150px",
    },
    {
      id: "platform",
      header: "Platform",
      cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
      sortable: true,
      width: "100px",
    },
    {
      id: "savedAt",
      header: "Saved",
      cell: ({ row }) => <DateCell date={row.original.savedAt} />,
      sortable: true,
      width: "120px",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => <BookmarkActions bookmark={row.original} />,
      width: "80px",
    },
  ];
}
