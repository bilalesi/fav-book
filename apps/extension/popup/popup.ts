// Popup UI script
// Displays recent saves, collections, and extension status

interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  userId?: string;
}

interface RecentBookmark {
  id: string;
  content: string;
  platform: string;
  savedAt: string;
}

console.log("Social Bookmarks Manager: Popup loaded");

let authState: AuthState | null = null;

/**
 * Initialize the popup
 */
async function init() {
  try {
    // Get authentication state
    const response = await chrome.runtime.sendMessage({
      type: "GET_AUTH_STATE",
    });

    if (response.success) {
      authState = response.data;
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
 */
function renderAuthenticatedView(content: HTMLElement) {
  content.innerHTML = `
    <div class="authenticated-container">
      <div class="status">
        <span class="status-indicator"></span>
        <span>Extension Active</span>
      </div>

      <div class="section">
        <h3>Quick Actions</h3>
        <button id="openDashboard" class="btn btn-secondary">Open Dashboard</button>
        <button id="openBookmarks" class="btn btn-secondary">View Bookmarks</button>
      </div>

      <div class="section">
        <h3>Recent Saves</h3>
        <div id="recentBookmarks" class="loading">Loading...</div>
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

  // Load recent bookmarks
  loadRecentBookmarks();
}

/**
 * Load recent bookmarks from API
 */
async function loadRecentBookmarks() {
  const container = document.getElementById("recentBookmarks");
  if (!container) return;

  try {
    // For now, show a placeholder message
    // In a full implementation, this would fetch from the API
    container.innerHTML = `
      <div class="empty-state">
        <p>Visit X or LinkedIn to start saving bookmarks!</p>
      </div>
    `;
  } catch (error) {
    console.error("Error loading recent bookmarks:", error);
    container.innerHTML = `
      <div class="error-state">
        <p>Failed to load recent bookmarks</p>
      </div>
    `;
  }
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
