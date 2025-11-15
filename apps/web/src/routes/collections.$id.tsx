import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCollection,
  useUpdateCollection,
  useDeleteCollection,
  useAddBookmarkToCollection,
  useRemoveBookmarkFromCollection,
} from "@/hooks/use-collections";
import { useBookmarksList } from "@/hooks/use-bookmarks";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkCard } from "@/components/bookmark-card";
import { ArrowLeft, Edit, Trash2, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/collections/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: collection, isLoading, refetch } = useCollection(id);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addBookmarkDialogOpen, setAddBookmarkDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Collection not found</h2>
          <p className="text-muted-foreground mb-4">
            The collection you're looking for doesn't exist or you don't have
            access to it.
          </p>
          <Link to="/collections">
            <Button>
              <ArrowLeft className="h-4 w-4" />
              Back to Collections
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/collections">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Collections
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{collection.name}</h1>
            {collection.description && (
              <p className="text-muted-foreground mt-2">
                {collection.description}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {collection.bookmarks?.length || 0} bookmark
              {collection.bookmarks?.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Add Bookmark Button */}
      <div className="mb-6">
        <Button onClick={() => setAddBookmarkDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Bookmark
        </Button>
      </div>

      {/* Bookmarks Grid */}
      {collection.bookmarks && collection.bookmarks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collection.bookmarks.map((bookmark: any) => (
            <div key={bookmark.id} className="relative">
              <BookmarkCard bookmark={bookmark} />
              <RemoveBookmarkButton
                collectionId={id}
                bookmarkId={bookmark.id}
                onSuccess={refetch}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyBookmarksState
          onAddClick={() => setAddBookmarkDialogOpen(true)}
        />
      )}

      {/* Edit Dialog */}
      <EditCollectionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        collection={collection}
        onSuccess={refetch}
      />

      {/* Delete Dialog */}
      <DeleteCollectionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        collection={collection}
        onSuccess={() => {
          toast.success("Collection deleted successfully");
          navigate({ to: "/collections" });
        }}
      />

      {/* Add Bookmark Dialog */}
      <AddBookmarkDialog
        open={addBookmarkDialogOpen}
        onOpenChange={setAddBookmarkDialogOpen}
        collectionId={id}
        existingBookmarkIds={collection.bookmarks?.map((b: any) => b.id) || []}
        onSuccess={refetch}
      />
    </div>
  );
}

function RemoveBookmarkButton({
  collectionId,
  bookmarkId,
  onSuccess,
}: {
  collectionId: string;
  bookmarkId: string;
  onSuccess: () => void;
}) {
  const removeMutation = useRemoveBookmarkFromCollection();

  const handleRemove = async () => {
    try {
      await removeMutation.mutateAsync({ collectionId, bookmarkId });
      toast.success("Bookmark removed from collection");
      onSuccess();
    } catch (error) {
      toast.error("Failed to remove bookmark");
      console.error(error);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
      onClick={handleRemove}
      disabled={removeMutation.isPending}
    >
      <X className="h-4 w-4" />
    </Button>
  );
}

function EditCollectionDialog({
  open,
  onOpenChange,
  collection,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: any;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(collection?.name || "");
  const [description, setDescription] = useState(collection?.description || "");
  const updateMutation = useUpdateCollection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: collection.id,
        data: {
          name: name.trim(),
          description: description.trim() || undefined,
        },
      });
      toast.success("Collection updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update collection");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>
              Update the collection name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                placeholder="My Collection"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Optional description for this collection"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCollectionDialog({
  open,
  onOpenChange,
  collection,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: any;
  onSuccess: () => void;
}) {
  const deleteMutation = useDeleteCollection();

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(collection.id);
      onSuccess();
    } catch (error) {
      toast.error("Failed to delete collection");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Collection</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{collection.name}"? This action
            cannot be undone. Your bookmarks will not be deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddBookmarkDialog({
  open,
  onOpenChange,
  collectionId,
  existingBookmarkIds,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  existingBookmarkIds: string[];
  onSuccess: () => void;
}) {
  const { data: bookmarksData } = useBookmarksList({});
  const addMutation = useAddBookmarkToCollection();
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string>("");

  const availableBookmarks =
    bookmarksData?.bookmarks?.filter(
      (b: any) => !existingBookmarkIds.includes(b.id)
    ) || [];

  const handleAdd = async () => {
    if (!selectedBookmarkId) {
      toast.error("Please select a bookmark");
      return;
    }

    try {
      await addMutation.mutateAsync({
        collectionId,
        bookmarkId: selectedBookmarkId,
      });
      toast.success("Bookmark added to collection");
      setSelectedBookmarkId("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.message?.includes("already in this collection")) {
        toast.error("This bookmark is already in the collection");
      } else {
        toast.error("Failed to add bookmark");
      }
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bookmark to Collection</DialogTitle>
          <DialogDescription>
            Select a bookmark to add to this collection
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {availableBookmarks.length > 0 ? (
            <div className="space-y-2">
              {availableBookmarks.map((bookmark: any) => (
                <Card
                  key={bookmark.id}
                  className={`cursor-pointer transition-all ${
                    selectedBookmarkId === bookmark.id
                      ? "ring-2 ring-primary"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedBookmarkId(bookmark.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {bookmark.authorName}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {bookmark.content}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No bookmarks available to add.</p>
              <p className="text-sm mt-2">
                All your bookmarks are already in this collection.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedBookmarkId || addMutation.isPending}
          >
            {addMutation.isPending ? "Adding..." : "Add to Collection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyBookmarksState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-lg">
      <div className="rounded-full bg-muted p-6 mb-4">
        <Plus className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">
        No bookmarks in this collection
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Add bookmarks to this collection to organize and group related content
        together.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="h-4 w-4" />
        Add Your First Bookmark
      </Button>
    </div>
  );
}
