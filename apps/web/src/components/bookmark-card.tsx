import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BookmarkPost } from "@my-better-t-app/shared";
import { ExternalLink, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { queryClient, client } from "@/utils/orpc";

interface BookmarkCardProps {
  bookmark: BookmarkPost;
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
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
      aria-label={`Bookmark from ${bookmark.authorName} on ${
        bookmark.platform === "TWITTER" ? "Twitter" : "LinkedIn"
      }`}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={
                  bookmark.platform === "TWITTER" ? "default" : "secondary"
                }
                aria-label={`Platform: ${
                  bookmark.platform === "TWITTER" ? "Twitter" : "LinkedIn"
                }`}
              >
                {bookmark.platform === "TWITTER" ? "Twitter" : "LinkedIn"}
              </Badge>
              <div
                className="flex items-center gap-1 text-xs text-muted-foreground"
                aria-label={`Viewed ${bookmark.viewCount} times`}
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                <span>{bookmark.viewCount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">{bookmark.authorName}</p>
              <p className="text-xs text-muted-foreground">
                @{bookmark.authorUsername}
              </p>
            </div>
          </div>
          <a
            href={bookmark.postUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
            aria-label="Open original post in new tab"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">
          {truncateContent(bookmark.content)}
        </p>

        {/* Media Preview */}
        {bookmark.media && bookmark.media.length > 0 && (
          <div
            className="grid grid-cols-2 gap-2"
            role="list"
            aria-label="Media attachments"
          >
            {bookmark.media.slice(0, 4).map((media: any, index: number) => (
              <div
                key={media.id}
                className="relative aspect-video bg-muted rounded-md overflow-hidden"
                role="listitem"
              >
                {media.type === "IMAGE" && (
                  <img
                    src={media.thumbnailUrl || media.url}
                    alt={`Media attachment ${index + 1} from bookmark`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                {media.type === "VIDEO" && (
                  <div
                    className="w-full h-full flex items-center justify-center bg-muted"
                    role="img"
                    aria-label={`Video attachment ${index + 1}`}
                  >
                    <span
                      className="text-xs text-muted-foreground"
                      aria-hidden="true"
                    >
                      Video
                    </span>
                  </div>
                )}
              </div>
            ))}
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
