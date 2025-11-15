/**
 * Storage service interface for S3-compatible object storage
 */
export interface StorageService {
  /**
   * Upload a file to storage
   * @param file - File buffer to upload
   * @param key - Storage key (path) for the file
   * @param metadata - Optional metadata to attach to the file
   * @returns Upload result with key, URL, size, and etag
   */
  uploadFile(
    file: Buffer,
    key: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult>;

  /**
   * Get a presigned URL for accessing a file
   * @param key - Storage key of the file
   * @param expiresIn - URL expiration time in seconds (default: 7 days)
   * @returns Presigned URL
   */
  getFileUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a file from storage
   * @param key - Storage key of the file to delete
   * @returns True if deletion was successful
   */
  deleteFile(key: string): Promise<boolean>;
}

/**
 * Result of a file upload operation
 */
export interface UploadResult {
  /** Storage key (path) of the uploaded file */
  key: string;
  /** Presigned URL for accessing the file */
  url: string;
  /** File size in bytes */
  size: number;
  /** ETag of the uploaded file */
  etag: string;
}

/**
 * Configuration for S3-compatible storage
 */
export interface StorageConfig {
  /** S3 endpoint URL (e.g., http://localhost:9001 for MinIO) */
  endpoint: string;
  /** AWS access key ID */
  accessKeyId: string;
  /** AWS secret access key */
  secretAccessKey: string;
  /** S3 bucket name */
  bucket: string;
  /** AWS region (default: us-east-1) */
  region?: string;
  /** Enable path-style access (required for MinIO) */
  forcePathStyle?: boolean;
}

/**
 * Options for generating storage keys
 */
export interface StorageKeyOptions {
  /** Bookmark ID */
  bookmarkId: string;
  /** File extension (e.g., 'mp4', 'mp3') */
  extension: string;
  /** Optional prefix for the key */
  prefix?: string;
}

/**
 * Error thrown by storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "StorageError";
  }
}
