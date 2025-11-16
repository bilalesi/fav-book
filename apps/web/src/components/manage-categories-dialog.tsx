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
import { Badge } from "@/components/ui/badge";
import {
  useCategoriesList,
  useAssignCategoryToBookmark,
  useRemoveCategoryFromBookmark,
} from "@/hooks/use-categories";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Loader from "@/components/loader";
import type { BookmarkPost } from "@favy/shared";

interface ManageCategoriesDialogProps {
  bookmark: BookmarkPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageCategoriesDialog({
  bookmark,
  open,
  onOpenChange,
}: ManageCategoriesDialogProps) {
  const { data: categories, isLoading } = useCategoriesList();
  const assignCategory = useAssignCategoryToBookmark();
  const removeCategory = useRemoveCategoryFromBookmark();
  const queryClient = useQueryClient();

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(bookmark.categories?.map((c) => c.id) || [])
  );
  const [pendingChanges, setPendingChanges] = useState<
    Array<{ categoryId: string; action: "add" | "remove" }>
  >([]);

  const handleToggleCategory = (categoryId: string, checked: boolean) => {
    const newSelected = new Set(selectedCategories);

    if (checked) {
      newSelected.add(categoryId);
      setPendingChanges((prev) => [
        ...prev.filter((c) => c.categoryId !== categoryId),
        { categoryId, action: "add" },
      ]);
    } else {
      newSelected.delete(categoryId);
      setPendingChanges((prev) => [
        ...prev.filter((c) => c.categoryId !== categoryId),
        { categoryId, action: "remove" },
      ]);
    }

    setSelectedCategories(newSelected);
  };

  const handleSave = async () => {
    try {
      // Execute all pending changes
      for (const change of pendingChanges) {
        if (change.action === "add") {
          await assignCategory.mutateAsync({
            categoryId: change.categoryId,
            bookmarkId: bookmark.id,
          });
        } else {
          await removeCategory.mutateAsync({
            categoryId: change.categoryId,
            bookmarkId: bookmark.id,
          });
        }
      }

      // Optimistically update the bookmark cache
      queryClient.setQueryData(
        ["bookmarks", "get", { id: bookmark.id }],
        (old: BookmarkPost | undefined) => {
          if (!old) return old;

          const updatedCategories =
            categories?.filter((c) => selectedCategories.has(c.id)) || [];

          return {
            ...old,
            categories: updatedCategories,
          };
        }
      );

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "get"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks", "list"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });

      toast.success("Categories updated successfully");
      setPendingChanges([]);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update categories"
      );
    }
  };

  const handleCancel = () => {
    setSelectedCategories(new Set(bookmark.categories?.map((c) => c.id) || []));
    setPendingChanges([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
          <DialogDescription>
            Assign categories to organize and filter your bookmarks.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : categories && categories.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.has(category.id)}
                    onCheckedChange={(checked) =>
                      handleToggleCategory(category.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`category-${category.id}`}
                    className="flex-1 text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    {category.name}
                    {category.isSystem && (
                      <Badge variant="secondary" className="text-xs">
                        System
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No categories found.</p>
              <p className="text-sm mt-2">
                Categories will be available once they are created.
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
              assignCategory.isPending ||
              removeCategory.isPending
            }
          >
            {assignCategory.isPending || removeCategory.isPending
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
