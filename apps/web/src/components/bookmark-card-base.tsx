import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BookmarkPost } from "@my-better-t-app/shared";
import { Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { queryClient, client } from "@/utils/orpc";
import type { ReactNode } from "react";

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
            <div className="flex items-center gap-2 mb-2">
              {platformBadge}
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
          {externalLinkButton}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mainContent}

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
              >
                +{bookmark.categories.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
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
          >
            View Details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
