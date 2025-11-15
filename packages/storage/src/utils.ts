import {
  GetObjectCommand,
  DeleteObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageKeyOptions } from "./types";
import { StorageError } from "./types";
import { createHash } from "crypto";

/**
 * Generate a unique storage key for a file
 * @param options - Storage key options
 * @returns Unique storage key in format: media/{bookmarkId}/{timestamp}-{hash}.{extension}
 */
export function generateStorageKey(options: StorageKeyOptions): string {
  const { bookmarkId, extension, prefix = "media" } = options;

  // Generate timestamp for uniqueness
  const timestamp = Date.now();

  // Generate a short hash for additional uniqueness
  const hash = createHash("sha256")
    .update(`${bookmarkId}-${timestamp}-${Math.random()}`)
    .digest("hex")
    .substring(0, 8);

  // Clean extension (remove leading dot if present)
  const cleanExtension = extension.startsWith(".")
    ? extension.substring(1)
    : extension;

  return `${prefix}/${bookmarkId}/${timestamp}-${hash}.${cleanExtension}`;
}

/**
 * Get a presigned URL for accessing a file in S3
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param key - Storage key of the file
 * @param expiresIn - URL expiration time in seconds (default: 7 days)
 * @returns Presigned URL
 * @throws StorageError if URL generation fails
 */
export async function getFileUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresIn: number = 7 * 24 * 60 * 60 // 7 days in seconds
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn });
    return url;
  } catch (error) {
    throw new StorageError(
      `Failed to generate presigned URL for key: ${key}`,
      "URL_GENERATION_FAILED",
      error
    );
  }
}

/**
 * Delete a file from S3 storage
 * @param client - S3Client instance
 * @param bucket - S3 bucket name
 * @param key - Storage key of the file to delete
 * @returns True if deletion was successful
 * @throws StorageError if deletion fails
 */
export async function deleteFile(
  client: S3Client,
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    throw new StorageError(
      `Failed to delete file with key: ${key}`,
      "DELETE_FAILED",
      error
    );
  }
}

/**
 * Extract file extension from a filename or path
 * @param filename - Filename or path
 * @returns File extension without the dot (e.g., 'mp4', 'jpg')
 */
export function extractFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length > 1) {
    const extension = parts[parts.length - 1];
    return extension ? extension.toLowerCase() : "bin";
  }
  return "bin"; // Default extension for files without extension
}

/**
 * Validate that a storage key is safe and well-formed
 * @param key - Storage key to validate
 * @returns True if key is valid
 * @throws StorageError if key is invalid
 */
export function validateStorageKey(key: string): boolean {
  // Check for empty key
  if (!key || key.trim().length === 0) {
    throw new StorageError("Storage key cannot be empty", "INVALID_KEY");
  }

  // Check for path traversal attempts
  if (key.includes("..") || key.includes("//")) {
    throw new StorageError(
      "Storage key contains invalid path segments",
      "INVALID_KEY"
    );
  }

  // Check for absolute paths
  if (key.startsWith("/")) {
    throw new StorageError(
      "Storage key cannot be an absolute path",
      "INVALID_KEY"
    );
  }

  return true;
}

/**
 * Format file size in human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
