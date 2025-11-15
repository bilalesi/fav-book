import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditBookmarkDialog } from "../edit-bookmark-dialog";
import { renderWithQuery, createMockBookmark } from "@/test/utils";

// Mock the hooks
const mockMutateAsync = vi.fn().mockResolvedValue({});
vi.mock("@/hooks/use-bookmarks", () => ({
  useUpdateBookmark: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe("EditBookmarkDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockClear();
  });

  const mockBookmark = createMockBookmark({
    content: "Original content",
  });

  it("renders dialog when open", () => {
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("Edit Bookmark")).toBeInTheDocument();
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
  });

  it("does not render dialog when closed", () => {
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByText("Edit Bookmark")).not.toBeInTheDocument();
  });

  it("displays current bookmark content", () => {
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText("Content");
    expect(textarea).toHaveValue("Original content");
  });

  it("updates content when typing", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText("Content");
    await user.clear(textarea);
    await user.type(textarea, "Updated content");

    expect(textarea).toHaveValue("Updated content");
  });

  it("disables save button when content is unchanged", () => {
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const saveButton = screen.getByText("Save Changes");
    expect(saveButton).toBeDisabled();
  });

  it("enables save button when content is changed", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText("Content");
    await user.type(textarea, " - modified");

    const saveButton = screen.getByText("Save Changes");
    expect(saveButton).not.toBeDisabled();
  });

  it("resets content when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    const textarea = screen.getByLabelText("Content");
    await user.clear(textarea);
    await user.type(textarea, "Modified content");

    const cancelButton = screen.getByText("Cancel");
    await user.click(cancelButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows loading state when saving", () => {
    vi.mock("@/hooks/use-bookmarks", () => ({
      useUpdateBookmark: () => ({
        mutateAsync: vi.fn(),
        isPending: true,
      }),
    }));

    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("Saving...")).toBeInTheDocument();
  });

  it("has proper form structure with labels", () => {
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const textarea = screen.getByLabelText("Content");
    expect(textarea).toHaveAttribute("id", "content");
    expect(textarea).toHaveAttribute(
      "placeholder",
      "Enter bookmark content..."
    );
  });

  it("displays description text", () => {
    renderWithQuery(
      <EditBookmarkDialog
        bookmark={mockBookmark}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(
      screen.getByText(/Update the content of your bookmark/)
    ).toBeInTheDocument();
  });
});
