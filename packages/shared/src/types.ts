
export const DictAiProvider = {
  OLLAMA: "ollama",
  LMSTUDIO: "lmstudio",
} as const;
export type TAiProvider = (typeof DictAiProvider)[keyof typeof DictAiProvider];

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
export type TPlatform = (typeof DictPlatform)[keyof typeof DictPlatform];
export type TMediaType = (typeof DictMediaType)[keyof typeof DictMediaType];
export type TProcessingStatus =
  (typeof DictProcessingStatus)[keyof typeof DictProcessingStatus];
export type TDownloadStatus =
  (typeof DictDownloadStatus)[keyof typeof DictDownloadStatus];
// Core entities
export interface IBookmarkPost {
  id: string;
  userId: string;
  platform: TPlatform;
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
  media?: IMedia[];
  collections?: ICollection[];
  categories?: ICategory[];
  enrichment?: IBookmarkEnrichment | null;
  downloadedMedia?: IDownloadedMedia[];
}

export interface IBookmarkEnrichment {
  id: string;
  bookmarkPostId: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
  processingStatus: TProcessingStatus;
  workflowId?: string;
  errorMessage?: string;
  enrichedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDownloadedMedia {
  id: string;
  bookmarkPostId: string;
  type: TMediaType;
  originalUrl: string;
  storagePath: string;
  storageUrl?: string;
  fileSize: bigint;
  duration?: number;
  quality?: string;
  format?: string;
  width?: number;
  height?: number;
  downloadStatus: TDownloadStatus;
  errorMessage?: string;
  downloadedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface IMedia {
  id: string;
  bookmarkPostId: string;
  type: TMediaType;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface ICollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  bookmarks?: IBookmarkPost[];
}

export interface ICategory {
  id: string;
  name: string;
  userId?: string;
  isSystem: boolean;
  createdAt: Date;
}

// Filter and search types
export interface IBookmarkFilters {
  platform?: TPlatform;
  dateFrom?: Date;
  dateTo?: Date;
  authorUsername?: string;
  categoryIds?: string[];
  collectionId?: string;
  // New fields for enhanced filtering
  platforms?: TPlatform[]; // Multiple platform filter
  authorUsernameContains?: string; // Partial match on author
  createdAtFrom?: Date; // Filter by post creation date
  createdAtTo?: Date;
  excludeCategoryIds?: string[]; // Exclude categories
  contentSearch?: string; // Full-text search in content
}

export interface ISearchFilters extends IBookmarkFilters {
  query: string;
  sortBy?: "relevance" | "date" | "views";
}

export interface IPagination {
  cursor?: string;
  limit?: number;
}


export interface ICreateBookmarkInput {
  platform: TPlatform;
  postId: string;
  postUrl: string;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileUrl: string;
  createdAt: Date;
  metadata?: Record<string, any>;
  media?: ICreateMediaInput[];
}

export interface ICreateMediaInput {
  type: TMediaType;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface IUpdateBookmarkInput {
  content?: string;
  metadata?: Record<string, any>;
  collectionIds?: string[];
}

export interface ICreateCollectionInput {
  name: string;
  description?: string;
}

export interface IUpdateCollectionInput {
  name?: string;
  description?: string;
}


export interface IBookmarkListResponse {
  bookmarks: IBookmarkPost[];
  nextCursor?: string;
  total: number;
}

export interface ISearchResponse {
  results: IBookmarkPost[];
  nextCursor?: string;
  total: number;
}

export interface IBulkImportResponse {
  successCount: number;
  failureCount: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}

// Dashboard types
export interface IDashboardStats {
  totalBookmarks: number;
  bookmarksByPlatform: {
    twitter: number;
    linkedin: number;
    genericUrl: number;
  };
  recentBookmarks: IBookmarkPost[];
  mostViewed: IBookmarkPost[];
  topicBreakdown: Array<{
    categoryName: string;
    count: number;
  }>;
}


export interface IBookmarkImportData {
  postId: string;
  postUrl: string;
  content: string;
  author: {
    name: string;
    username: string;
    profileUrl: string;
  };
  media?: Array<{
    type: TMediaType;
    url: string;
    thumbnailUrl?: string;
  }>;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface IBulkImportInput {
  platform: TPlatform;
  bookmarks: IBookmarkImportData[];
}


