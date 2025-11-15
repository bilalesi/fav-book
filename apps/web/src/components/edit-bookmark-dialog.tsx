import { useState } from "react";
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
import { useUpdateBookmark } from "@/hooks/use-bookmarks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BookmarkPost } from "@my-better-t-app/shared";

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
  const [content, setContent] = useState(bookmark.content);
  const updateBookmark = useUpdateBookmark();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    try {
      await updateBookmark.mutateAsync(
        {
          id: bookmark.id,
          data: { content },
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
          <DialogDescription>
            Update the content of your bookmark. Changes will be saved to your
            private collection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="resize-none"
              placeholder="Enter bookmark content..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setContent(bookmark.content);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateBookmark.isPending || content === bookmark.content}
          >
            {updateBookmark.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
