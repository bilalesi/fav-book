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
  type: "SAVE_BOOKMARK" | "GET_AUTH_STATE" | "LOGIN" | "LOGOUT";
  data?: any;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}
