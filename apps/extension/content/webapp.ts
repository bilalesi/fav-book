// Content script for the Web App
// Bridges authentication state from the web app to the extension

console.log("Social Bookmarks Manager: Web App content script loaded");

// Listen for messages from the web app
window.addEventListener("message", async (event) => {
  // We only accept messages from ourselves
  if (event.source !== window) return;

  if (event.data.type && event.data.type === "FAV_BOOK_LOGIN_SUCCESS") {
    console.log("Social Bookmarks Manager: Received login success message", event.data);
    
    try {
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        type: "LOGIN",
        data: event.data.data,
      });

      console.log("Social Bookmarks Manager: Extension login response", response);
    } catch (error) {
      console.error("Social Bookmarks Manager: Error sending login to extension", error);
    }
  }
});
