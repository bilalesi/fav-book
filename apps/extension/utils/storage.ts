// Storage utility functions for extension storage API

import type { AuthState } from "../types";

const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER_ID: "user_id",
  API_URL: "api_url",
} as const;

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
