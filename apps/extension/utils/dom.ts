// DOM utility functions for content scripts

/**
 * Show a notification to the user
 */
export function showNotification(
  message: string,
  type: "success" | "error" = "success"
) {
  const notification = document.createElement("div");
  notification.className = `sbm-notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

/**
 * Create a save button element matching Twitter's button style
 */
export function createSaveButton(): HTMLElement {
  // Create wrapper div to match Twitter's structure
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "display: flex; align-items: center; margin: 0;";
  
  const button = document.createElement("button");
  button.className = "sbm-save-button";
  button.setAttribute("aria-label", "Save to Social Bookmarks Manager");
  button.setAttribute("type", "button");
  
  // Create icon (bookmark icon)
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "18");
  icon.setAttribute("height", "18");
  icon.setAttribute("fill", "currentColor");
  icon.style.cssText = "display: inline-block; vertical-align: text-bottom;";
  
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4 3h16a1 1 0 0 1 1 1v18l-9-6-9 6V4a1 1 0 0 1 1-1z");
  icon.appendChild(path);
  
  button.appendChild(icon);
  wrapper.appendChild(button);
  
  return wrapper;
}

/**
 * Update button state
 */
export function updateButtonState(
  buttonWrapper: HTMLElement,
  state: "default" | "saving" | "saved"
) {
  const button = buttonWrapper.querySelector("button");
  if (!button) return;
  
  button.classList.remove("saving", "saved");

  switch (state) {
    case "saving":
      button.classList.add("saving");
      button.disabled = true;
      break;
    case "saved":
      button.classList.add("saved");
      button.disabled = true;
      setTimeout(() => {
        button.classList.remove("saved");
        button.disabled = false;
      }, 2000);
      break;
    default:
      button.disabled = false;
  }
}
