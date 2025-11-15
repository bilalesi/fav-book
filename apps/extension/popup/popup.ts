// Popup UI script
// Displays recent saves, collections, and extension status

import type { Collection, BookmarkPost } from "../types";

interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  userId?: string;
}

interface CurrentTab {
  url: string;
  title: string;
  favicon?: string;
}

console.log("Social Bookmarks Manager: Popup loaded");

let authState: AuthState | null = null;
let currentTab: CurrentTab | null = null;
let collections: Collection[] = [];
let existingBookmark: BookmarkPost | null = null;

/**
 * Initialize the popup
 */
async function init() {
  try {
    // Get authentication state
    const authResponse = await chrome.runtime.sendMessage({
      type: "GET_AUTH_STATE",
    });

    if (authResponse.success) {
      authState = authResponse.data;

      // Get current tab info
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const tab = tabs[0];

      if (tab && tab.url && tab.title) {
        currentTab = {
          url: tab.url,
          title: tab.title,
          favicon: tab.favIconUrl,
        };
      }

      renderUI();
    } else {
      showError("Failed to load extension state");
    }
  } catch (error) {
    console.error("Error initializing popup:", error);
    showError("Failed to initialize extension");
  }
}

/**
 * Render the UI based on authentication state
 */
function renderUI() {
  const content = document.getElementById("content");
  if (!content) return;

  if (authState?.isAuthenticated) {
    renderAuthenticatedView(content);
  } else {
    renderUnauthenticatedView(content);
  }
}

/**
 * Render view for unauthenticated users
 */
function renderUnauthenticatedView(content: HTMLElement) {
  content.innerHTML = `
    <div class="auth-container">
      <div class="icon">🔒</div>
      <h2>Not Logged In</h2>
      <p>Please log in to your Social Bookmarks Manager account to start saving bookmarks.</p>
      <button id="loginBtn" class="btn btn-primary">Open Web App to Login</button>
      <div class="help-text">
        <p>After logging in, return here to use the extension.</p>
      </div>
    </div>
  `;

  const loginBtn = document.getElementById("loginBtn");
  loginBtn?.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3001/login" });
  });
}

/**
 * Render view for authenticated users
 * Requirements: 1.1, 1.2, 3.1
 */
function renderAuthenticatedView(content: HTMLElement) {
  // Check if current tab is a valid URL to bookmark
  const canBookmark =
    currentTab &&
    currentTab.url &&
    (currentTab.url.startsWith("http://") ||
      currentTab.url.startsWith("https://"));

  content.innerHTML = `
    <div class="authenticated-container">
      <div class="status">
        <span class="status-indicator"></span>
        <span>Extension Active</span>
      </div>

      ${
        canBookmark && currentTab
          ? `
      <div class="section quick-save-section">
        <h3>Quick Save</h3>
        <div class="current-page">
          ${
            currentTab.favicon
              ? `<img src="${currentTab.favicon}" alt="favicon" class="page-favicon" />`
              : '<div class="page-favicon-placeholder">🔖</div>'
          }
          <div class="page-info">
            <div class="page-title">${escapeHtml(currentTab.title || "")}</div>
            <div class="page-url">${escapeHtml(
              truncateUrl(currentTab.url)
            )}</div>
          </div>
        </div>
        
        <div id="bookmarkStatus" class="bookmark-status"></div>
        
        <div id="quickSaveForm" class="quick-save-form">
          <label for="collectionSelect" class="form-label">Add to Collections (optional)</label>
          <select id="collectionSelect" class="form-select" multiple size="3">
            <option value="">Loading collections...</option>
          </select>
          
          <button id="quickSaveBtn" class="btn btn-primary">
            <span class="btn-text">Save This Page</span>
            <span class="btn-loader" style="display: none;">Saving...</span>
          </button>
        </div>
      </div>
      `
          : ""
      }

      <div class="section">
        <h3>Quick Actions</h3>
        <button id="openDashboard" class="btn btn-secondary">Open Dashboard</button>
        <button id="openBookmarks" class="btn btn-secondary">View Bookmarks</button>
      </div>

      <div class="section">
        <button id="logoutBtn" class="btn btn-text">Logout</button>
      </div>
    </div>
  `;

  // Add event listeners
  document.getElementById("openDashboard")?.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3001/dashboard" });
  });

  document.getElementById("openBookmarks")?.addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3001/bookmarks" });
  });

  document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);

  document
    .getElementById("quickSaveBtn")
    ?.addEventListener("click", handleQuickSave);

  // Load collections and check if URL is bookmarked
  if (canBookmark) {
    loadCollections();
    checkIfBookmarked();
  }
}

