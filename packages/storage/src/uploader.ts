import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { readFile, unlink } from "fs/promises";
import type { UploadResult, StorageKeyOptions } from "./types";
import { StorageError } from "./types";
import {
  generateStorageKey,
  getFileUrl,
  validateStorageKey,
  extractFileExtension,
} from "./utils";

/**
 * Upload a file to S3 storage
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param file - File buffer to upload
 * @param key - Storage key (path) for the file
 * @param metadata - Optional metadata to attach to the file
 * @returns Upload result with key, URL, size, and etag
 * @throws StorageError if upload fails
 */
export async function uploadFile(
  client: S3Client,
  bucket: string,
  file: Buffer,
  key: string,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  try {
    // Validate storage key
    validateStorageKey(key);

    // Create upload command
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      Metadata: metadata,
      ContentLength: file.length,
    });

    // Upload file
    const response = await client.send(command);

    // Generate presigned URL (valid for 7 days)
    const url = await getFileUrl(client, bucket, key);

    return {
      key,
      url,
      size: file.length,
      etag: response.ETag || "",
    };
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Failed to upload file with key: ${key}`,
      "UPLOAD_FAILED",
      error
    );
  }
}

/**
 * Upload a file from a local path to S3 storage
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param filePath - Local file path to upload
 * @param key - Storage key (path) for the file
 * @param metadata - Optional metadata to attach to the file
 * @param cleanupAfterUpload - Whether to delete the local file after upload (default: true)
 * @returns Upload result with key, URL, size, and etag
 * @throws StorageError if upload fails
 */
export async function uploadFileFromPath(
  client: S3Client,
  bucket: string,
  filePath: string,
  key: string,
  metadata?: Record<string, string>,
  cleanupAfterUpload: boolean = true
): Promise<UploadResult> {
  try {
    // Read file from disk
    const fileBuffer = await readFile(filePath);

    // Upload file
    const result = await uploadFile(client, bucket, fileBuffer, key, metadata);

    // Clean up temporary file if requested
    if (cleanupAfterUpload) {
      try {
        await unlink(filePath);
      } catch (cleanupError) {
        // Log cleanup error but don't fail the upload
        console.warn(
          `Failed to clean up temporary file: ${filePath}`,
          cleanupError
        );
      }
    }

    return result;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Failed to upload file from path: ${filePath}`,
      "UPLOAD_FROM_PATH_FAILED",
      error
    );
  }
}

/**
 * Upload a file with automatic key generation
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param file - File buffer to upload
 * @param keyOptions - Options for generating the storage key
 * @param metadata - Optional metadata to attach to the file
 * @returns Upload result with key, URL, size, and etag
 * @throws StorageError if upload fails
 */
export async function uploadFileWithGeneratedKey(
  client: S3Client,
  bucket: string,
  file: Buffer,
  keyOptions: StorageKeyOptions,
  metadata?: Record<string, string>
): Promise<UploadResult> {
  const key = generateStorageKey(keyOptions);
  return uploadFile(client, bucket, file, key, metadata);
}

/**
 * Upload a file from a local path with automatic key generation
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param filePath - Local file path to upload
 * @param bookmarkId - Bookmark ID for key generation
 * @param metadata - Optional metadata to attach to the file
 * @param cleanupAfterUpload - Whether to delete the local file after upload (default: true)
 * @returns Upload result with key, URL, size, and etag
 * @throws StorageError if upload fails
 */
export async function uploadFileFromPathWithGeneratedKey(
  client: S3Client,
  bucket: string,
  filePath: string,
  bookmarkId: string,
  metadata?: Record<string, string>,
  cleanupAfterUpload: boolean = true
): Promise<UploadResult> {
  // Extract file extension from path
  const extension = extractFileExtension(filePath);

  // Generate storage key
  const key = generateStorageKey({
    bookmarkId,
    extension,
  });

  return uploadFileFromPath(
    client,
    bucket,
    filePath,
    key,
    metadata,
    cleanupAfterUpload
  );
}

/**
 * Upload multiple files in parallel
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param files - Array of files to upload with their keys
 * @param metadata - Optional metadata to attach to all files
 * @returns Array of upload results
 * @throws StorageError if any upload fails
 */
export async function uploadMultipleFiles(
  client: S3Client,
  bucket: string,
  files: Array<{ file: Buffer; key: string }>,
  metadata?: Record<string, string>
): Promise<UploadResult[]> {
  try {
    const uploadPromises = files.map(({ file, key }) =>
      uploadFile(client, bucket, file, key, metadata)
    );

    return await Promise.all(uploadPromises);
  } catch (error) {
    throw new StorageError(
      "Failed to upload multiple files",
      "BATCH_UPLOAD_FAILED",
      error
    );
  }
}
