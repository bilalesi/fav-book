// Content script for LinkedIn
// Detects posts and injects save button overlay

import type { ExtractedPost, ExtractedMedia } from "../types";
import {
  createSaveButton,
  updateButtonState,
  showNotification,
} from "../utils/dom";

console.log("Social Bookmarks Manager: LinkedIn content script loaded");

// Track processed posts to avoid duplicate buttons
const processedPosts = new Set<string>();

/**
 * Initialize the content script
 */
function init() {
  // Observe DOM changes to detect new posts
  const observer = new MutationObserver(() => {
    processPosts();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Process initial posts
  processPosts();
}

/**
 * Find and process all post elements on the page
 */
function processPosts() {
  // LinkedIn uses div elements with specific classes for posts
  const posts = document.querySelectorAll(".feed-shared-update-v2, [data-urn]");

  posts.forEach((post) => {
    const postElement = post as HTMLElement;
    const postId = getPostId(postElement);

    if (postId && !processedPosts.has(postId)) {
      processedPosts.add(postId);
      injectSaveButton(postElement, postId);
    }
  });
}

/**
 * Extract post ID from post element
 */
function getPostId(post: HTMLElement): string | null {
  // Try to get URN from data attribute
  const urn = post.getAttribute("data-urn");
  if (urn) {
    // Extract ID from URN format: urn:li:activity:1234567890
    const match = urn.match(/activity:(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
    return urn;
  }

  // Try to find post link
  const postLink = post.querySelector(
    'a[href*="/feed/update/"]'
  ) as HTMLAnchorElement;
  if (postLink) {
    const match = postLink.href.match(/update\/([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Inject save button into post element
 */
function injectSaveButton(post: HTMLElement, postId: string) {
  // Find the social actions bar (like, comment, share)
  const actionBar = post.querySelector(
    ".social-actions-bar, .feed-shared-social-action-bar"
  );
  if (!actionBar) return;

  const button = createSaveButton();
  button.style.marginLeft = "8px";

  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleSaveClick(post, postId, button);
  });

  actionBar.appendChild(button);
}

/**
 * Handle save button click
 */
async function handleSaveClick(
  post: HTMLElement,
  postId: string,
  button: HTMLButtonElement
) {
  updateButtonState(button, "saving");

  try {
    const extractedPost = extractPostData(post, postId);

    if (!extractedPost) {
      throw new Error("Failed to extract post data");
    }

    // Send to background script
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      data: extractedPost,
    });

    if (response.success) {
      updateButtonState(button, "saved");
      showNotification("LinkedIn post saved successfully!", "success");
    } else {
      throw new Error(response.error || "Failed to save post");
    }
  } catch (error: any) {
    console.error("Error saving post:", error);
    updateButtonState(button, "default");
    showNotification(error.message || "Failed to save post", "error");
  }
}

/**
 * Extract post data from post element
 */
function extractPostData(
  post: HTMLElement,
  postId: string
): ExtractedPost | null {
  try {
    // Extract post URL
    const postLink = post.querySelector(
      'a[href*="/feed/update/"]'
    ) as HTMLAnchorElement;
    const postUrl = postLink
      ? postLink.href
      : `https://www.linkedin.com/feed/update/${postId}`;

    // Extract author information
    const authorLink = post.querySelector(
      ".feed-shared-actor__container a"
    ) as HTMLAnchorElement;
    const authorName =
      post.querySelector(".feed-shared-actor__name")?.textContent?.trim() ||
      "Unknown";
    const authorTitle =
      post
        .querySelector(".feed-shared-actor__description")
        ?.textContent?.trim() || "";
    const authorProfileUrl = authorLink?.href || "";
    const authorUsername =
      authorProfileUrl.split("/in/")[1]?.split("/")[0] ?? "unknown";

    // Extract post content
    const contentElement = post.querySelector(
      ".feed-shared-update-v2__description, .feed-shared-text"
    );
    const content = contentElement?.textContent?.trim() || "";

    // Extract media (images, videos, documents)
    const media: ExtractedMedia[] = [];

    // Extract images
    const images = post.querySelectorAll(
      ".feed-shared-image__container img, .feed-shared-image img"
    );
    images.forEach((img) => {
      const imgElement = img as HTMLImageElement;
      if (imgElement.src && !imgElement.src.includes("static-exp")) {
        media.push({
          type: "IMAGE",
          url: imgElement.src,
          thumbnailUrl: imgElement.src,
        });
      }
    });

    // Extract videos
    const videos = post.querySelectorAll("video");
    videos.forEach((video) => {
      if (video.poster || video.src) {
        media.push({
          type: "VIDEO",
          url: video.src || video.poster || "",
          thumbnailUrl: video.poster,
        });
      }
    });

    // Extract article/document links
    const articleCard = post.querySelector(
      ".feed-shared-article, .feed-shared-external-video"
    );
    if (articleCard) {
      const articleLink = articleCard.querySelector("a") as HTMLAnchorElement;
      const articleImage = articleCard.querySelector("img") as HTMLImageElement;
      if (articleLink) {
        media.push({
          type: "LINK",
          url: articleLink.href,
          thumbnailUrl: articleImage?.src,
        });
      }
    }

    // Extract timestamp
    const timeElement = post.querySelector(
      ".feed-shared-actor__sub-description time, time"
    );
    const timestamp =
      timeElement?.getAttribute("datetime") || new Date().toISOString();

    return {
      platform: "LINKEDIN",
      postId,
      postUrl,
      content,
      author: {
        name: authorName,
        username: authorUsername,
        profileUrl: authorProfileUrl,
      },
      media,
      timestamp,
      metadata: {
        authorTitle,
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error extracting post data:", error);
    return null;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
