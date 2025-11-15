# @my-better-t-app/media-downloader

Media downloader package that integrates with Cobalt API to detect and download video/audio content from social platforms and web pages.

## Features

- 🎥 **Media Detection**: Automatically detect video and audio content from URLs
- ⬇️ **Smart Downloads**: Download media with quality selection and size limits
- 🔄 **Automatic Retries**: Built-in retry logic for transient failures
- 🛡️ **Error Handling**: Comprehensive error classification and handling
- 🌐 **Multi-Platform**: Supports YouTube, Twitter, TikTok, Instagram, and more

## Installation

```bash
bun add @my-better-t-app/media-downloader
```

## Configuration

Set the following environment variables:

```bash
COBALT_API_URL=http://localhost:9000  # Cobalt API endpoint
COBALT_API_KEY=                       # Optional API key
COBALT_TIMEOUT=30000                  # Request timeout in ms
```

## Usage

### Detect Media

```typescript
import { detectMedia } from "@my-better-t-app/media-downloader";

const result = await detectMedia("https://youtube.com/watch?v=...");

if (result.hasMedia) {
  console.log("Media type:", result.mediaType); // "video" or "audio"
  console.log("Quality:", result.quality);
  console.log("Available qualities:", result.availableQualities);
}
```

### Download Media

```typescript
import { downloadMedia } from "@my-better-t-app/media-downloader";

const result = await downloadMedia("https://youtube.com/watch?v=...", {
  quality: "1080",
  maxSize: 500 * 1024 * 1024, // 500MB
});

if (result.success) {
  console.log("Downloaded to:", result.filePath);
  console.log("File size:", result.metadata.fileSize);
  console.log("Duration:", result.metadata.duration);
  console.log("Format:", result.metadata.format);
}
```

### Download Audio Only

```typescript
import { downloadAudio } from "@my-better-t-app/media-downloader";

const result = await downloadAudio("https://youtube.com/watch?v=...", {
  audioFormat: "mp3",
});
```

### Safe Download with Cleanup

```typescript
import { downloadMediaSafe } from "@my-better-t-app/media-downloader";

// Automatically cleans up temp file on error
const result = await downloadMediaSafe(url, options);
```

### Check Download Support

```typescript
import { isDownloadSupported } from "@my-better-t-app/media-downloader";

const supported = await isDownloadSupported(url);
if (supported) {
  // Proceed with download
}
```

### Get Available Qualities

```typescript
import { getAvailableQualities } from "@my-better-t-app/media-downloader";

const qualities = await getAvailableQualities(url);
console.log("Available:", qualities); // ["1080p", "720p", "480p"]
```

## Supported Platforms

- YouTube
- Twitter/X
- TikTok
- Instagram
- Facebook
- Reddit
- Vimeo
- Twitch
- SoundCloud
- And many more...

## Error Handling

The package provides detailed error information:

```typescript
import {
  downloadMedia,
  MediaDownloadError,
  MediaErrorCodes,
} from "@my-better-t-app/media-downloader";

try {
  const result = await downloadMedia(url);
} catch (error) {
  if (error instanceof MediaDownloadError) {
    console.log("Error code:", error.code);
    console.log("Retryable:", error.retryable);

    if (error.code === MediaErrorCodes.RATE_LIMIT) {
      // Handle rate limiting
    }
  }
}
```

### Error Codes

- `NETWORK_ERROR`: Network connectivity issues (retryable)
- `TIMEOUT`: Request timeout (retryable)
- `SERVICE_UNAVAILABLE`: Cobalt API unavailable (retryable)
- `RATE_LIMIT`: Rate limit exceeded (retryable)
- `INVALID_URL`: Invalid URL format (not retryable)
- `NO_MEDIA_FOUND`: No media at URL (not retryable)
- `FILE_TOO_LARGE`: File exceeds size limit (not retryable)
- `UNSUPPORTED_PLATFORM`: Platform not supported (not retryable)
- `DOWNLOAD_FAILED`: General download failure (not retryable)

## API Reference

### `detectMedia(url: string): Promise<MediaDetectionResult>`

Detect if URL contains downloadable media.

### `downloadMedia(url: string, options?: DownloadOptions): Promise<DownloadResult>`

Download media from URL.

**Options:**

- `quality`: Preferred quality (e.g., "1080", "720")
- `maxSize`: Maximum file size in bytes
- `audioFormat`: Audio format for extraction
- `videoQuality`: Video quality preference

### `downloadAudio(url: string, options?: DownloadOptions): Promise<DownloadResult>`

Download audio-only from URL.

### `cleanupTempFile(filePath: string): Promise<void>`

Clean up temporary downloaded file.

### `isDownloadSupported(url: string): Promise<boolean>`

Check if download is supported for URL.

### `getAvailableQualities(url: string): Promise<string[]>`

Get available quality options for URL.

## Types

```typescript
interface MediaDetectionResult {
  hasMedia: boolean;
  mediaType?: "video" | "audio";
  estimatedSize?: number;
  quality?: string;
  availableQualities?: string[];
}

interface DownloadResult {
  success: boolean;
  filePath?: string;
  metadata: MediaMetadata;
  error?: string;
}

interface MediaMetadata {
  type: "video" | "audio";
  format?: string;
  quality?: string;
  fileSize: number;
  duration?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}
```

## License

MIT
