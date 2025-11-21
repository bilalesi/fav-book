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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  useCollectionsList,
  useAddBookmarkToCollection,
  useRemoveBookmarkFromCollection,
} from "@/hooks/use-collections";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Loader from "@/components/loader";
import type { IBookmarkPost } from "@favy/shared";

interface ManageCollectionsDialogProps {
  bookmark: IBookmarkPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageCollectionsDialog({
  bookmark,
  open,
  onOpenChange,
}: ManageCollectionsDialogProps) {
  const { data: collections, isLoading } = useCollectionsList();
  const addToCollection = useAddBookmarkToCollection();
  const removeFromCollection = useRemoveBookmarkFromCollection();
  const queryClient = useQueryClient();

  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(
    new Set(bookmark.collections?.map((c) => c.id) || [])
  );
  const [pendingChanges, setPendingChanges] = useState<
    Array<{ collectionId: string; action: "add" | "remove" }>
  >([]);

  const handleToggleCollection = (collectionId: string, checked: boolean) => {
    const newSelected = new Set(selectedCollections);

    if (checked) {
      newSelected.add(collectionId);
      setPendingChanges((prev) => [
        ...prev.filter((c) => c.collectionId !== collectionId),
        { collectionId, action: "add" },
      ]);
    } else {
      newSelected.delete(collectionId);
      setPendingChanges((prev) => [
        ...prev.filter((c) => c.collectionId !== collectionId),
        { collectionId, action: "remove" },
      ]);
    }

    setSelectedCollections(newSelected);
  };

  const handleSave = async () => {
    try {
      for (const change of pendingChanges) {
        if (change.action === "add") {
          await addToCollection.mutateAsync({
            collectionId: change.collectionId,
            bookmarkId: bookmark.id,
          });
        } else {
          await removeFromCollection.mutateAsync({
            collectionId: change.collectionId,
            bookmarkId: bookmark.id,
          });
        }
      }

      // Optimistically update the bookmark cache
      queryClient.setQueryData(
        ["bookmarks", "get", { id: bookmark.id }],
        (old: IBookmarkPost | undefined) => {
          if (!old) return old;

          const updatedCollections =
            collections?.filter((c) => selectedCollections.has(c.id)) || [];

          return {
            ...old,
            collections: updatedCollections,
          };
        }
      );

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "get"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      toast.success("Collections updated successfully");
      setPendingChanges([]);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update collections"
      );
    }
  };

  const handleCancel = () => {
    setSelectedCollections(
      new Set(bookmark.collections?.map((c) => c.id) || [])
    );
    setPendingChanges([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Collections</DialogTitle>
          <DialogDescription>
            Add or remove this bookmark from your collections.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : collections && collections.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Checkbox
                    id={`collection-${collection.id}`}
                    checked={selectedCollections.has(collection.id)}
                    onCheckedChange={(checked) =>
                      handleToggleCollection(collection.id, checked === true)
                    }
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`collection-${collection.id}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {collection.name}
                    </Label>
                    {collection.description && (
                      <p className="text-xs text-muted-foreground">
                        {collection.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No collections found.</p>
              <p className="text-sm mt-2">
                Create a collection first to organize your bookmarks.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              pendingChanges.length === 0 ||
              addToCollection.isPending ||
              removeFromCollection.isPending
            }
          >
            {addToCollection.isPending || removeFromCollection.isPending
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
