import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BookmarkPost } from "@favy/shared";
import { Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { queryClient, client } from "@/utils/orpc";
import type { ReactNode } from "react";
import { BookmarkStatusBadge } from "./bookmark-status-badge";
import { cloneElement, isValidElement } from "react";

interface BookmarkCardBaseProps {
  bookmark: BookmarkPost;
  platformBadge: ReactNode;
  headerContent: ReactNode;
  mainContent: ReactNode;
  externalLinkButton: ReactNode;
}

export function BookmarkCardBase({
  bookmark,
  platformBadge,
  headerContent,
  mainContent,
  externalLinkButton,
}: BookmarkCardBaseProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Prefetch bookmark details on hover
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ["bookmarks", "get", bookmark.id],
      queryFn: () => client.bookmarks.get({ id: bookmark.id }),
    });
  };

  // Add data-interactive and stopPropagation to external link button
  const enhancedExternalLinkButton = isValidElement(externalLinkButton)
    ? cloneElement(externalLinkButton as React.ReactElement<any>, {
        "data-interactive": "true",
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          // Call original onClick if it exists
          const originalOnClick = (externalLinkButton as any).props?.onClick;
          if (originalOnClick) {
            originalOnClick(e);
          }
        },
      })
    : externalLinkButton;

  return (
    <Card
      className="hover:shadow-lg transition-shadow"
      onMouseEnter={handleMouseEnter}
      role="article"
      aria-label={`Bookmark from ${bookmark.authorName}`}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {platformBadge}
              {bookmark.enrichment && (
                <BookmarkStatusBadge
                  status={bookmark.enrichment.processingStatus}
                />
              )}
              <div
                className="flex items-center gap-1 text-xs text-muted-foreground"
                aria-label={`Viewed ${bookmark.viewCount} times`}
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>{bookmark.viewCount}</span>
              </div>
            </div>
            {headerContent}
          </div>
          {enhancedExternalLinkButton}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mainContent}

        {/* Enrichment Preview */}
        {bookmark.enrichment?.processingStatus === "COMPLETED" &&
          bookmark.enrichment.summary && (
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs text-muted-foreground line-clamp-2">
                <span className="font-medium">AI Summary:</span>{" "}
                {bookmark.enrichment.summary}
              </p>
              {bookmark.enrichment.keywords &&
                bookmark.enrichment.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {bookmark.enrichment.keywords.slice(0, 3).map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="text-xs"
                      >
                        {keyword}
                      </Badge>
                    ))}
                    {bookmark.enrichment.keywords.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{bookmark.enrichment.keywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
            </div>
          )}

        {/* Categories */}
        {bookmark.categories && bookmark.categories.length > 0 && (
          <div
            className="flex flex-wrap gap-1"
            role="list"
            aria-label="Categories"
          >
            {bookmark.categories.slice(0, 3).map((category: any) => (
              <Badge
                key={category.id}
                variant="outline"
                className="text-xs"
                role="listitem"
                data-interactive="true"
                onClick={(e) => e.stopPropagation()}
              >
                {category.name}
              </Badge>
            ))}
            {bookmark.categories.length > 3 && (
              <Badge
                variant="outline"
                className="text-xs"
                role="listitem"
                aria-label={`${bookmark.categories.length - 3} more categories`}
                data-interactive="true"
                onClick={(e) => e.stopPropagation()}
              >
                +{bookmark.categories.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t mt-auto">
          <time
            className="text-xs text-muted-foreground"
            dateTime={bookmark.savedAt.toISOString()}
          >
            {formatDate(bookmark.savedAt)}
          </time>
          <Link
            to="/bookmarks/$id"
            params={{ id: bookmark.id }}
            className="text-xs text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded px-1"
            aria-label={`View details for bookmark from ${bookmark.authorName}`}
            data-interactive="true"
            onClick={(e) => e.stopPropagation()}
          >
            View Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
