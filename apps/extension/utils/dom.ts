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
 * Create a save button element
 */
export function createSaveButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "sbm-save-button";
  button.textContent = "Save";
  button.setAttribute("aria-label", "Save to Social Bookmarks Manager");

  return button;
}

/**
 * Update button state
 */
export function updateButtonState(
  button: HTMLButtonElement,
  state: "default" | "saving" | "saved"
) {
  button.classList.remove("saving", "saved");

  switch (state) {
    case "saving":
      button.classList.add("saving");
      button.textContent = "Saving...";
      button.disabled = true;
      break;
    case "saved":
      button.classList.add("saved");
      button.textContent = "Saved ✓";
      button.disabled = true;
      setTimeout(() => {
        button.textContent = "Save";
        button.disabled = false;
        button.classList.remove("saved");
      }, 2000);
      break;
    default:
      button.textContent = "Save";
      button.disabled = false;
  }
}
