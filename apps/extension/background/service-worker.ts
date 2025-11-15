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
