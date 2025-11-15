// Background service worker for Social Bookmarks Manager extension
// Handles API communication, authentication, and message passing

import type {
  ExtensionMessage,
  ExtensionResponse,
  ExtractedPost,
} from "../types";
import {
  getAuthState,
  saveAuthState,
  clearAuthState,
  getApiUrl,
  addToOfflineQueue,
  getOfflineQueue,
  removeFromOfflineQueue,
  updateQueuedBookmarkRetryCount,
  clearOldQueuedBookmarks,
} from "../utils/storage";

console.log("Social Bookmarks Manager: Background service worker loaded");

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch((error) => {
        console.error("Error handling message:", error);
        sendResponse({
          success: false,
          error: error.message || "Unknown error occurred",
        });
      });

    // Return true to indicate we'll send response asynchronously
    return true;
  }
);

/**
 * Handle incoming messages from content scripts and popup
 */
async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender
): Promise<ExtensionResponse> {
  switch (message.type) {
    case "SAVE_BOOKMARK":
      return await saveBookmark(message.data);

    case "GET_AUTH_STATE":
      return await getAuthenticationState();

    case "LOGIN":
      return await handleLogin(message.data);

    case "LOGOUT":
      return await handleLogout();

    case "SAVE_URL_BOOKMARK":
      return await saveUrlBookmark(message.data);

    case "CHECK_URL_BOOKMARKED":
      return await checkUrlBookmarked(message.data);

    case "GET_COLLECTIONS":
      return await getCollections();

    default:
      return {
        success: false,
        error: "Unknown message type",
      };
  }
}

/**
 * Save a bookmark to the backend API
 */
async function saveBookmark(post: ExtractedPost): Promise<ExtensionResponse> {
  try {
    const authState = await getAuthState();

    if (!authState.isAuthenticated || !authState.token) {
      return {
        success: false,
        error: "Not authenticated. Please log in to the extension.",
      };
    }

    const apiUrl = await getApiUrl();

    // Call the backend API to create bookmark
    const response = await fetch(`${apiUrl}/api/bookmarks/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authState.token}`,
      },
      body: JSON.stringify({
        platform: post.platform,
        postId: post.postId,
        postUrl: post.postUrl,
        content: post.content,
        authorName: post.author.name,
        authorUsername: post.author.username,
        authorProfileUrl: post.author.profileUrl,
        createdAt: post.timestamp,
        media: post.media,
        metadata: post.metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        bookmarkId: data.id,
      },
    };
  } catch (error: any) {
    console.error("Error saving bookmark:", error);
    return {
      success: false,
      error: error.message || "Failed to save bookmark",
    };
  }
}

/**
 * Get current authentication state
 */
async function getAuthenticationState(): Promise<ExtensionResponse> {
  try {
    const authState = await getAuthState();
    return {
      success: true,
      data: authState,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get auth state",
    };
  }
}

/**
 * Handle login request
 */
async function handleLogin(credentials: {
  token: string;
  userId: string;
}): Promise<ExtensionResponse> {
  try {
    await saveAuthState(credentials.token, credentials.userId);
    return {
      success: true,
      data: { message: "Logged in successfully" },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to save login credentials",
    };
  }
}

/**
 * Handle logout request
 */
async function handleLogout(): Promise<ExtensionResponse> {
  try {
    await clearAuthState();
    return {
      success: true,
      data: { message: "Logged out successfully" },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to logout",
    };
  }
}

