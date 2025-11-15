# @my-better-t-app/storage

S3-compatible storage integration package for managing file uploads, downloads, and deletions. Supports both AWS S3 and MinIO.

## Features

- ✅ S3-compatible storage (AWS S3, MinIO)
- ✅ File upload with streaming support
- ✅ Automatic storage key generation
- ✅ Presigned URL generation
- ✅ File deletion and cleanup
- ✅ Metadata attachment
- ✅ Path-style access for MinIO
- ✅ Comprehensive error handling

## Installation

This package is part of the monorepo and uses workspace dependencies.

```bash
bun install
```

## Configuration

Set the following environment variables:

```bash
# Required
S3_ENDPOINT=http://localhost:9001        # MinIO or S3 endpoint
S3_ACCESS_KEY=minioadmin                 # Access key
S3_SECRET_KEY=minioadmin                 # Secret key
S3_BUCKET=bookmark-media                 # Bucket name

# Optional
S3_REGION=us-east-1                      # AWS region (default: us-east-1)
```

## Usage

### Basic Upload

```typescript
import {
  createS3ClientFromEnv,
  uploadFile,
  loadStorageConfig,
} from "@my-better-t-app/storage";

// Create client from environment variables
const client = createS3ClientFromEnv();
const config = loadStorageConfig();

// Upload a file
const fileBuffer = Buffer.from("Hello, World!");
const result = await uploadFile(
  client,
  config.bucket,
  fileBuffer,
  "path/to/file.txt",
  { contentType: "text/plain" }
);

console.log("Uploaded:", result.key);
console.log("URL:", result.url);
console.log("Size:", result.size);
```

### Upload from File Path

```typescript
import {
  createS3ClientFromEnv,
  uploadFileFromPath,
  loadStorageConfig,
} from "@my-better-t-app/storage";

const client = createS3ClientFromEnv();
const config = loadStorageConfig();

// Upload from local file (automatically cleans up after upload)
const result = await uploadFileFromPath(
  client,
  config.bucket,
  "/tmp/video.mp4",
  "media/bookmark-123/video.mp4",
  { contentType: "video/mp4" },
  true // cleanup after upload
);
```

### Upload with Auto-Generated Key

```typescript
import {
  createS3ClientFromEnv,
  uploadFileFromPathWithGeneratedKey,
  loadStorageConfig,
} from "@my-better-t-app/storage";

const client = createS3ClientFromEnv();
const config = loadStorageConfig();

// Upload with automatic key generation
const result = await uploadFileFromPathWithGeneratedKey(
  client,
  config.bucket,
  "/tmp/video.mp4",
  "bookmark-123", // bookmark ID
  { contentType: "video/mp4" }
);

// Generated key format: media/bookmark-123/{timestamp}-{hash}.mp4
console.log("Generated key:", result.key);
```

### Get Presigned URL

```typescript
import {
  createS3ClientFromEnv,
  getFileUrl,
  loadStorageConfig,
} from "@my-better-t-app/storage";

const client = createS3ClientFromEnv();
const config = loadStorageConfig();

// Get presigned URL (valid for 7 days by default)
const url = await getFileUrl(
  client,
  config.bucket,
  "media/bookmark-123/video.mp4"
);

// Custom expiration (1 hour)
const shortUrl = await getFileUrl(
  client,
  config.bucket,
  "media/bookmark-123/video.mp4",
  3600 // 1 hour in seconds
);
```

### Delete File

```typescript
import {
  createS3ClientFromEnv,
  deleteFile,
  loadStorageConfig,
} from "@my-better-t-app/storage";

const client = createS3ClientFromEnv();
const config = loadStorageConfig();

// Delete a file
const success = await deleteFile(
  client,
  config.bucket,
  "media/bookmark-123/video.mp4"
);

console.log("Deleted:", success);
```

### Generate Storage Key

```typescript
import { generateStorageKey } from "@my-better-t-app/storage";

// Generate unique storage key
const key = generateStorageKey({
  bookmarkId: "bookmark-123",
  extension: "mp4",
  prefix: "media", // optional, defaults to "media"
});

// Result: media/bookmark-123/{timestamp}-{hash}.mp4
console.log("Generated key:", key);
```

### Validate Connection

```typescript
import {
  createS3ClientFromEnv,
  validateS3Connection,
} from "@my-better-t-app/storage";

const client = createS3ClientFromEnv();

try {
  await validateS3Connection(client);
  console.log("✅ Connected to S3 storage");
} catch (error) {
  console.error("❌ Failed to connect:", error);
}
```

## Error Handling

All functions throw `StorageError` with specific error codes:

```typescript
import { StorageError } from "@my-better-t-app/storage";

try {
  await uploadFile(client, bucket, file, key);
} catch (error) {
  if (error instanceof StorageError) {
    console.error("Storage error:", error.code);
    console.error("Message:", error.message);
    console.error("Original error:", error.originalError);
  }
}
```

### Error Codes

- `CLIENT_CREATION_FAILED` - Failed to create S3 client
- `MISSING_CONFIG` - Required environment variable missing
- `CONNECTION_FAILED` - Failed to connect to S3 storage
- `UPLOAD_FAILED` - File upload failed
- `UPLOAD_FROM_PATH_FAILED` - File upload from path failed
- `URL_GENERATION_FAILED` - Presigned URL generation failed
- `DELETE_FAILED` - File deletion failed
- `INVALID_KEY` - Invalid storage key

## Utilities

### Format File Size

```typescript
import { formatFileSize } from "@my-better-t-app/storage";

console.log(formatFileSize(1024)); // "1.00 KB"
console.log(formatFileSize(1048576)); // "1.00 MB"
console.log(formatFileSize(1073741824)); // "1.00 GB"
```

### Extract File Extension

```typescript
import { extractFileExtension } from "@my-better-t-app/storage";

console.log(extractFileExtension("video.mp4")); // "mp4"
console.log(extractFileExtension("/path/to/file.jpg")); // "jpg"
console.log(extractFileExtension("noextension")); // "bin"
```

## MinIO Setup

For local development with MinIO:

```bash
# Start MinIO with Docker
docker run -p 9001:9000 -p 9002:9002 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9002"

# Create bucket
docker run --rm -it --network host minio/mc \
  alias set myminio http://localhost:9001 minioadmin minioadmin && \
  mc mb myminio/bookmark-media
```

## TypeScript

This package is written in TypeScript and includes full type definitions.

```typescript
import type {
  StorageService,
  UploadResult,
  StorageConfig,
  StorageKeyOptions,
} from "@my-better-t-app/storage";
```

## License

MIT
