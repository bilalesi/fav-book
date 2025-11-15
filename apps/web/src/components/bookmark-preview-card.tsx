import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookmarkPost } from "@my-better-t-app/shared";

interface BookmarkPreviewCardProps {
  bookmark: BookmarkPost;
  onClick?: () => void;
}

export function BookmarkPreviewCard({
  bookmark,
  onClick,
}: BookmarkPreviewCardProps) {
  const firstImage = bookmark.media?.find((m) => m.type === "IMAGE");
  const platformIcon =
    bookmark.platform === "TWITTER" ? (
      <svg
        className="size-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ) : (
      <svg
        className="size-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
      </svg>
    );

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium truncate">
              {bookmark.authorName}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              @{bookmark.authorUsername}
            </p>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            {platformIcon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {firstImage && (
            <img
              src={firstImage.url}
              alt="Post preview"
              className="w-full h-32 object-cover rounded-md"
            />
          )}
          <p className="text-sm line-clamp-3">{bookmark.content}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {new Date(bookmark.savedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            {bookmark.viewCount > 0 && <span>{bookmark.viewCount} views</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
