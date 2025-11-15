import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useBookmark } from "@/hooks/use-bookmarks";
import Loader from "@/components/loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";
import { DeleteBookmarkDialog } from "@/components/delete-bookmark-dialog";
import { ManageCollectionsDialog } from "@/components/manage-collections-dialog";
import { ManageCategoriesDialog } from "@/components/manage-categories-dialog";
import { BookmarkStatusBadge } from "@/components/bookmark-status-badge";
import { BookmarkSummary } from "@/components/bookmark-summary";
import { DownloadedMediaPlayer } from "@/components/downloaded-media-player";
import { RetryEnrichmentButton } from "@/components/retry-enrichment-button";
import { EnrichmentErrorDetails } from "@/components/enrichment-error-details";
import { useBookmarkStatus } from "@/hooks/use-bookmark-status";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import { useState } from "react";
import {
  Edit2Icon,
  TrashIcon,
  FolderIcon,
  TagIcon,
  ExternalLinkIcon,
  EyeIcon,
  CalendarIcon,
} from "lucide-react";

export const Route = createFileRoute("/bookmarks/$id")({
  component: BookmarkDetailPage,
});

function BookmarkDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: bookmark, isLoading, error } = useBookmark(id);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionsDialogOpen, setCollectionsDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);

  // Poll for enrichment status if bookmark is being processed
  const { status: enrichmentStatus } = useBookmarkStatus({
    bookmarkId: id,
    initialStatus: bookmark?.enrichment?.processingStatus,
    enabled: !!bookmark,
  });

  // Fetch detailed enrichment status with error information
  const { data: enrichmentDetails } = useQuery({
    queryKey: ["bookmarks", "enrichment-status", id],
    queryFn: async () => {
      return await client.bookmarks.getEnrichmentStatus({ id });
    },
    enabled: !!bookmark && !!bookmark.enrichment,
    refetchInterval: (data) => {
      // Poll every 10 seconds if processing
      if (data?.processingStatus === "PROCESSING") {
        return 10000;
      }
      return false;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (error || !bookmark) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">
          {error ? "Failed to load bookmark" : "Bookmark not found"}
        </p>
        <Button onClick={() => navigate({ to: "/bookmarks" })}>
          Back to Bookmarks
        </Button>
      </div>
    );
  }

  const platformIcon =
    bookmark.platform === "TWITTER" ? (
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ) : (
      <svg
        className="size-5"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
      </svg>
    );

  const imageMedia = bookmark.media?.filter((m) => m.type === "IMAGE") || [];
  const videoMedia = bookmark.media?.filter((m) => m.type === "VIDEO") || [];
  const linkMedia = bookmark.media?.filter((m) => m.type === "LINK") || [];

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header with actions */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/bookmarks" })}
        >
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit2Icon className="size-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCollectionsDialogOpen(true)}
          >
            <FolderIcon className="size-4 mr-2" />
            Collections
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCategoriesDialogOpen(true)}
          >
            <TagIcon className="size-4 mr-2" />
            Categories
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <TrashIcon className="size-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {platformIcon}
                <Badge variant="secondary">
                  {bookmark.platform === "TWITTER" ? "X (Twitter)" : "LinkedIn"}
                </Badge>
                {bookmark.enrichment && (
                  <BookmarkStatusBadge status={enrichmentStatus} />
                )}
              </div>
              <CardTitle className="text-2xl mb-2">
                {bookmark.authorName}
              </CardTitle>
              <p className="text-muted-foreground">
                @{bookmark.authorUsername}
              </p>
            </div>
            <a
              href={bookmark.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLinkIcon className="size-5" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Post content */}
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-base leading-relaxed">
              {bookmark.content}
            </p>
          </div>

          {/* AI Summary Section */}
          {bookmark.enrichment && (
            <div className="space-y-4">
              {enrichmentStatus === "COMPLETED" && (
                <BookmarkSummary
                  summary={bookmark.enrichment.summary}
                  keywords={bookmark.enrichment.keywords}
                  tags={bookmark.enrichment.tags}
                />
              )}

              {(enrichmentStatus === "FAILED" ||
                enrichmentStatus === "PARTIAL_SUCCESS") &&
                enrichmentDetails?.hasErrors && (
                  <EnrichmentErrorDetails
                    errors={enrichmentDetails.errors || []}
                    bookmarkId={bookmark.id}
                    processingStatus={enrichmentStatus}
                  />
                )}

              {enrichmentStatus === "PARTIAL_SUCCESS" &&
                bookmark.enrichment.summary && (
                  <BookmarkSummary
                    summary={bookmark.enrichment.summary}
                    keywords={bookmark.enrichment.keywords}
                    tags={bookmark.enrichment.tags}
                  />
                )}
            </div>
          )}

          {/* Downloaded Media Section */}
          {bookmark.downloadedMedia && bookmark.downloadedMedia.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Downloaded Media</h3>
              {bookmark.downloadedMedia.map((media) => (
                <DownloadedMediaPlayer key={media.id} media={media} />
              ))}
            </div>
          )}

          {/* Media gallery */}
          {imageMedia.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Images</h3>
              <div className="grid grid-cols-2 gap-4">
                {imageMedia.map((media) => (
                  <a
                    key={media.id}
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={media.thumbnailUrl || media.url}
                      alt="Post media"
                      className="w-full h-auto rounded-lg border hover:opacity-90 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {videoMedia.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Videos</h3>
              <div className="space-y-2">
                {videoMedia.map((media) => (
                  <a
                    key={media.id}
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLinkIcon className="size-4" />
                    View video
                  </a>
                ))}
              </div>
            </div>
          )}

          {linkMedia.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Links</h3>
              <div className="space-y-3">
                {linkMedia.map((media) => (
                  <a
                    key={media.id}
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border rounded-lg overflow-hidden hover:bg-accent transition-colors"
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
                    <div className="p-4 space-y-2">
                      {media.metadata?.title && (
                        <p className="font-medium text-base">
                          {media.metadata.title}
                        </p>
                      )}
                      {media.metadata?.description && (
                        <p className="text-sm text-muted-foreground">
                          {media.metadata.description}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <ExternalLinkIcon className="size-4" />
                        {new URL(media.url).hostname}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Collections */}
          {bookmark.collections && bookmark.collections.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Collections</h3>
              <div className="flex flex-wrap gap-2">
                {bookmark.collections.map((collection) => (
                  <Badge key={collection.id} variant="outline">
                    <FolderIcon className="size-3 mr-1" />
                    {collection.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {bookmark.categories && bookmark.categories.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {bookmark.categories.map((category) => (
                  <Badge key={category.id} variant="secondary">
                    <TagIcon className="size-3 mr-1" />
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4" />
              <span>
                Saved{" "}
                {new Date(bookmark.savedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <EyeIcon className="size-4" />
              <span>{bookmark.viewCount} views</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditBookmarkDialog
        bookmark={bookmark}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <DeleteBookmarkDialog
        bookmarkId={bookmark.id}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => navigate({ to: "/bookmarks" })}
      />
      <ManageCollectionsDialog
        bookmark={bookmark}
        open={collectionsDialogOpen}
        onOpenChange={setCollectionsDialogOpen}
      />
      <ManageCategoriesDialog
        bookmark={bookmark}
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      />
    </div>
  );
}
