import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "../search-bar";
import { renderWithQuery } from "@/test/utils";

describe("SearchBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with placeholder text", () => {
    renderWithQuery(<SearchBar placeholder="Search posts..." />);

    expect(screen.getByPlaceholderText("Search posts...")).toBeInTheDocument();
  });

  it("updates input value when typing", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SearchBar />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    await user.type(input, "test query");

    expect(input).toHaveValue("test query");
  });

  it("shows clear button when input has value", async () => {
    const user = userEvent.setup();
    renderWithQuery(<SearchBar />);

    const input = screen.getByPlaceholderText("Search bookmarks...");

    // Clear button should not be visible initially
    expect(screen.queryByLabelText("Clear search")).not.toBeInTheDocument();

    await user.type(input, "test");

    // Clear button should appear
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();
  });

  it("clears input when clear button is clicked", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderWithQuery(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    await user.type(input, "test query");

    const clearButton = screen.getByLabelText("Clear search");
    await user.click(clearButton);

    expect(input).toHaveValue("");
    expect(onSearch).toHaveBeenCalledWith("");
  });

  it("calls onSearch with debounced value", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderWithQuery(<SearchBar onSearch={onSearch} debounceMs={100} />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    await user.type(input, "test");

    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Should call after debounce delay
    await waitFor(
      () => {
        expect(onSearch).toHaveBeenCalledWith("test");
      },
      { timeout: 200 }
    );
  });

  it("submits search on form submit", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderWithQuery(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    await user.type(input, "test query");
    await user.keyboard("{Enter}");

    expect(onSearch).toHaveBeenCalledWith("test query");
  });

  it("trims whitespace from search query", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderWithQuery(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    await user.type(input, "  test query  ");
    await user.keyboard("{Enter}");

    expect(onSearch).toHaveBeenCalledWith("test query");
  });

  it("does not submit empty search", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderWithQuery(<SearchBar onSearch={onSearch} />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    await user.type(input, "   ");
    await user.keyboard("{Enter}");

    expect(onSearch).not.toHaveBeenCalled();
  });

  it("uses default value when provided", () => {
    renderWithQuery(<SearchBar defaultValue="initial query" />);

    const input = screen.getByPlaceholderText("Search bookmarks...");
    expect(input).toHaveValue("initial query");
  });
});
