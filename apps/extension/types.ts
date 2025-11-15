// Shared types for the browser extension

export interface ExtractedPost {
  platform: "TWITTER" | "LINKEDIN";
  postId: string;
  postUrl: string;
  content: string;
  author: {
    name: string;
    username: string;
    profileUrl: string;
  };
  media: ExtractedMedia[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ExtractedMedia {
  type: "IMAGE" | "VIDEO" | "LINK";
  url: string;
  thumbnailUrl?: string;
}

export interface SaveBookmarkMessage {
  type: "SAVE_BOOKMARK";
  data: ExtractedPost;
}

export interface SaveBookmarkResponse {
  success: boolean;
  bookmarkId?: string;
  error?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  token?: string;
  userId?: string;
}

export interface ExtensionMessage {
  type:
    | "SAVE_BOOKMARK"
    | "GET_AUTH_STATE"
    | "LOGIN"
    | "LOGOUT"
    | "SAVE_URL_BOOKMARK"
    | "CHECK_URL_BOOKMARKED"
    | "GET_COLLECTIONS";
  data?: any;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface UrlBookmarkData {
  url: string;
  title?: string;
  description?: string;
  collectionIds?: string[];
  favicon?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkPost {
  id: string;
  userId: string;
  platform: "TWITTER" | "LINKEDIN" | "GENERIC_URL";
  postId: string;
  postUrl: string;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileUrl: string;
  savedAt: string;
  createdAt: string;
  viewCount: number;
  metadata?: Record<string, any>;
  collections?: Collection[];
}
