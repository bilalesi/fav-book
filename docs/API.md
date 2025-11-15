# Social Bookmarks Manager - API Documentation

## Overview

The Social Bookmarks Manager API is built using [oRPC](https://orpc.unnoq.com/) (OpenAPI RPC), providing type-safe endpoints for managing bookmarks, collections, and categories. This document covers all API endpoints with a focus on the URL bookmarking feature.

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3000/api
```

## Authentication

All API endpoints require authentication. The API uses session-based authentication with the following methods:

- **OAuth** - X (Twitter) or LinkedIn
- **Magic Link** - Email-based authentication

### Authentication Headers

```http
Cookie: better-auth.session_token=<session_token>
```

Sessions are managed by [Better Auth](https://www.better-auth.com/) and are automatically handled by the client SDK.

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common Error Codes

| Code                  | HTTP Status | Description                             |
| --------------------- | ----------- | --------------------------------------- |
| `UNAUTHORIZED`        | 401         | User is not authenticated               |
| `FORBIDDEN`           | 403         | User lacks permission for this resource |
| `NOT_FOUND`           | 404         | Resource does not exist                 |
| `VALIDATION_ERROR`    | 400         | Input validation failed                 |
| `DUPLICATE_ERROR`     | 409         | Resource already exists                 |
| `RATE_LIMIT_EXCEEDED` | 429         | Too many requests                       |
| `INTERNAL_ERROR`      | 500         | Server error                            |

## URL Bookmarks API

### Create URL Bookmark

Create a new bookmark for any web URL with automatic metadata extraction.

**Endpoint:** `bookmarks.createUrlBookmark`

**Requirements:** 1.1, 1.3, 3.1, 3.2, 4.1, 4.4

#### Request

```typescript
{
  url: string;              // Required: The URL to bookmark
  title?: string;           // Optional: Custom title (auto-extracted if not provided)
  description?: string;     // Optional: Custom description (auto-extracted if not provided)
  collectionIds?: string[]; // Optional: Collection IDs to add bookmark to
  metadata?: Record<string, any>; // Optional: Additional metadata
}
```

#### Response

```typescript
{
  id: string;
  userId: string;
  platform: "GENERIC_URL";
  postId: string;           // Generated unique ID
  postUrl: string;          // Normalized URL
  content: string;          // Description
  authorName: string;       // Domain name
  authorUsername: string;   // Domain name
  authorProfileUrl: string; // Base domain URL
  savedAt: Date;
  createdAt: Date;
  viewCount: number;
  metadata: {
    title?: string;
    favicon?: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    domain: string;
    extractedAt: string;
    extractionFailed?: boolean;
  };
  media: [];
  collections: Collection[];
  categories: Category[];
  warning?: string;         // Present if metadata extraction failed
}
```

#### Example

```typescript
// Using the oRPC client
const bookmark = await client.bookmarks.createUrlBookmark({
  url: "https://example.com/article",
  collectionIds: ["collection-id-1", "collection-id-2"],
});

console.log(bookmark.id); // "clx1234567890"
console.log(bookmark.metadata.title); // "Example Article Title"
```

#### Error Scenarios

**Invalid URL Format**

```json
{
  "error": {
    "message": "Unable to save bookmark: Invalid URL format. Please check the URL and try again.",
    "code": "VALIDATION_ERROR"
  }
}
```

**Duplicate URL**

```json
{
  "error": {
    "message": "This URL is already in your bookmarks. You can find it in your bookmarks list.",
    "code": "DUPLICATE_ERROR"
  }
}
```

**Collection Not Found**

```json
{
  "error": {
    "message": "One or more selected collections could not be found. Please refresh and try again.",
    "code": "NOT_FOUND"
  }
}
```

**Metadata Extraction Failed (Warning)**

```json
{
  "id": "clx1234567890",
  "postUrl": "https://example.com",
  "metadata": {
    "title": "example.com",
    "domain": "example.com",
    "extractionFailed": true
  },
  "warning": "Bookmark saved successfully, but we couldn't fetch the page details. The bookmark was saved with basic information."
}
```

### Check URL Bookmarked

Check if a URL is already bookmarked by the current user.

**Endpoint:** `bookmarks.checkUrlBookmarked`

**Requirements:** 5.1, 5.2

#### Request

```typescript
{
  url: string; // Required: The URL to check
}
```

#### Response

Returns the bookmark if it exists, or `null` if not found.

```typescript
BookmarkPost | null;
```

#### Example

```typescript
const existing = await client.bookmarks.checkUrlBookmarked({
  url: "https://example.com/article",
});

if (existing) {
  console.log("Already bookmarked:", existing.id);
} else {
  console.log("Not bookmarked yet");
}
```

### Batch Import URLs

Import multiple URLs at once with automatic metadata extraction and duplicate detection.

**Endpoint:** `bookmarks.batchImportUrls`

**Requirements:** 2.1, 2.2, 2.3, 2.4, 3.3

#### Request

```typescript
{
  urls: string[];           // Required: Array of URLs (max 500)
  collectionIds?: string[]; // Optional: Collections to add all bookmarks to
  skipDuplicates?: boolean; // Optional: Skip duplicates (default: true)
}
```

#### Response

```typescript
{
  successCount: number;     // Number of successfully imported URLs
  duplicateCount: number;   // Number of duplicate URLs skipped
  failureCount: number;     // Number of failed imports
  total: number;            // Total URLs in request
  errors?: Array<{          // Detailed error information
    url: string;
    error: string;
  }>;
}
```

#### Example

```typescript
const result = await client.bookmarks.batchImportUrls({
  urls: [
    "https://example.com/article1",
    "https://example.com/article2",
    "https://example.com/article3",
  ],
  collectionIds: ["collection-id-1"],
  skipDuplicates: true,
});

console.log(`Success: ${result.successCount}`);
console.log(`Duplicates: ${result.duplicateCount}`);
console.log(`Failed: ${result.failureCount}`);

if (result.errors) {
  result.errors.forEach((err) => {
    console.error(`${err.url}: ${err.error}`);
  });
}
```

#### Error Scenarios

**Rate Limit Exceeded**

```json
{
  "error": {
    "message": "Rate limit exceeded. You can import up to 1000 URLs per hour. You have 250 imports remaining in this hour.",
    "code": "RATE_LIMIT_EXCEEDED"
  }
}
```

**Batch Too Large**

```json
{
  "error": {
    "message": "Maximum 500 URLs allowed per batch",
    "code": "VALIDATION_ERROR"
  }
}
```

**Partial Success Response**

```json
{
  "successCount": 8,
  "duplicateCount": 1,
  "failureCount": 1,
  "total": 10,
  "errors": [
    {
      "url": "https://invalid-url",
      "error": "Invalid URL: Protocol must be http or https"
    }
  ]
}
```

## Bookmarks API (General)

### Create Bookmark

Create a bookmark for social media posts (Twitter/LinkedIn).

**Endpoint:** `bookmarks.create`

#### Request

```typescript
{
  platform: "TWITTER" | "LINKEDIN";
  postId: string;
  postUrl: string;
  content: string;
  authorName: string;
  authorUsername: string;
  authorProfileUrl: string;
  createdAt: Date;
  metadata?: Record<string, any>;
  media?: Array<{
    type: "IMAGE" | "VIDEO" | "LINK";
    url: string;
    thumbnailUrl?: string;
    metadata?: Record<string, any>;
  }>;
}
```

#### Response

```typescript
BookmarkPost;
```

### List Bookmarks

List bookmarks with pagination and filtering.

**Endpoint:** `bookmarks.list`

#### Request

```typescript
{
  filters?: {
    platform?: "TWITTER" | "LINKEDIN" | "GENERIC_URL";
    dateFrom?: Date;
    dateTo?: Date;
    authorUsername?: string;
    categoryIds?: string[];
    collectionId?: string;
  };
  pagination?: {
    cursor?: string;
    limit?: number;        // Default: 20, Max: 100
    sortBy?: "savedAt" | "createdAt"; // Default: "savedAt"
    sortOrder?: "asc" | "desc";       // Default: "desc"
  };
}
```

#### Response

```typescript
{
  bookmarks: BookmarkPost[];
  nextCursor?: string;
  total: number;
}
```

#### Example

```typescript
// Get first page of URL bookmarks
const page1 = await client.bookmarks.list({
  filters: {
    platform: "GENERIC_URL",
  },
  pagination: {
    limit: 20,
    sortBy: "savedAt",
    sortOrder: "desc",
  },
});

// Get next page using cursor
const page2 = await client.bookmarks.list({
  filters: {
    platform: "GENERIC_URL",
  },
  pagination: {
    cursor: page1.nextCursor,
    limit: 20,
  },
});
```

### Get Bookmark

Get a single bookmark by ID and increment view count.

**Endpoint:** `bookmarks.get`

#### Request

```typescript
{
  id: string; // Bookmark ID
}
```

#### Response

```typescript
BookmarkPost;
```

### Update Bookmark

Update bookmark content, metadata, or collection associations.

**Endpoint:** `bookmarks.update`

#### Request

```typescript
{
  id: string;
  data: {
    content?: string;
    metadata?: Record<string, any>;
    collectionIds?: string[];
  };
}
```

#### Response

```typescript
BookmarkPost;
```

#### Example

```typescript
// Update bookmark title and description
const updated = await client.bookmarks.update({
  id: "bookmark-id",
  data: {
    content: "Updated description",
    metadata: {
      title: "Updated Title",
    },
  },
});

// Update collection associations
const updated = await client.bookmarks.update({
  id: "bookmark-id",
  data: {
    collectionIds: ["collection-1", "collection-2"],
  },
});
```

### Delete Bookmark

Delete a bookmark permanently.

**Endpoint:** `bookmarks.delete`

#### Request

```typescript
{
  id: string; // Bookmark ID
}
```

#### Response

```typescript
{
  success: boolean;
}
```

### Search Bookmarks

Full-text search across bookmarks with PostgreSQL.

**Endpoint:** `bookmarks.search`

#### Request

```typescript
{
  query: string;
  filters?: {
    platform?: "TWITTER" | "LINKEDIN" | "GENERIC_URL";
    dateFrom?: Date;
    dateTo?: Date;
    authorUsername?: string;
    categoryIds?: string[];
    collectionId?: string;
  };
  pagination?: {
    cursor?: string;
    limit?: number;
    sortBy?: "savedAt" | "createdAt";
    sortOrder?: "asc" | "desc";
  };
  sortBy?: "relevance" | "date" | "views"; // Default: "relevance"
}
```

#### Response

```typescript
{
  results: BookmarkPost[];
  nextCursor?: string;
  total: number;
}
```

#### Example

```typescript
// Search for bookmarks containing "react"
const results = await client.bookmarks.search({
  query: "react",
  filters: {
    platform: "GENERIC_URL",
  },
  sortBy: "relevance",
});

// Search with multiple terms
const results = await client.bookmarks.search({
  query: "react hooks tutorial",
  sortBy: "date",
});
```

### Bulk Import Bookmarks

Import social media bookmarks from JSON export.

**Endpoint:** `bookmarks.bulkImport`

#### Request

```typescript
{
  platform: "TWITTER" | "LINKEDIN";
  bookmarks: Array<{
    postId: string;
    postUrl: string;
    content: string;
    author: {
      name: string;
      username: string;
      profileUrl: string;
    };
    media?: Array<{
      type: "IMAGE" | "VIDEO" | "LINK";
      url: string;
      thumbnailUrl?: string;
    }>;
    timestamp: string;
    metadata?: Record<string, any>;
  }>;
}
```

#### Response

```typescript
{
  successCount: number;
  failureCount: number;
  errors?: Array<{
    index: number;
    error: string;
  }>;
}
```

### Bulk Delete Bookmarks

Delete multiple bookmarks at once.

**Endpoint:** `bookmarks.bulkDelete`

#### Request

```typescript
{
  bookmarkIds: string[]; // Array of bookmark IDs
}
```

#### Response

```typescript
{
  success: boolean;
  deletedCount: number;
}
```

### Bulk Add to Collections

Add multiple bookmarks to multiple collections.

**Endpoint:** `bookmarks.bulkAddToCollections`

#### Request

```typescript
{
  bookmarkIds: string[];   // Array of bookmark IDs
  collectionIds: string[]; // Array of collection IDs
}
```

#### Response

```typescript
{
  success: boolean;
  bookmarkCount: number;
  collectionCount: number;
}
```

## Collections API

### Create Collection

**Endpoint:** `collections.create`

#### Request

```typescript
{
  name: string;
  description?: string;
}
```

#### Response

```typescript
{
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### List Collections

**Endpoint:** `collections.list`

#### Response

```typescript
Array<{
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    bookmarks: number;
  };
}>;
```

### Get Collection

**Endpoint:** `collections.get`

#### Request

```typescript
{
  id: string;
}
```

#### Response

```typescript
{
  id: string;
  userId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  bookmarks: BookmarkPost[];
}
```

### Update Collection

**Endpoint:** `collections.update`

#### Request

```typescript
{
  id: string;
  data: {
    name?: string;
    description?: string;
  };
}
```

### Delete Collection

**Endpoint:** `collections.delete`

#### Request

```typescript
{
  id: string;
}
```

#### Response

```typescript
{
  success: boolean;
}
```

## Categories API

### Create Category

**Endpoint:** `categories.create`

#### Request

```typescript
{
  name: string;
}
```

#### Response

```typescript
{
  id: string;
  name: string;
  userId: string;
  isSystem: boolean;
  createdAt: Date;
}
```

### List Categories

**Endpoint:** `categories.list`

#### Response

```typescript
Array<{
  id: string;
  name: string;
  userId: string;
  isSystem: boolean;
  createdAt: Date;
  _count: {
    bookmarks: number;
  };
}>;
```

### Update Category

**Endpoint:** `categories.update`

#### Request

```typescript
{
  id: string;
  data: {
    name: string;
  }
}
```

### Delete Category

**Endpoint:** `categories.delete`

#### Request

```typescript
{
  id: string;
}
```

## Dashboard API

### Get Dashboard Stats

**Endpoint:** `dashboard.getStats`

#### Response

```typescript
{
  totalBookmarks: number;
  bookmarksByPlatform: {
    TWITTER: number;
    LINKEDIN: number;
    GENERIC_URL: number;
  };
  recentBookmarks: BookmarkPost[];
  topCategories: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  mostViewed: BookmarkPost[];
}
```

## Rate Limits

| Endpoint            | Limit         | Window |
| ------------------- | ------------- | ------ |
| `createUrlBookmark` | 100 requests  | 1 hour |
| `batchImportUrls`   | 1000 URLs     | 1 hour |
| `bulkImport`        | 5 requests    | 1 hour |
| All other endpoints | 1000 requests | 1 hour |

## Best Practices

### URL Normalization

URLs are automatically normalized before storage:

- Protocol is preserved (http/https)
- Trailing slashes are removed
- Query parameters are preserved
- Fragments (#) are removed
- URLs are lowercased for comparison

**Example:**

```
Input:  "https://Example.com/Page?query=1#section"
Stored: "https://example.com/page?query=1"
```

### Metadata Extraction

The system attempts to extract metadata from URLs with a 3-second timeout:

- **Title** - From `<title>` tag or Open Graph
- **Description** - From meta description or Open Graph
- **Favicon** - From link rel="icon" or /favicon.ico
- **Images** - From Open Graph image

If extraction fails, the domain name is used as a fallback.

### Error Handling

Always handle errors gracefully:

```typescript
try {
  const bookmark = await client.bookmarks.createUrlBookmark({
    url: userInput,
  });

  if (bookmark.warning) {
    // Show warning to user
    console.warn(bookmark.warning);
  }

  // Success
  console.log("Bookmark created:", bookmark.id);
} catch (error) {
  if (error.message.includes("already in your bookmarks")) {
    // Handle duplicate
    showMessage("This URL is already bookmarked");
  } else if (error.message.includes("Invalid URL")) {
    // Handle validation error
    showMessage("Please enter a valid URL");
  } else {
    // Handle other errors
    showMessage("Failed to save bookmark. Please try again.");
  }
}
```

### Batch Import

For optimal performance when importing multiple URLs:

1. **Validate URLs client-side** before sending to API
2. **Batch size** - Keep batches under 100 URLs for best performance
3. **Handle partial failures** - Check the `errors` array in response
4. **Retry failed URLs** - Extract failed URLs and retry separately
5. **Show progress** - Update UI as import progresses

```typescript
async function importUrls(urls: string[]) {
  // Split into batches of 100
  const batches = chunk(urls, 100);

  for (const batch of batches) {
    const result = await client.bookmarks.batchImportUrls({
      urls: batch,
      skipDuplicates: true,
    });

    console.log(
      `Batch complete: ${result.successCount} success, ${result.failureCount} failed`
    );

    // Handle errors
    if (result.errors) {
      for (const error of result.errors) {
        console.error(`Failed to import ${error.url}: ${error.error}`);
      }
    }
  }
}
```

### Pagination

Use cursor-based pagination for efficient data loading:

```typescript
async function loadAllBookmarks() {
  const allBookmarks: BookmarkPost[] = [];
  let cursor: string | undefined;

  do {
    const page = await client.bookmarks.list({
      pagination: {
        cursor,
        limit: 100,
      },
    });

    allBookmarks.push(...page.bookmarks);
    cursor = page.nextCursor;
  } while (cursor);

  return allBookmarks;
}
```

## TypeScript Types

All types are exported from `@my-better-t-app/shared`:

```typescript
import type {
  BookmarkPost,
  BookmarkListResponse,
  Collection,
  Category,
  Media,
  Platform,
} from "@my-better-t-app/shared";
```

## Client SDK

The oRPC client is automatically generated and type-safe:

```typescript
import { createClient } from "@my-better-t-app/api/client";

const client = createClient({
  baseUrl: "https://your-domain.com/api",
});

// All methods are fully typed
const bookmark = await client.bookmarks.createUrlBookmark({
  url: "https://example.com",
});
```

## Changelog

### Version 1.1.0

- Added `createUrlBookmark` endpoint for generic URL bookmarking
- Added `checkUrlBookmarked` endpoint for duplicate detection
- Added `batchImportUrls` endpoint for bulk URL import
- Added `bulkDelete` endpoint for bulk bookmark deletion
- Added `bulkAddToCollections` endpoint for bulk operations
- Added `GENERIC_URL` platform type
- Implemented automatic metadata extraction
- Implemented URL normalization
- Added rate limiting for batch operations

### Version 1.0.0

- Initial API release
- Twitter and LinkedIn bookmark support
- Full-text search
- Collections and categories
- Bulk import for social media bookmarks

## Support

For API issues or questions:

1. Check this documentation
2. Review error messages carefully
3. Check the [User Guide](./USER_GUIDE.md)
4. Contact support if issues persist

## Related Documentation

- [User Guide](./USER_GUIDE.md) - End-user documentation
- [URL Import Guide](./URL_IMPORT_GUIDE.md) - Detailed import instructions
- [FAQ](./FAQ.md) - Frequently asked questions
