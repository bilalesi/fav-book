// Enums
// Define the dictionaries
export const DictPlatform = {
  TWITTER: "TWITTER",
  LINKEDIN: "LINKEDIN",
  GENERIC_URL: "GENERIC_URL",
} as const;

export const DictMediaType = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
  LINK: "LINK",
} as const;

export const DictProcessingStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  FAILED: "FAILED",
} as const;

export const DictDownloadStatus = {
  PENDING: "PENDING",
  DOWNLOADING: "DOWNLOADING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// Derive types from the dictionaries
export type Platform = (typeof DictPlatform)[keyof typeof DictPlatform];
export type MediaType = (typeof DictMediaType)[keyof typeof DictMediaType];
export type ProcessingStatus =
  (typeof DictProcessingStatus)[keyof typeof DictProcessingStatus];
export type DownloadStatus =
  (typeof DictDownloadStatus)[keyof typeof DictDownloadStatus];
// Core entities
export interface BookmarkPost {
  id: string;
  userId: string;
  platform: Platform;
  postId: string;
  postUrl: string;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileUrl: string;
  savedAt: Date;
  createdAt: Date;
  viewCount: number;
  metadata?: Record<string, any>;
  media?: Media[];
  collections?: Collection[];
  categories?: Category[];
  enrichment?: BookmarkEnrichment | null;
  downloadedMedia?: DownloadedMedia[];
}

export interface BookmarkEnrichment {
  id: string;
  bookmarkPostId: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
  processingStatus: ProcessingStatus;
  workflowId?: string;
  errorMessage?: string;
  enrichedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DownloadedMedia {
  id: string;
  bookmarkPostId: string;
  type: MediaType;
  originalUrl: string;
  storagePath: string;
  storageUrl?: string;
  fileSize: bigint;
  duration?: number;
  quality?: string;
  format?: string;
  width?: number;
  height?: number;
  downloadStatus: DownloadStatus;
  errorMessage?: string;
  downloadedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface Media {
  id: string;
  bookmarkPostId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  bookmarks?: BookmarkPost[];
}

export interface Category {
  id: string;
  name: string;
  userId?: string;
  isSystem: boolean;
  createdAt: Date;
}

// Filter and search types
export interface BookmarkFilters {
  platform?: Platform;
  dateFrom?: Date;
  dateTo?: Date;
  authorUsername?: string;
  categoryIds?: string[];
  collectionId?: string;
  // New fields for enhanced filtering
  platforms?: Platform[]; // Multiple platform filter
  authorUsernameContains?: string; // Partial match on author
  createdAtFrom?: Date; // Filter by post creation date
  createdAtTo?: Date;
  excludeCategoryIds?: string[]; // Exclude categories
  contentSearch?: string; // Full-text search in content
}

export interface SearchFilters extends BookmarkFilters {
  query: string;
  sortBy?: "relevance" | "date" | "views";
}

export interface Pagination {
  cursor?: string;
  limit?: number;
}

// API input types
export interface CreateBookmarkInput {
  platform: Platform;
  postId: string;
  postUrl: string;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileUrl: string;
  createdAt: Date;
  metadata?: Record<string, any>;
  media?: CreateMediaInput[];
}

export interface CreateMediaInput {
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface UpdateBookmarkInput {
  content?: string;
  metadata?: Record<string, any>;
  collectionIds?: string[];
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
}

// API output types
export interface BookmarkListResponse {
  bookmarks: BookmarkPost[];
  nextCursor?: string;
  total: number;
}

export interface SearchResponse {
  results: BookmarkPost[];
  nextCursor?: string;
  total: number;
}

export interface BulkImportResponse {
  successCount: number;
  failureCount: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// Dashboard types
export interface DashboardStats {
  totalBookmarks: number;
  bookmarksByPlatform: {
    twitter: number;
    linkedin: number;
    genericUrl: number;
  };
  recentBookmarks: BookmarkPost[];
  mostViewed: BookmarkPost[];
  topicBreakdown: Array<{
    categoryName: string;
    count: number;
  }>;
}

// Bulk import data format
export interface BookmarkImportData {
  postId: string;
  postUrl: string;
  content: string;
  author: {
    name: string;
    username: string;
    profileUrl: string;
  };
  media?: Array<{
    type: MediaType;
    url: string;
    thumbnailUrl?: string;
  }>;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface BulkImportInput {
  platform: Platform;
  bookmarks: BookmarkImportData[];
}
