import type { BookmarkPost } from "@my-better-t-app/shared";
import { BookmarkCardTwitter } from "./bookmark-card-twitter";
import { BookmarkCardLinkedIn } from "./bookmark-card-linkedin";
import { BookmarkCardUrl } from "./bookmark-card-url";

interface BookmarkCardProps {
  bookmark: BookmarkPost;
}

export function BookmarkCard({ bookmark }: BookmarkCardProps) {
  // Route to the appropriate platform-specific component
  switch (bookmark.platform) {
    case "TWITTER":
      return <BookmarkCardTwitter bookmark={bookmark} />;
    case "LINKEDIN":
      return <BookmarkCardLinkedIn bookmark={bookmark} />;
    case "GENERIC_URL":
      return <BookmarkCardUrl bookmark={bookmark} />;
    default:
      // Fallback to Twitter card for unknown platforms
      return <BookmarkCardTwitter bookmark={bookmark} />;
  }
}