/**
 * Save a URL bookmark to the backend API
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */
async function saveUrlBookmark(data: {
  url: string;
  title?: string;
  description?: string;
  collectionIds?: string[];
  favicon?: string;
}): Promise<ExtensionResponse> {
  try {
    const authState = await getAuthState();

    if (!authState.isAuthenticated || !authState.token) {
      return {
        success: false,
        error: "Not authenticated. Please log in to the extension.",
      };
    }

    const apiUrl = await getApiUrl();

    // Prepare metadata with favicon if provided
    const metadata = data.favicon ? { favicon: data.favicon } : undefined;

    // Call the backend API to create URL bookmark
    const response = await fetch(`${apiUrl}/api/bookmarks.createUrlBookmark`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authState.token}`,
      },
      body: JSON.stringify({
        url: data.url,
        title: data.title,
        description: data.description,
        collectionIds: data.collectionIds,
        metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error saving URL bookmark:", error);

    // If network error, queue for offline retry (Requirement 1.5)
    if (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to fetch")
    ) {
      await addToOfflineQueue({
        url: data.url,
        title: data.title,
        description: data.description,
        favicon: data.favicon,
        collectionIds: data.collectionIds,
      });

      return {
        success: true,
        data: {
          queued: true,
          message: "Saved locally. Will sync when online.",
        },
      };
    }

    return {
      success: false,
      error: error.message || "Failed to save URL bookmark",
    };
  }
}

/**
 * Check if a URL is already bookmarked
 * Requirements: 5.1
 */
async function checkUrlBookmarked(data: {
  url: string;
}): Promise<ExtensionResponse> {
  try {
    const authState = await getAuthState();

    if (!authState.isAuthenticated || !authState.token) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const apiUrl = await getApiUrl();

    // Call the backend API to check if URL is bookmarked
    const response = await fetch(`${apiUrl}/api/bookmarks.checkUrlBookmarked`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authState.token}`,
      },
      body: JSON.stringify({
        url: data.url,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result, // Will be null if not bookmarked, or the bookmark object if it exists
    };
  } catch (error: any) {
    console.error("Error checking URL bookmark:", error);
    return {
      success: false,
      error: error.message || "Failed to check URL bookmark",
    };
  }
}

/**
 * Get user's collections
 * Requirements: 1.1, 1.2
 */
async function getCollections(): Promise<ExtensionResponse> {
  try {
    const authState = await getAuthState();

    if (!authState.isAuthenticated || !authState.token) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    const apiUrl = await getApiUrl();

    // Call the backend API to get collections
    const response = await fetch(`${apiUrl}/api/collections.list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authState.token}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("Error fetching collections:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch collections",
    };
  }
}

/**
 * Process offline queue with exponential backoff
 * Requirements: 1.5
 */
async function processOfflineQueue(): Promise<void> {
  const queue = await getOfflineQueue();

  if (queue.length === 0) {
    return;
  }

  console.log(`Processing ${queue.length} queued bookmarks`);

  for (const bookmark of queue) {
    // Skip if retry count exceeds 3
    if (bookmark.retryCount >= 3) {
      console.warn(`Skipping bookmark ${bookmark.id} - max retries exceeded`);
      continue;
    }

    try {
      const result = await saveUrlBookmark({
        url: bookmark.url,
        title: bookmark.title,
        description: bookmark.description,
        favicon: bookmark.favicon,
        collectionIds: bookmark.collectionIds,
      });

      if (result.success && !result.data?.queued) {
        // Successfully saved, remove from queue
        await removeFromOfflineQueue(bookmark.id);
        console.log(`Successfully synced bookmark ${bookmark.id}`);
      } else if (!result.success) {
        // Failed, increment retry count
        await updateQueuedBookmarkRetryCount(
          bookmark.id,
          bookmark.retryCount + 1
        );
      }
    } catch (error) {
      console.error(`Error processing queued bookmark ${bookmark.id}:`, error);
      // Increment retry count
      await updateQueuedBookmarkRetryCount(
        bookmark.id,
        bookmark.retryCount + 1
      );
    }

    // Add delay between retries (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, bookmark.retryCount), 10000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Schedule offline queue processing
 * Runs every 5 minutes and on network restoration
 */
function scheduleOfflineQueueProcessing() {
  // Process queue every 5 minutes
  setInterval(() => {
    processOfflineQueue().catch((error) => {
      console.error("Error processing offline queue:", error);
    });
  }, 5 * 60 * 1000);

  // Clear old queued bookmarks daily
  setInterval(() => {
    clearOldQueuedBookmarks().catch((error) => {
      console.error("Error clearing old queued bookmarks:", error);
    });
  }, 24 * 60 * 60 * 1000);

  // Process queue when extension starts
  processOfflineQueue().catch((error) => {
    console.error("Error processing offline queue on startup:", error);
  });
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension installed");
    // Open welcome page or setup page
    chrome.tabs.create({
      url: chrome.runtime.getURL("popup/popup.html"),
    });
  } else if (details.reason === "update") {
    console.log("Extension updated");
  }
});

// Start offline queue processing
scheduleOfflineQueueProcessing();