/**
 * Load collections from API
 * Requirements: 3.1
 */
async function loadCollections() {
  const select = document.getElementById(
    "collectionSelect"
  ) as HTMLSelectElement;
  if (!select) return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_COLLECTIONS",
    });

    if (response.success && response.data) {
      collections = response.data;

      if (collections.length === 0) {
        select.innerHTML = '<option value="">No collections yet</option>';
        select.disabled = true;
      } else {
        select.innerHTML = collections
          .map(
            (collection) =>
              `<option value="${collection.id}">${escapeHtml(
                collection.name
              )}</option>`
          )
          .join("");
        select.disabled = false;
      }
    } else {
      select.innerHTML = '<option value="">Failed to load collections</option>';
      select.disabled = true;
    }
  } catch (error) {
    console.error("Error loading collections:", error);
    select.innerHTML = '<option value="">Failed to load collections</option>';
    select.disabled = true;
  }
}

/**
 * Check if current URL is already bookmarked
 * Requirements: 1.3, 5.1, 5.2
 */
async function checkIfBookmarked() {
  if (!currentTab?.url) return;

  const statusDiv = document.getElementById("bookmarkStatus");
  if (!statusDiv) return;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "CHECK_URL_BOOKMARKED",
      data: { url: currentTab.url },
    });

    if (response.success && response.data) {
      // URL is already bookmarked
      existingBookmark = response.data;
      showBookmarkedStatus(statusDiv);
    } else {
      // URL is not bookmarked
      existingBookmark = null;
      statusDiv.innerHTML = "";
    }
  } catch (error) {
    console.error("Error checking bookmark status:", error);
  }
}

/**
 * Show bookmarked status indicator
 * Requirements: 5.2, 5.3, 5.4
 */
function showBookmarkedStatus(container: HTMLElement) {
  container.innerHTML = `
    <div class="already-bookmarked">
      <div class="bookmark-indicator">
        <span class="bookmark-icon">✓</span>
        <span>Already bookmarked</span>
      </div>
      <div class="bookmark-actions">
        <button id="viewBookmarkBtn" class="btn-link">View</button>
        <button id="editBookmarkBtn" class="btn-link">Edit</button>
        <button id="removeBookmarkBtn" class="btn-link btn-link-danger">Remove</button>
      </div>
    </div>
  `;

  // Hide the quick save form
  const form = document.getElementById("quickSaveForm");
  if (form) {
    form.style.display = "none";
  }

  // Add event listeners
  document.getElementById("viewBookmarkBtn")?.addEventListener("click", () => {
    if (existingBookmark) {
      chrome.tabs.create({
        url: `http://localhost:3001/bookmarks/${existingBookmark.id}`,
      });
    }
  });

  document.getElementById("editBookmarkBtn")?.addEventListener("click", () => {
    if (existingBookmark) {
      chrome.tabs.create({
        url: `http://localhost:3001/bookmarks/${existingBookmark.id}`,
      });
    }
  });

  document
    .getElementById("removeBookmarkBtn")
    ?.addEventListener("click", handleRemoveBookmark);
}

/**
 * Validate URL before saving
 * Requirements: 2.1
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  // Check for empty URL
  if (!url || url.trim().length === 0) {
    return { valid: false, error: "URL is empty" };
  }

  // Check for dangerous protocols
  const lowerUrl = url.toLowerCase();
  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "about:",
  ];

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return {
        valid: false,
        error: "This type of URL cannot be bookmarked for security reasons",
      };
    }
  }

  // Check for valid http/https protocol
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return {
        valid: false,
        error: "Only web pages (http/https) can be bookmarked",
      };
    }

    // Check for valid hostname
    if (!urlObj.hostname || urlObj.hostname.length === 0) {
      return { valid: false, error: "URL must have a valid domain name" };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Handle quick save button click
 * Requirements: 1.1, 1.2
 */
