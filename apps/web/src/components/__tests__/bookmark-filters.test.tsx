import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookmarkFilters } from "../bookmark-filters";
import { renderWithQuery } from "@/test/utils";

// Mock the categories hook
vi.mock("@/hooks/use-categories", () => ({
  useCategoriesList: () => ({
    data: [
      { id: "cat-1", name: "Technology", isSystem: true },
      { id: "cat-2", name: "Design", isSystem: false },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe("BookmarkFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  const defaultFilters = {
    platform: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    authorUsername: undefined,
    categoryIds: undefined,
  };

  it("renders filter controls", () => {
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();

    renderWithQuery(
      <BookmarkFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Platform")).toBeInTheDocument();
    expect(screen.getByLabelText("Date From")).toBeInTheDocument();
    expect(screen.getByLabelText("Date To")).toBeInTheDocument();
    expect(screen.getByLabelText("Author Username")).toBeInTheDocument();
  });

  it("shows active filter count", () => {
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();
    const filters = {
      ...defaultFilters,
      platform: "TWITTER" as const,
      authorUsername: "testuser",
    };

    renderWithQuery(
      <BookmarkFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows clear all button when filters are active", () => {
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();
    const filters = {
      ...defaultFilters,
      platform: "TWITTER" as const,
    };

    renderWithQuery(
      <BookmarkFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    expect(screen.getByText("Clear all")).toBeInTheDocument();
  });

  it("does not show clear all button when no filters are active", () => {
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();

    renderWithQuery(
      <BookmarkFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    expect(screen.queryByText("Clear all")).not.toBeInTheDocument();
  });

  it("calls onClearFilters when clear all is clicked", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();
    const filters = {
      ...defaultFilters,
      platform: "TWITTER" as const,
    };

    renderWithQuery(
      <BookmarkFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    const clearButton = screen.getByText("Clear all");
    await user.click(clearButton);

    expect(onClearFilters).toHaveBeenCalled();
  });

  it("updates author filter when input changes", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();

    renderWithQuery(
      <BookmarkFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    const authorInput = screen.getByPlaceholderText("@username");
    await user.type(authorInput, "testuser");

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...defaultFilters,
      authorUsername: "testuser",
    });
  });

  it("updates date from filter when date is selected", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();

    renderWithQuery(
      <BookmarkFilters
        filters={defaultFilters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    const dateInputs = screen.getAllByLabelText(/Date/);
    const dateFromInput = dateInputs[0];

    await user.type(dateFromInput, "2024-01-01");

    expect(onFiltersChange).toHaveBeenCalled();
  });

  it("displays selected platform in dropdown", () => {
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();
    const filters = {
      ...defaultFilters,
      platform: "TWITTER" as const,
    };

    renderWithQuery(
      <BookmarkFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    expect(screen.getByText("TWITTER")).toBeInTheDocument();
  });

  it("displays author username in input", () => {
    const onFiltersChange = vi.fn();
    const onClearFilters = vi.fn();
    const filters = {
      ...defaultFilters,
      authorUsername: "johndoe",
    };

    renderWithQuery(
      <BookmarkFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClearFilters={onClearFilters}
      />
    );

    const authorInput = screen.getByPlaceholderText("@username");
    expect(authorInput).toHaveValue("johndoe");
  });
});
