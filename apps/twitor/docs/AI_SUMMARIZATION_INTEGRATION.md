# AI Summarization Integration

This document describes the AI summarization integration in the Twitor service.

## Overview

The Twitor service now supports optional AI summarization of bookmarks during the crawling process. When enabled, the service triggers the existing Restate bookmark enrichment workflow for each imported bookmark.

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Enable/disable AI summarization
ENABLE_AI_SUMMARIZATION=true

# Restate endpoints
RESTATE_INGRESS_URL=http://localhost:8080
RESTATE_ADMIN_URL=http://localhost:9070
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
2. Triggers the Restate enrichment workflow via HTTP POST to:
   ```
   {RESTATE_INGRESS_URL}/BookmarkEnrichment/{bookmarkId}/enrich
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

1. **Network Errors**: If the HTTP request to Restate fails, the error is logged and the status is set to `failed`, but processing continues
2. **API Errors**: If Restate returns an error response, it's logged and processing continues
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

1. Starting a Restate server
2. Deploying the bookmark enrichment workflow
3. Starting a crawl with `enableSummarization: true`
4. Monitoring the progress updates for summarization status
5. Checking the Restate logs for workflow invocations

## Future Enhancements

Potential improvements:

1. Track workflow completion status (currently only tracks trigger)
2. Add retry logic for failed workflow triggers
3. Support batch workflow triggering for better performance
4. Add webhook support for workflow completion notifications
