# Feature Flags System

The background processing pipeline includes a comprehensive feature flag system that allows runtime control of enrichment features without requiring code changes or application restarts.

## Available Feature Flags

### `ENABLE_AI_SUMMARIZATION`

- **Type**: Boolean
- **Default**: `true`
- **Description**: Enables or disables AI-powered content summarization, keyword extraction, and tag generation
- **Impact**: When disabled, bookmarks will not receive AI-generated summaries

### `ENABLE_MEDIA_DOWNLOAD`

- **Type**: Boolean
- **Default**: `true`
- **Description**: Enables or disables automatic media download from bookmarked content
- **Impact**: When disabled, videos and audio files will not be downloaded or stored

### `MAX_MEDIA_SIZE_MB`

- **Type**: Number (positive, max 5000)
- **Default**: `500`
- **Description**: Maximum media file size in megabytes that will be downloaded
- **Impact**: Media files larger than this limit will be skipped

### `MAX_SUMMARY_LENGTH`

- **Type**: Number (positive, max 2000)
- **Default**: `500`
- **Description**: Maximum summary length in words
- **Impact**: AI-generated summaries will be limited to this length

### `WORKFLOW_RETRY_ATTEMPTS`

- **Type**: Integer (0-10)
- **Default**: `3`
- **Description**: Maximum number of retry attempts for failed workflow steps
- **Impact**: Affects how many times the system will retry transient failures

### `WORKFLOW_RETRY_DELAY_MS`

- **Type**: Number (0-60000)
- **Default**: `5000`
- **Description**: Initial retry delay in milliseconds (uses exponential backoff)
- **Impact**: Controls the delay between retry attempts

## Configuration

### Environment Variables

Feature flags can be configured via environment variables in your `.env` file:

```bash
# Feature Flags - Background Processing
ENABLE_AI_SUMMARIZATION=true
ENABLE_MEDIA_DOWNLOAD=true
MAX_MEDIA_SIZE_MB=500
MAX_SUMMARY_LENGTH=500
WORKFLOW_RETRY_ATTEMPTS=3
WORKFLOW_RETRY_DELAY_MS=5000
```

### Admin Access

To modify feature flags at runtime via the API, you need to configure admin email addresses:

```bash
# Comma-separated list of admin email addresses
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

**Note**: If `ADMIN_EMAILS` is not configured, all authenticated users can modify feature flags (development mode only).

## API Endpoints

### Get All Feature Flags

**Endpoint**: `GET /api/featureFlags/getFlags`

**Authentication**: Required (any authenticated user)

**Response**:

```json
{
  "flags": {
    "ENABLE_AI_SUMMARIZATION": true,
    "ENABLE_MEDIA_DOWNLOAD": true,
    "MAX_MEDIA_SIZE_MB": 500,
    "MAX_SUMMARY_LENGTH": 500,
    "WORKFLOW_RETRY_ATTEMPTS": 3,
    "WORKFLOW_RETRY_DELAY_MS": 5000
  },
  "timestamp": "2025-11-15T10:30:00.000Z"
}
```

### Update Feature Flags

**Endpoint**: `POST /api/featureFlags/updateFlags`

**Authentication**: Required (admin users only)

**Request Body**:

```json
{
  "ENABLE_AI_SUMMARIZATION": false,
  "MAX_MEDIA_SIZE_MB": 1000
}
```

**Response**:

```json
{
  "success": true,
  "flags": {
    "ENABLE_AI_SUMMARIZATION": false,
    "ENABLE_MEDIA_DOWNLOAD": true,
    "MAX_MEDIA_SIZE_MB": 1000,
    "MAX_SUMMARY_LENGTH": 500,
    "WORKFLOW_RETRY_ATTEMPTS": 3,
    "WORKFLOW_RETRY_DELAY_MS": 5000
  },
  "message": "Feature flags updated successfully",
  "timestamp": "2025-11-15T10:31:00.000Z"
}
```

### Get Single Feature Flag

**Endpoint**: `POST /api/featureFlags/getFlag`

**Authentication**: Required (any authenticated user)

**Request Body**:

```json
{
  "name": "ENABLE_AI_SUMMARIZATION"
}
```

**Response**:

```json
{
  "name": "ENABLE_AI_SUMMARIZATION",
  "value": true,
  "timestamp": "2025-11-15T10:32:00.000Z"
}
```

### Check Admin Status

**Endpoint**: `GET /api/featureFlags/isAdmin`

**Authentication**: Required (any authenticated user)

**Response**:

```json
{
  "isAdmin": true,
  "email": "admin@example.com"
}
```

## Usage in Code

### Accessing Feature Flags

```typescript
import { getFeatureFlag, getFeatureFlags } from "@favy/shared";

