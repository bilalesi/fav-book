import { createFileRoute } from "@tanstack/react-router";
import {
  useCollectionsList,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
} from "@/hooks/use-collections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, FolderOpen, Bookmark } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/collections")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: collections, isLoading, refetch } = useCollectionsList();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Collections</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize your bookmarks into collections
          </p>
        </div>
        <CreateCollectionDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => {
            refetch();
            setCreateDialogOpen(false);
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections && collections.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection: any) => (
              <Card
                key={collection.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="truncate">{collection.name}</span>
                      </CardTitle>
                      {collection.description && (
                        <CardDescription className="mt-2 line-clamp-2">
                          {collection.description}
                        </CardDescription>
                      )}
                    </div>
                    <CardAction>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCollection(collection);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCollection(collection);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardAction>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Bookmark className="h-4 w-4" />
                      <span>
                        {collection.bookmarkCount || 0} bookmark
                        {collection.bookmarkCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Link to="/collections/$id" params={{ id: collection.id }}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <EditCollectionDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            collection={selectedCollection}
            onSuccess={() => {
              refetch();
              setEditDialogOpen(false);
              setSelectedCollection(null);
            }}
          />

          <DeleteCollectionDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            collection={selectedCollection}
            onSuccess={() => {
              refetch();
              setDeleteDialogOpen(false);
              setSelectedCollection(null);
            }}
          />
        </>
      ) : (
        <EmptyState onCreateClick={() => setCreateDialogOpen(true)} />
      )}
    </div>
  );
}

function CreateCollectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createMutation = useCreateCollection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Collection created successfully");
      setName("");
      setDescription("");
      onSuccess();
    } catch (error) {
      toast.error("Failed to create collection");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Create a new collection to organize your bookmarks
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="My Collection"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={255}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const updateMutation = useUpdateCollection();

  // Update form when collection changes
  useState(() => {
    if (collection) {
      setName(collection.name || "");
      setDescription(collection.description || "");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    if (!collection) return;

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
    } catch (error) {
      toast.error("Failed to update collection");
      console.error(error);
    }
  };

  if (!collection) return null;

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
    if (!collection) return;

    try {
      await deleteMutation.mutateAsync(collection.id);
      toast.success("Collection deleted successfully");
      onSuccess();
    } catch (error) {
      toast.error("Failed to delete collection");
      console.error(error);
    }
  };

  if (!collection) return null;

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

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        <FolderOpen className="h-12 w-12 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No collections yet</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Collections help you organize your bookmarks into groups. Create your
        first collection to get started.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="h-4 w-4" />
        Create Your First Collection
      </Button>
    </div>
  );
}
