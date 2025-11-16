import type { BookmarkPost } from "@favy/shared";
import { BookmarkCard } from "./bookmark-card";
import { cn } from "@/lib/utils";
import React from "react";

interface SelectableBookmarkCardProps {
  bookmark: BookmarkPost;
  isSelected: boolean;
  onSelectionToggle: (bookmarkId: string) => void;
}

export const SelectableBookmarkCard = React.memo(
  ({
    bookmark,
    isSelected,
    onSelectionToggle,
  }: SelectableBookmarkCardProps) => {
    const handleCardClick = (e: React.MouseEvent) => {
      // Check if click originated from interactive element
      const target = e.target as HTMLElement;
      const isInteractive = target.closest("[data-interactive]");

      if (!isInteractive) {
        onSelectionToggle(bookmark.id);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectionToggle(bookmark.id);
      }
    };

    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        aria-label={`Select bookmark from ${bookmark.authorName}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative cursor-pointer transition-all duration-150",
          "hover:bg-muted/50 rounded-lg",
          isSelected && "ring-2 ring-primary bg-primary/5 hover:bg-primary/10"
        )}
      >
        {/* Bookmark Card */}
        <BookmarkCard bookmark={bookmark} />
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.bookmark.id === nextProps.bookmark.id &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

SelectableBookmarkCard.displayName = "SelectableBookmarkCard";
