import { LayoutGrid, Table } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBookmarkViewStore } from "@/stores/bookmark-view-store";

export function ViewToggle() {
  const viewMode = useBookmarkViewStore((state) => state.viewMode);
  const setViewMode = useBookmarkViewStore((state) => state.setViewMode);

  return (
    <ToggleGroup
      type="single"
      value={viewMode}
      onValueChange={(value) => {
        if (value) {
          setViewMode(value as "card" | "table");
        }
      }}
      aria-label="Toggle bookmark view mode"
    >
      <ToggleGroupItem value="card" aria-label="Card view">
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="table" aria-label="Table view">
        <Table className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
