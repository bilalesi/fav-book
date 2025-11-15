import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateBookmark } from "@/hooks/use-bookmarks";
import { useCollectionsList } from "@/hooks/use-collections";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BookmarkPost, Collection } from "@my-better-t-app/shared";

interface EditBookmarkDialogProps {
  bookmark: BookmarkPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBookmarkDialog({
  bookmark,
  open,
  onOpenChange,
}: EditBookmarkDialogProps) {
  const isUrlBookmark = bookmark.platform === "GENERIC_URL";

  // For URL bookmarks, title is stored in metadata
  const initialTitle = isUrlBookmark
    ? (bookmark.metadata?.title as string) || bookmark.authorName
    : "";

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(bookmark.content);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    bookmark.collections?.map((c) => c.id) || []
  );

  const updateBookmark = useUpdateBookmark();
  const { data: collections = [] } = useCollectionsList();
  const queryClient = useQueryClient();

  // Reset form when bookmark changes
  useEffect(() => {
    const newTitle = isUrlBookmark
      ? (bookmark.metadata?.title as string) || bookmark.authorName
      : "";
    setTitle(newTitle);
    setContent(bookmark.content);
    setSelectedCollectionIds(bookmark.collections?.map((c) => c.id) || []);
  }, [bookmark, isUrlBookmark]);

  const handleCollectionToggle = (collectionId: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleSave = async () => {
    try {
      // For URL bookmarks, update title in metadata
      const updatedMetadata = isUrlBookmark
        ? { ...bookmark.metadata, title }
        : bookmark.metadata;

      await updateBookmark.mutateAsync(
        {
          id: bookmark.id,
          data: {
            content,
            metadata: updatedMetadata,
            collectionIds: selectedCollectionIds,
          },
        },
        {
          onSuccess: (updatedBookmark) => {
            // Optimistically update the cache
            queryClient.setQueryData(
              ["bookmarks", "get", { id: bookmark.id }],
              updatedBookmark
            );

            // Invalidate list queries to refresh
            queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });

            toast.success("Bookmark updated successfully");
            onOpenChange(false);
          },
        }
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update bookmark"
      );
    }
  };

  const hasChanges =
    content !== bookmark.content ||
    (isUrlBookmark && title !== initialTitle) ||
    JSON.stringify(selectedCollectionIds.sort()) !==
      JSON.stringify((bookmark.collections?.map((c) => c.id) || []).sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
          <DialogDescription>
            {isUrlBookmark
              ? "Update the title, description, and collections for this URL bookmark."
              : "Update the content and collections of your bookmark."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isUrlBookmark && (
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter bookmark title..."
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="content">
              {isUrlBookmark ? "Description" : "Content"}
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={isUrlBookmark ? 6 : 10}
              className="resize-none"
              placeholder={
                isUrlBookmark
                  ? "Enter bookmark description..."
                  : "Enter bookmark content..."
              }
            />
          </div>

          {collections.length > 0 && (
            <div className="space-y-2">
              <Label>Collections</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-3">
                {collections.map((collection: Collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`collection-${collection.id}`}
                      checked={selectedCollectionIds.includes(collection.id)}
                      onCheckedChange={() =>
                        handleCollectionToggle(collection.id)
                      }
                    />
                    <label
                      htmlFor={`collection-${collection.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {collection.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setTitle(initialTitle);
              setContent(bookmark.content);
              setSelectedCollectionIds(
                bookmark.collections?.map((c) => c.id) || []
              );
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateBookmark.isPending || !hasChanges}
          >
            {updateBookmark.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
