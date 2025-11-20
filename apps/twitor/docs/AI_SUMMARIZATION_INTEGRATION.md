# AI Summarization Integration

This document describes the AI summarization integration in the Twitor service.

## Overview

The Twitor service supports optional AI summarization of bookmarks during the crawling process. When enabled, the service triggers the bookmark enrichment workflow via the main API for each imported bookmark.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Enable/disable AI summarization
ENABLE_AI_SUMMARIZATION=true

# API endpoints
API_BASE_URL=http://localhost:3000
API_AUTH_TOKEN=your_auth_token_here
```

### Request Parameters

When starting a crawl, include the `enableSummarization` parameter:

```json
{
  "userId": "user_123",
  "directImport": true,
  "enableSummarization": true
}
```

## Implementation Details

### Workflow Trigger

When `enableSummarization` is `true` and `directImport` is `true`, the bookmark processor:

1. Imports the bookmark to the database
2. Triggers the enrichment workflow via HTTP POST to the main API:
   ```
   {API_BASE_URL}/api/bookmarks/{bookmarkId}/enrich
   ```
3. Sends the following payload:
   ```json
   {
     "bookmarkId": "bookmark_id",
     "userId": "user_id",
     "platform": "TWITTER",
     "url": "tweet_url",
     "content": "tweet_text",
     "enableMediaDownload": false
   }
   ```

### Summarization Status

The system tracks summarization status through the following states:

- `pending`: Workflow has been triggered successfully
- `processing`: Workflow is currently running (not currently tracked)
- `completed`: Workflow completed successfully (not currently tracked)
- `failed`: Workflow trigger failed
- `skipped`: Summarization was disabled

### Progress Updates

Progress updates now include a `summarizationStatus` field:

```json
{
  "type": "progress",
  "bookmarksProcessed": 10,
  "currentBookmark": {
    "tweetId": "1234567890",
    "text": "Tweet content...",
    "author": "username"
  },
  "summarizationStatus": "pending"
}
```

## Error Handling

The implementation follows the requirement that **crawling continues even when summarization fails**:

1. **Network Errors**: If the HTTP request to the API fails, the error is logged and the status is set to `failed`, but processing continues
2. **API Errors**: If the API returns an error response, it's logged and processing continues
3. **Unexpected Errors**: Any unexpected errors are caught, logged, and processing continues

The crawl will never fail due to summarization errors.

## Behavior Matrix

| directImport | enableSummarization | Behavior                         |
| ------------ | ------------------- | -------------------------------- |
| true         | true                | Import to DB + Trigger workflow  |
| true         | false               | Import to DB only                |
| false        | true                | Accumulate to JSON (no workflow) |
| false        | false               | Accumulate to JSON               |

Note: Summarization is only triggered when `directImport` is `true`, as it requires a bookmark ID from the database.

## Testing

The implementation can be tested by:

1. Starting the main API server
2. Starting a crawl with `enableSummarization: true`
3. Monitoring the progress updates for summarization status
4. Checking the API logs for enrichment requests

## Future Enhancements

Potential improvements:

1. Track workflow completion status (currently only tracks trigger)
2. Add retry logic for failed workflow triggers
3. Support batch workflow triggering for better performance
4. Add webhook support for workflow completion notifications
