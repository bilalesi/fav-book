/**
 * S3 Storage Integration Package
 *
 * Provides S3-compatible storage functionality for MinIO and AWS S3.
 * Includes file upload, download, deletion, and presigned URL generation.
 */

// Export types
export type {
  StorageService,
  UploadResult,
  StorageConfig,
  StorageKeyOptions,
} from "./types";
export { StorageError } from "./types";

// Export client functions
export {
  createS3Client,
  loadStorageConfig,
  validateS3Connection,
  createS3ClientFromEnv,
} from "./client";

// Export uploader functions
export {
  uploadFile,
  uploadFileFromPath,
  uploadFileWithGeneratedKey,
  uploadFileFromPathWithGeneratedKey,
  uploadMultipleFiles,
} from "./uploader";

// Export utility functions
export {
  generateStorageKey,
  getFileUrl,
  deleteFile,
  extractFileExtension,
  validateStorageKey,
  formatFileSize,
} from "./utils";

// Re-export S3Client type for convenience
export type { S3Client } from "@aws-sdk/client-s3";