async function handleQuickSave() {
  if (!currentTab?.url) {
    showNotification("No URL to save", "error");
    return;
  }

  // Validate URL before submission (Requirement 2.1)
  const validation = validateUrl(currentTab.url);
  if (!validation.valid) {
    showNotification(validation.error || "Invalid URL format", "error");
    return;
  }

  const btn = document.getElementById("quickSaveBtn");
  const btnText = btn?.querySelector(".btn-text") as HTMLElement;
  const btnLoader = btn?.querySelector(".btn-loader") as HTMLElement;
  const select = document.getElementById(
    "collectionSelect"
  ) as HTMLSelectElement;

  if (!btn || !btnText || !btnLoader) return;

  // Get selected collections
  const selectedCollections = Array.from(select.selectedOptions)
    .map((option) => option.value)
    .filter((value) => value.length > 0); // Filter out empty values

  // Show loading state
  btn.setAttribute("disabled", "true");
  btnText.style.display = "none";
  btnLoader.style.display = "inline";

  try {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_URL_BOOKMARK",
      data: {
        url: currentTab.url,
        title: currentTab.title,
        favicon: currentTab.favicon,
        collectionIds:
          selectedCollections.length > 0 ? selectedCollections : undefined,
      },
    });

    if (response.success) {
      // Show success notification
      if (response.data?.queued) {
        showNotification("Saved locally. Will sync when online.", "info");
      } else {
        showNotification("Page saved successfully!", "success");
      }

      // Update UI to show bookmarked status
      existingBookmark = response.data;
      const statusDiv = document.getElementById("bookmarkStatus");
      if (statusDiv) {
        showBookmarkedStatus(statusDiv);
      }
    } else {
      // Display user-friendly error messages
      const errorMessage = response.error || "Failed to save bookmark";

      if (errorMessage.includes("already")) {
        showNotification("This page is already in your bookmarks", "error");
      } else if (errorMessage.includes("Invalid URL")) {
        showNotification(
          "Invalid URL format. Please check the page URL.",
          "error"
        );
      } else if (errorMessage.includes("collections")) {
        showNotification(
          "Selected collection not found. Please try again.",
          "error"
        );
      } else {
        showNotification(errorMessage, "error");
      }
    }
  } catch (error) {
    console.error("Error saving bookmark:", error);
    showNotification("Failed to save bookmark. Please try again.", "error");
  } finally {
    // Reset button state
    btn.removeAttribute("disabled");
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
}

/**
 * Handle remove bookmark
 */
async function handleRemoveBookmark() {
  if (!existingBookmark) return;

  if (!confirm("Are you sure you want to remove this bookmark?")) {
    return;
  }

  // For now, just open the web app to the bookmark page
  // In a full implementation, this would call a delete API
  chrome.tabs.create({
    url: `http://localhost:3001/bookmarks/${existingBookmark.id}`,
  });
}

/**
 * Show notification
 * Requirements: 1.2
 */
function showNotification(message: string, type: "success" | "error" | "info") {
  const statusDiv = document.getElementById("bookmarkStatus");
  if (!statusDiv) return;

  const className =
    type === "success"
      ? "notification-success"
      : type === "error"
      ? "notification-error"
      : "notification-info";

  statusDiv.innerHTML = `
    <div class="${className}">
      ${escapeHtml(message)}
    </div>
  `;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    if (statusDiv.innerHTML.includes(message)) {
      statusDiv.innerHTML = "";
    }
  }, 3000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate URL for display
 */
function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + "...";
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "LOGOUT" });

    if (response.success) {
      authState = null;
      renderUI();
    } else {
      showError("Failed to logout");
    }
  } catch (error) {
    console.error("Error logging out:", error);
    showError("Failed to logout");
  }
}

/**
 * Show error message
 */
function showError(message: string) {
  const content = document.getElementById("content");
  if (!content) return;

  content.innerHTML = `
    <div class="error-container">
      <div class="icon">⚠️</div>
      <h2>Error</h2>
      <p>${message}</p>
      <button id="retryBtn" class="btn btn-primary">Retry</button>
    </div>
  `;

  document.getElementById("retryBtn")?.addEventListener("click", init);
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
