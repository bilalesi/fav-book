import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteBookmark } from "@/hooks/use-bookmarks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DeleteBookmarkDialogProps {
  bookmarkId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteBookmarkDialog({
  bookmarkId,
  open,
  onOpenChange,
  onDeleted,
}: DeleteBookmarkDialogProps) {
  const deleteBookmark = useDeleteBookmark();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      await deleteBookmark.mutateAsync(bookmarkId, {
        onSuccess: () => {
          // Optimistically remove from cache
          queryClient.removeQueries({
            queryKey: ["bookmarks", "get", { id: bookmarkId }],
          });

          // Invalidate list queries to refresh
          queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });

          toast.success("Bookmark deleted successfully");
          onOpenChange(false);
          onDeleted?.();
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete bookmark"
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Bookmark</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this bookmark? This action cannot be
            undone. The bookmark will be removed from all collections and
            categories.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteBookmark.isPending}
          >
            {deleteBookmark.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
