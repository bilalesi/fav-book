import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useCategoriesList } from "@/hooks/use-categories";
import { Filter, X, Calendar, ArrowUpDown } from "lucide-react";
import type { BookmarkFilters } from "@my-better-t-app/shared";

interface BookmarkFiltersProps {
  filters: BookmarkFilters;
  onFiltersChange: (filters: BookmarkFilters) => void;
  onClearFilters: () => void;
  sortBy?: "savedAt" | "createdAt";
  sortOrder?: "asc" | "desc";
  onSortChange?: (
    sortBy: "savedAt" | "createdAt",
    sortOrder: "asc" | "desc"
  ) => void;
}

export function BookmarkFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  sortBy = "savedAt",
  sortOrder = "desc",
  onSortChange,
}: BookmarkFiltersProps) {
  const { data: categoriesData } = useCategoriesList();
  const categories = categoriesData || [];

  const hasActiveFilters =
    filters.platform ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.authorUsername ||
    (filters.categoryIds && filters.categoryIds.length > 0);

  const activeFilterCount = [
    filters.platform,
    filters.dateFrom,
    filters.dateTo,
    filters.authorUsername,
    filters.categoryIds && filters.categoryIds.length > 0,
  ].filter(Boolean).length;

  const handlePlatformChange = (platform: "TWITTER" | "LINKEDIN" | null) => {
    onFiltersChange({
      ...filters,
      platform: platform || undefined,
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = filters.categoryIds || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter((id: string) => id !== categoryId)
      : [...currentCategories, categoryId];

    onFiltersChange({
      ...filters,
      categoryIds: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  const handleDateFromChange = (date: string) => {
    onFiltersChange({
      ...filters,
      dateFrom: date ? new Date(date) : undefined,
    });
  };

  const handleDateToChange = (date: string) => {
    onFiltersChange({
      ...filters,
      dateTo: date ? new Date(date) : undefined,
    });
  };

  const handleAuthorChange = (author: string) => {
    onFiltersChange({
      ...filters,
      authorUsername: author || undefined,
    });
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-card rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filters</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary">{activeFilterCount}</Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Sort By Dropdown */}
        {onSortChange && (
          <div className="space-y-2">
            <Label>Sort By</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    {sortBy === "createdAt" ? "Post Date" : "Saved Date"} (
                    {sortOrder === "asc" ? "↑" : "↓"})
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Sort Field</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortBy}
                  onValueChange={(value) =>
                    onSortChange(value as "savedAt" | "createdAt", sortOrder)
                  }
                >
                  <DropdownMenuRadioItem value="savedAt">
                    Saved Date
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="createdAt">
                    Post Date
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={sortOrder}
                  onValueChange={(value) =>
                    onSortChange(sortBy, value as "asc" | "desc")
                  }
                >
                  <DropdownMenuRadioItem value="desc">
                    Newest First ↓
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="asc">
                    Oldest First ↑
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Platform Filter */}
        <div className="space-y-2">
          <Label>Platform</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {filters.platform || "All Platforms"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Select Platform</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={!filters.platform}
                onCheckedChange={() => handlePlatformChange(null)}
              >
                All Platforms
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.platform === "TWITTER"}
                onCheckedChange={() => handlePlatformChange("TWITTER")}
              >
                Twitter
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.platform === "LINKEDIN"}
                onCheckedChange={() => handlePlatformChange("LINKEDIN")}
              >
                LinkedIn
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Date Range Filter */}
        <div className="space-y-2">
          <Label>Date From</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={formatDate(filters.dateFrom)}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Date To</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={formatDate(filters.dateTo)}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Author Filter */}
        <div className="space-y-2">
          <Label>Author Username</Label>
          <Input
            type="text"
            placeholder="@username"
            value={filters.authorUsername || ""}
            onChange={(e) => handleAuthorChange(e.target.value)}
          />
        </div>
      </div>

      {/* Categories Filter */}
      {categories.length > 0 && (
        <div className="space-y-2">
          <Label>Categories</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {filters.categoryIds && filters.categoryIds.length > 0
                  ? `${filters.categoryIds.length} selected`
                  : "All Categories"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>Select Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {categories.map((category) => (
                  <DropdownMenuCheckboxItem
                    key={category.id}
                    checked={filters.categoryIds?.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  >
                    {category.name}
                    {category.isSystem && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        System
                      </Badge>
                    )}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {filters.categoryIds && filters.categoryIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.categoryIds.map((categoryId: string) => {
                const category = categories.find((c) => c.id === categoryId);
                return category ? (
                  <Badge
                    key={categoryId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleCategoryToggle(categoryId)}
                  >
                    {category.name}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
