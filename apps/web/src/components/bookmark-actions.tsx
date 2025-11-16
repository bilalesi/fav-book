import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { EditBookmarkDialog } from "@/components/edit-bookmark-dialog";
import { DeleteBookmarkDialog } from "@/components/delete-bookmark-dialog";
import {
  useCollectionsList,
  useAddBookmarkToCollection,
} from "@/hooks/use-collections";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { BookmarkPost } from "@favy/shared";

interface BookmarkActionsProps {
  bookmark: BookmarkPost;
}

export function BookmarkActions({ bookmark }: BookmarkActionsProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: collections = [] } = useCollectionsList();
  const addToCollection = useAddBookmarkToCollection();
  const queryClient = useQueryClient();

  const bookmarkCollectionIds = bookmark.collections?.map((c) => c.id) || [];

  const handleAddToCollection = async (collectionId: string) => {
    try {
      await addToCollection.mutateAsync(
        {
          collectionId,
          bookmarkId: bookmark.id,
        },
        {
          onSuccess: () => {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
            queryClient.invalidateQueries({
              queryKey: ["bookmarks", "get", { id: bookmark.id }],
            });
            queryClient.invalidateQueries({ queryKey: ["collections"] });

            const collection = collections.find((c) => c.id === collectionId);
            toast.success(`Added to ${collection?.name || "collection"}`);
          },
        }
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add to collection"
      );
    }
  };

  // Filter out collections that already contain this bookmark
  const availableCollections = collections.filter(
    (collection) => !bookmarkCollectionIds.includes(collection.id)
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              // Prevent row click event from firing
              e.stopPropagation();
            }}
          >
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setEditDialogOpen(true);
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>

          {availableCollections.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                Add to Collection
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {availableCollections.map((collection) => (
                  <DropdownMenuItem
                    key={collection.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCollection(collection.id);
                    }}
                    disabled={addToCollection.isPending}
                  >
                    {collection.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditBookmarkDialog
        bookmark={bookmark}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <DeleteBookmarkDialog
        bookmarkId={bookmark.id}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
