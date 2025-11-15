import { S3Client } from "@aws-sdk/client-s3";
import type { StorageConfig } from "./types";
import { StorageError } from "./types";

/**
 * Create and configure an S3 client for MinIO compatibility
 * @param config - Storage configuration
 * @returns Configured S3Client instance
 */
export function createS3Client(config: StorageConfig): S3Client {
  try {
    const client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || "us-east-1",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Enable path-style access for MinIO compatibility
      // This uses http://endpoint/bucket/key instead of http://bucket.endpoint/key
      forcePathStyle: config.forcePathStyle ?? true,
    });

    return client;
  } catch (error) {
    throw new StorageError(
      "Failed to create S3 client",
      "CLIENT_CREATION_FAILED",
      error
    );
  }
}

/**
 * Load storage configuration from environment variables
 * @returns Storage configuration
 * @throws StorageError if required environment variables are missing
 */
export function loadStorageConfig(): StorageConfig {
  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;

  // Validate required environment variables
  if (!endpoint) {
    throw new StorageError(
      "S3_ENDPOINT environment variable is required",
      "MISSING_CONFIG"
    );
  }

  if (!accessKeyId) {
    throw new StorageError(
      "S3_ACCESS_KEY environment variable is required",
      "MISSING_CONFIG"
    );
  }

  if (!secretAccessKey) {
    throw new StorageError(
      "S3_SECRET_KEY environment variable is required",
      "MISSING_CONFIG"
    );
  }

  if (!bucket) {
    throw new StorageError(
      "S3_BUCKET environment variable is required",
      "MISSING_CONFIG"
    );
  }

  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucket,
    region: region || "us-east-1",
    forcePathStyle: true,
  };
}

/**
 * Validate S3 client connectivity by attempting to list buckets
 * @param client - S3Client instance to validate
 * @returns True if connection is successful
 * @throws StorageError if connection fails
 */
export async function validateS3Connection(client: S3Client): Promise<boolean> {
  try {
    const { ListBucketsCommand } = await import("@aws-sdk/client-s3");
    await client.send(new ListBucketsCommand({}));
    return true;
  } catch (error) {
    throw new StorageError(
      "Failed to connect to S3 storage",
      "CONNECTION_FAILED",
      error
    );
  }
}

/**
 * Create a configured S3 client from environment variables
 * @returns Configured S3Client instance
 */
export function createS3ClientFromEnv(): S3Client {
  const config = loadStorageConfig();
  return createS3Client(config);
}
