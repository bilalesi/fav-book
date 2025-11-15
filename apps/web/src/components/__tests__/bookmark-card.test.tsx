import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { BookmarkCard } from "../bookmark-card";
import { renderWithQuery, createMockBookmark } from "@/test/utils";

describe("BookmarkCard", () => {
  it("renders bookmark content correctly", () => {
    const bookmark = createMockBookmark({
      content: "This is a test bookmark",
      authorName: "John Doe",
      authorUsername: "johndoe",
    });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    expect(screen.getByText("This is a test bookmark")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("@johndoe")).toBeInTheDocument();
  });

  it("displays platform badge correctly", () => {
    const twitterBookmark = createMockBookmark({ platform: "TWITTER" });
    const { rerender } = renderWithQuery(
      <BookmarkCard bookmark={twitterBookmark} />
    );

    expect(screen.getByText("Twitter")).toBeInTheDocument();

    const linkedinBookmark = createMockBookmark({ platform: "LINKEDIN" });
    rerender(<BookmarkCard bookmark={linkedinBookmark} />);

    expect(screen.getByText("LinkedIn")).toBeInTheDocument();
  });

  it("displays view count", () => {
    const bookmark = createMockBookmark({ viewCount: 42 });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("truncates long content", () => {
    const longContent = "a".repeat(250);
    const bookmark = createMockBookmark({ content: longContent });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    const displayedText = screen.getByText(/a+\.\.\./);
    expect(displayedText.textContent?.length).toBeLessThan(longContent.length);
  });

  it("displays categories when present", () => {
    const bookmark = createMockBookmark({
      categories: [
        { id: "1", name: "Technology" },
        { id: "2", name: "Design" },
      ],
    });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    expect(screen.getByText("Technology")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
  });

  it("shows +N badge when more than 3 categories", () => {
    const bookmark = createMockBookmark({
      categories: [
        { id: "1", name: "Tech" },
        { id: "2", name: "Design" },
        { id: "3", name: "Business" },
        { id: "4", name: "Marketing" },
        { id: "5", name: "Sales" },
      ],
    });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("renders external link to original post", () => {
    const bookmark = createMockBookmark({
      postUrl: "https://twitter.com/user/status/123",
    });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    const link = screen.getByRole("link", { name: "" });
    expect(link).toHaveAttribute("href", "https://twitter.com/user/status/123");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("displays media preview when media is present", () => {
    const bookmark = createMockBookmark({
      media: [
        {
          id: "1",
          type: "IMAGE",
          url: "https://example.com/image.jpg",
          thumbnailUrl: null,
        },
      ],
    });

    renderWithQuery(<BookmarkCard bookmark={bookmark} />);

    const image = screen.getByAltText("Bookmark media");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
  });
});
