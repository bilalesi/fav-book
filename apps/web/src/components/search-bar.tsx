import { Input } from "@/components/ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  placeholder = "Search bookmarks...",
  className = "",
  defaultValue = "",
  debounceMs = 300,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const navigate = useNavigate();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (onSearch && query.trim()) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        onSearch(query.trim());
      }, debounceMs);

      // Cleanup
      return () => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
      };
    }
  }, [query, onSearch, debounceMs]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        if (onSearch) {
          onSearch(query.trim());
        } else {
          // Navigate to bookmarks page (search functionality would be handled by the page)
          navigate({
            to: "/bookmarks",
          });
        }
      }
    },
    [query, onSearch, navigate]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    if (onSearch) {
      onSearch("");
    }
  }, [onSearch]);

  return (
    <form
      onSubmit={handleSearch}
      className={`relative ${className}`}
      role="search"
    >
      <label htmlFor="search-input" className="sr-only">
        Search bookmarks
      </label>
      <SearchIcon
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
        aria-hidden="true"
      />
      <Input
        id="search-input"
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-20 w-full h-9 text-sm border-border bg-background"
        aria-label="Search bookmarks"
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none p-1"
          aria-label="Clear search query"
        >
          <XIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
