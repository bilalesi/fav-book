// Storage utility functions for extension storage API

import type { AuthState } from "../types";

const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_ID: "user_id",
  API_URL: "api_url",
  OFFLINE_QUEUE: "offline_queue",
} as const;

export interface QueuedBookmark {
  id: string;
  url: string;
  title?: string;
  description?: string;
  favicon?: string;
  collectionIds?: string[];
  timestamp: number;
  retryCount: number;
}

/**
 * Get authentication state from storage
 */
export async function getAuthState(): Promise<AuthState> {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.USER_ID,
  ]);

  return {
    isAuthenticated: !!result[STORAGE_KEYS.AUTH_TOKEN],
    token: result[STORAGE_KEYS.AUTH_TOKEN],
    userId: result[STORAGE_KEYS.USER_ID],
  };
}

/**
 * Save authentication state to storage
 */
export async function saveAuthState(
  token: string,
  userId: string
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_TOKEN]: token,
    [STORAGE_KEYS.USER_ID]: userId,
  });
}

/**
 * Clear authentication state from storage
 */
export async function clearAuthState(): Promise<void> {
  await chrome.storage.local.remove([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.USER_ID,
  ]);
}

/**
 * Get API URL from storage or use default
 */
export async function getApiUrl(): Promise<string> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_URL);
  return result[STORAGE_KEYS.API_URL] || "http://localhost:3000";
}

/**
 * Save API URL to storage
 */
export async function saveApiUrl(url: string): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.API_URL]: url,
  });
}

/**
 * Get offline queue from storage
 */
export async function getOfflineQueue(): Promise<QueuedBookmark[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.OFFLINE_QUEUE);
  return result[STORAGE_KEYS.OFFLINE_QUEUE] || [];
}

/**
 * Add bookmark to offline queue
 */
export async function addToOfflineQueue(
  bookmark: Omit<QueuedBookmark, "id" | "timestamp" | "retryCount">
): Promise<void> {
  const queue = await getOfflineQueue();

  // Limit queue to 50 bookmarks
  if (queue.length >= 50) {
    // Remove oldest item
    queue.shift();
  }

  const queuedBookmark: QueuedBookmark = {
    ...bookmark,
    id: `queued_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(queuedBookmark);

  await chrome.storage.local.set({
    [STORAGE_KEYS.OFFLINE_QUEUE]: queue,
  });
}

/**
 * Remove bookmark from offline queue
 */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((item) => item.id !== id);

  await chrome.storage.local.set({
    [STORAGE_KEYS.OFFLINE_QUEUE]: filtered,
  });
}

/**
 * Update retry count for queued bookmark
 */
export async function updateQueuedBookmarkRetryCount(
  id: string,
  retryCount: number
): Promise<void> {
  const queue = await getOfflineQueue();
  const bookmark = queue.find((item) => item.id === id);

  if (bookmark) {
    bookmark.retryCount = retryCount;

    await chrome.storage.local.set({
      [STORAGE_KEYS.OFFLINE_QUEUE]: queue,
    });
  }
}

/**
 * Clear old queued bookmarks (older than 7 days)
 */
export async function clearOldQueuedBookmarks(): Promise<void> {
  const queue = await getOfflineQueue();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filtered = queue.filter((item) => item.timestamp > sevenDaysAgo);

  await chrome.storage.local.set({
    [STORAGE_KEYS.OFFLINE_QUEUE]: filtered,
  });
}
