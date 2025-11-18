// Content script for X (Twitter)
// Detects tweets and injects save button overlay

import type { ExtractedPost, ExtractedMedia } from "../types";
import {
  createSaveButton,
  updateButtonState,
  showNotification,
} from "../utils/dom";

console.log("Social Bookmarks Manager: Twitter content script loaded");

// Track processed tweets to avoid duplicate buttons
const processedTweets = new Set<string>();

/**
 * Initialize the content script
 */
function init() {
  // Observe DOM changes to detect new tweets
  const observer = new MutationObserver(() => {
    processTweets();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Process initial tweets
  processTweets();
}

/**
 * Find and process all tweet elements on the page
 */
function processTweets() {
  // X/Twitter uses article elements for tweets
  const tweets = document.querySelectorAll('article[data-testid="tweet"]');

  tweets.forEach((tweet) => {
    const tweetElement = tweet as HTMLElement;
    const tweetId = getTweetId(tweetElement);

    if (tweetId && !processedTweets.has(tweetId)) {
      processedTweets.add(tweetId);
      injectSaveButton(tweetElement, tweetId);
    }
  });
}

/**
 * Extract tweet ID from tweet element
 */
function getTweetId(tweet: HTMLElement): string | null {
  // Try to find the tweet link
  const tweetLink = tweet.querySelector(
    'a[href*="/status/"]'
  ) as HTMLAnchorElement;
  if (tweetLink) {
    const match = tweetLink.href.match(/\/status\/(\d+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Inject save button into tweet element
 */
function injectSaveButton(tweet: HTMLElement, tweetId: string) {
  // Find the bookmark button to place ours next to it
  const bookmarkButton = tweet.querySelector('[data-testid="bookmark"]');
  const actionBar = tweet.querySelector('[role="group"]');
  
  if (!actionBar) return;

  const buttonWrapper = createSaveButton();
  const button = buttonWrapper.querySelector("button");
  if (!button) return;
  
  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleSaveClick(tweet, tweetId, buttonWrapper);
  });

  // Try to place it after the bookmark button
  if (bookmarkButton) {
    // Find the direct child of actionBar that contains the bookmark button
    let targetElement: Element = bookmarkButton;
    while (targetElement.parentElement && targetElement.parentElement !== actionBar) {
      targetElement = targetElement.parentElement;
    }
    
    if (targetElement.parentElement === actionBar) {
      // Insert after the bookmark button container
      actionBar.insertBefore(buttonWrapper, targetElement.nextSibling);
      return;
    }
  }
  
  // Fallback: Insert as last element
  actionBar.appendChild(buttonWrapper);
}

/**
 * Handle save button click
 */
async function handleSaveClick(
  tweet: HTMLElement,
  tweetId: string,
  buttonWrapper: HTMLElement
) {
  updateButtonState(buttonWrapper, "saving");

  try {
    const extractedPost = extractTweetData(tweet, tweetId);

    if (!extractedPost) {
      throw new Error("Failed to extract tweet data");
    }

    // Send to background script
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_BOOKMARK",
      data: extractedPost,
    });

    if (response.success) {
      updateButtonState(buttonWrapper, "saved");
      showNotification("Tweet saved successfully!", "success");
    } else {
      throw new Error(response.error || "Failed to save tweet");
    }
  } catch (error: any) {
    console.error("Error saving tweet:", error);
    updateButtonState(buttonWrapper, "default");
    showNotification(error.message || "Failed to save tweet", "error");
  }
}

/**
 * Extract tweet data from tweet element
 */
function extractTweetData(
  tweet: HTMLElement,
  tweetId: string
): ExtractedPost | null {
  try {
    // Extract tweet URL
    const tweetLink = tweet.querySelector(
      'a[href*="/status/"]'
    ) as HTMLAnchorElement;
    const postUrl = tweetLink
      ? tweetLink.href
      : `https://x.com/i/status/${tweetId}`;

    // Extract author information
    const authorLink = tweet.querySelector(
      'a[role="link"][href^="/"]'
    ) as HTMLAnchorElement;
    const authorName =
      tweet.querySelector('[data-testid="User-Name"] span')?.textContent ||
      "Unknown";
    const authorUsername = authorLink?.href.split("/").pop() ?? "unknown";
    const authorProfileUrl = authorLink
      ? `https://x.com${authorLink.pathname}`
      : "";

    // Extract tweet text content
    const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]');
    const content = tweetTextElement?.textContent || "";

    // Extract media (images, videos)
    const media: ExtractedMedia[] = [];

    // Extract images
    const images = tweet.querySelectorAll('[data-testid="tweetPhoto"] img');
    images.forEach((img) => {
      const imgElement = img as HTMLImageElement;
      if (imgElement.src && !imgElement.src.includes("profile_images")) {
        media.push({
          type: "IMAGE",
          url: imgElement.src,
          thumbnailUrl: imgElement.src,
        });
      }
    });

    // Extract videos
    const videos = tweet.querySelectorAll("video");
    videos.forEach((video) => {
      if (video.poster) {
        media.push({
          type: "VIDEO",
          url: video.src || video.poster,
          thumbnailUrl: video.poster,
        });
      }
    });

    // Extract links
    const links = tweet.querySelectorAll(
      '[data-testid="tweetText"] a[href^="http"]'
    );
    links.forEach((link) => {
      const linkElement = link as HTMLAnchorElement;
      if (
        !linkElement.href.includes("x.com") &&
        !linkElement.href.includes("twitter.com")
      ) {
        media.push({
          type: "LINK",
          url: linkElement.href,
        });
      }
    });

    // Extract timestamp
    const timeElement = tweet.querySelector("time");
    const timestamp =
      timeElement?.getAttribute("datetime") || new Date().toISOString();

    return {
      platform: "TWITTER",
      postId: tweetId,
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
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Error extracting tweet data:", error);
    return null;
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
