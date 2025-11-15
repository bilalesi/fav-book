import { Badge } from "@/components/ui/badge";
import type { BookmarkPost } from "@my-better-t-app/shared";
import { ExternalLink, Globe, Pencil, Trash2 } from "lucide-react";
import { BookmarkCardBase } from "./bookmark-card-base";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { EditBookmarkDialog } from "./edit-bookmark-dialog";
import { DeleteBookmarkDialog } from "./delete-bookmark-dialog";

interface BookmarkCardUrlProps {
  bookmark: BookmarkPost;
}

export function BookmarkCardUrl({ bookmark }: BookmarkCardUrlProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + "...";
  };

  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Get favicon URL from metadata or use default
  const getFaviconUrl = () => {
    if (bookmark.metadata?.favicon) {
      return bookmark.metadata.favicon;
    }
    // Use Google's favicon service as fallback
    const domain = getDomain(bookmark.postUrl);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  const platformBadge = (
    <Badge variant="outline" aria-label="Platform: URL">
      URL
    </Badge>
  );

  const headerContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <img
          src={getFaviconUrl()}
          alt=""
          className="w-4 h-4"
          onError={(e) => {
            // Fallback to globe icon if favicon fails to load
            e.currentTarget.style.display = "none";
          }}
        />
        <Globe className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold text-sm truncate">{bookmark.authorName}</p>
      </div>
      <p className="text-xs text-muted-foreground truncate">
        {getDomain(bookmark.postUrl)}
      </p>
    </div>
  );

  const mainContent = (
    <>
      {bookmark.content && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {truncateContent(bookmark.content)}
        </p>
      )}

      {/* Open Graph Image if available */}
      {bookmark.metadata?.ogImage && (
        <div className="rounded-lg overflow-hidden border">
          <img
            src={bookmark.metadata.ogImage}
            alt={bookmark.metadata?.ogTitle || bookmark.authorName}
            className="w-full aspect-video object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsEditDialogOpen(true)}
          className="flex items-center gap-1"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsDeleteDialogOpen(true)}
          className="flex items-center gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex items-center gap-1"
        >
          <a href={bookmark.postUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
            Open
          </a>
        </Button>
      </div>

      {/* Edit Dialog */}
      <EditBookmarkDialog
        bookmark={bookmark}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* Delete Dialog */}
      <DeleteBookmarkDialog
        bookmarkId={bookmark.id}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      />
    </>
  );

  const externalLinkButton = (
    <a
      href={bookmark.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
      aria-label="Open URL in new tab"
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