// Get a single flag
const aiEnabled = getFeatureFlag("ENABLE_AI_SUMMARIZATION");

// Get all flags
const allFlags = getFeatureFlags();
```

### Updating Feature Flags

```typescript
import { updateFeatureFlags } from "@favy/shared";

// Update one or more flags
updateFeatureFlags({
  ENABLE_MEDIA_DOWNLOAD: false,
  MAX_MEDIA_SIZE_MB: 1000,
});
```

### Validation

All feature flag updates are automatically validated:

```typescript
import { validateFeatureFlags } from "@favy/shared";

const errors = validateFeatureFlags({
  MAX_MEDIA_SIZE_MB: 10000, // Too large!
});

if (errors.length > 0) {
  console.error("Validation errors:", errors);
  // [{ flag: "MAX_MEDIA_SIZE_MB", error: "MAX_MEDIA_SIZE_MB cannot exceed 5000 MB" }]
}
```

## Workflow Integration

Feature flags are automatically checked during workflow execution:

1. **AI Summarization**: Checked before Step 2 (AI Summarization)

   - If disabled, summarization is skipped gracefully
   - Workflow continues with other steps

2. **Media Download**: Checked before Step 3 (Media Detection)

   - If disabled, media detection and download are skipped
   - Workflow continues with database updates

3. **Retry Configuration**: Applied to workflow retry behavior
   - `WORKFLOW_RETRY_ATTEMPTS` controls max retry attempts
   - `WORKFLOW_RETRY_DELAY_MS` controls initial delay

## Logging

All feature flag operations are logged for audit purposes:

```
Feature flags updated {
  updatedBy: "admin@example.com",
  userId: "user_123",
  changes: { ENABLE_MEDIA_DOWNLOAD: false },
  timestamp: "2025-11-15T10:30:00.000Z"
}
```

Workflow logs include feature flag decisions:

```
Step 2: AI summarization {
  bookmarkId: "bookmark_123",
  enabled: true
}

AI summarization disabled by feature flag, skipping {
  bookmarkId: "bookmark_456"
}
```

## Best Practices

1. **Gradual Rollout**: Disable features during high load periods
2. **Testing**: Use feature flags to test new functionality with a subset of users
3. **Cost Control**: Disable media download to reduce storage costs
4. **Performance**: Adjust retry settings based on service reliability
5. **Monitoring**: Watch logs after changing feature flags to ensure expected behavior

## Security Considerations

- Only admin users can modify feature flags via API
- All flag changes are logged with user information
- Invalid flag values are rejected with validation errors
- Feature flags are loaded from environment on startup
- Runtime updates are stored in memory (not persisted to database)

## Troubleshooting

### Feature flag changes not taking effect

1. Check if the shared package was rebuilt: `bun run build` in `packages/shared`
2. Restart the application to reload environment variables
3. Verify admin email is configured correctly

### Validation errors

Check the validation rules:

- Boolean flags must be `true` or `false`
- Numeric flags must be positive numbers within specified ranges
- Integer flags must be whole numbers

### Permission denied

Ensure your email is in the `ADMIN_EMAILS` environment variable.

## Future Enhancements

- Persist feature flags to database for durability
- Add user-level feature flags for A/B testing
- Implement gradual rollout percentages
- Add feature flag history and audit trail
- Create admin UI for managing feature flags
