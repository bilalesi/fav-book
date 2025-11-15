import { Badge } from "@/components/ui/badge";
import type { BookmarkPost } from "@my-better-t-app/shared";
import { ExternalLink } from "lucide-react";
import { BookmarkCardBase } from "./bookmark-card-base";

interface BookmarkCardTwitterProps {
  bookmark: BookmarkPost;
}

export function BookmarkCardTwitter({ bookmark }: BookmarkCardTwitterProps) {
  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
  };

  const platformBadge = (
    <Badge variant="default" aria-label="Platform: Twitter">
      Twitter
    </Badge>
  );

  const headerContent = (
    <div className="space-y-1">
      <p className="font-semibold text-sm">{bookmark.authorName}</p>
      <p className="text-xs text-muted-foreground">
        @{bookmark.authorUsername}
      </p>
    </div>
  );

  const mainContent = (
    <>
      <p className="text-sm leading-relaxed">
        {truncateContent(bookmark.content)}
      </p>

      {/* Media Preview */}
      {bookmark.media && bookmark.media.length > 0 && (
        <div className="space-y-2" role="list" aria-label="Media attachments">
          {/* Link Cards */}
          {bookmark.media
            .filter((m: any) => m.type === "LINK")
            .slice(0, 1)
            .map((media: any) => (
              <a
                key={media.id}
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border rounded-lg overflow-hidden hover:bg-accent transition-colors"
                role="listitem"
              >
                {media.thumbnailUrl && (
                  <div className="aspect-video bg-muted">
                    <img
                      src={media.thumbnailUrl}
                      alt={media.metadata?.title || "Link preview"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-3 space-y-1">
                  {media.metadata?.title && (
                    <p className="font-medium text-sm line-clamp-1">
                      {media.metadata.title}
                    </p>
                  )}
                  {media.metadata?.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {media.metadata.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {new URL(media.url).hostname}
                  </p>
                </div>
              </a>
            ))}

          {/* Images and Videos */}
          {bookmark.media.filter(
            (m: any) => m.type === "IMAGE" || m.type === "VIDEO"
          ).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {bookmark.media
                .filter((m: any) => m.type === "IMAGE" || m.type === "VIDEO")
                .slice(0, 4)
                .map((media: any, index: number) => (
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
        </div>
      )}
    </>
  );

  const externalLinkButton = (
    <a
      href={bookmark.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
      aria-label="Open original post in new tab"
    >
      <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );

  return (
    <BookmarkCardBase
      bookmark={bookmark}
      platformBadge={platformBadge}
      headerContent={headerContent}
      mainContent={mainContent}
      externalLinkButton={externalLinkButton}
    />
  );
}
