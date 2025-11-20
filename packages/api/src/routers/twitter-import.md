# Twitter Import API Router

## Overview

This router provides API endpoints for the Twitter bookmark import functionality, acting as a proxy between the frontend and the Twitor Python service.

## Architecture

```
Frontend (React) → API Router (TypeScript) → Twitor Service (Python/FastAPI)
```

The router handles:

- Authentication via `protectedProcedure` middleware
- Request validation using Zod schemas
- Error handling and logging
- Proxying requests to the Twitor service

## Endpoints

### 1. `twitterImport.startCrawl`

Starts a new Twitter bookmark crawl session.

**Input:**

```typescript
{
  userId: string;
  directImport: boolean; // default: true
  enableSummarization: boolean; // default: false
}
```

**Output:**

```typescript
{
  sessionId: string;
  status: string;
}
```

**Features:**

- Validates that the authenticated user matches the requested userId
- Proxies request to Twitor service at `/api/crawl/start`
- Returns session ID for tracking progress

### 2. `twitterImport.stopCrawl`

Stops an active crawl session.

**Input:**

```typescript
{
  sessionId: string;
}
```

**Output:**

```typescript
{
  status: string;
  bookmarksProcessed: number;
}
```

### 3. `twitterImport.getDownloadUrl`

Returns the download URL for a completed crawl session's JSON file.

**Input:**

```typescript
{
  sessionId: string;
}
```

**Output:**

```typescript
{
  downloadUrl: string;
  sessionId: string;
}
```

**Note:** The frontend makes a direct request to the Twitor service using this URL to download the file.

### 4. `twitterImport.healthCheck`

Checks the health status of the Twitor service.

**Output:**

```typescript
{
  healthy: boolean;
  status: "healthy" | "unhealthy" | "unreachable";
  service?: string;
  version?: string;
  message?: string;
}
```

## Configuration

The router uses the following environment variable:

- `TWITOR_SERVICE_URL`: URL of the Twitor service (default: `http://localhost:8001`)

## Error Handling

The router implements comprehensive error handling:

1. **Network Errors**: Detects connection failures and timeouts
2. **HTTP Errors**: Parses error responses from Twitor service
3. **Authentication**: Ensures users can only start crawls for themselves
4. **Validation**: Uses Zod schemas to validate all inputs

Error messages are user-friendly and provide actionable information.

## Security

- All endpoints require authentication via `protectedProcedure`
- User ID validation prevents unauthorized access
- 30-second timeout on all proxy requests
- CORS and security headers handled by Twitor service

## Usage Example

```typescript
import { client } from "@favy/api";

// Start a crawl
const { sessionId } = await client.twitterImport.startCrawl({
  userId: currentUser.id,
  directImport: true,
  enableSummarization: false,
});

// Check health
const health = await client.twitterImport.healthCheck();

// Get download URL
const { downloadUrl } = await client.twitterImport.getDownloadUrl({
  sessionId,
});

// Stop crawl
await client.twitterImport.stopCrawl({ sessionId });
```

## Integration

The router is registered in `fav-book/packages/api/src/routers/index.ts`:

```typescript
import { twitterImportRouter } from "./twitter-import";

export const appRouter = {
  // ... other routers
  twitterImport: twitterImportRouter,
};
```

## Testing

To test the router:

1. Ensure Twitor service is running on port 8001
2. Use the frontend Twitter import page
3. Or use the API client directly in tests

## Related Files

- Frontend: `fav-book/apps/web/src/routes/import.twitter.tsx`
- Twitor Service: `fav-book/apps/twitor/src/main.py`
- API Index: `fav-book/packages/api/src/routers/index.ts`
