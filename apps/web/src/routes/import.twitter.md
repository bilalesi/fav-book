# Twitter Bookmark Import

This page provides a user interface for importing Twitter bookmarks directly from Twitter using the Twitor service.

## Features

- **Real-time Progress Tracking**: See live updates as bookmarks are being imported
- **Direct Import**: Save bookmarks directly to your library
- **JSON Export**: Download bookmarks as a JSON file for later import
- **AI Summarization**: Optionally enable AI-powered summarization during import
- **Resume Support**: The import process can resume from where it left off if interrupted
- **Error Handling**: Clear error messages and retry functionality

## Configuration

The page requires the following environment variable:

- `VITE_TWITOR_URL`: URL of the Twitor service (default: `http://localhost:8001`)

## API Endpoints Used

- `POST /api/crawl/start`: Start a new crawl session
- `GET /api/crawl/progress/{sessionId}`: SSE stream for progress updates
- `POST /api/crawl/stop/{sessionId}`: Stop an active crawl session
- `GET /api/crawl/download/{sessionId}`: Download bookmarks as JSON

## User Flow

1. User navigates to `/import/twitter`
2. User configures import options:
   - Direct Import toggle (save to database vs. export to file)
   - AI Summarization toggle
3. User clicks "Start Import"
4. Real-time progress updates are displayed via SSE
5. On completion:
   - If direct import: Bookmarks are saved to the database
   - If file export: Download button appears to get the JSON file
6. User can retry on error or start a new import

## Implementation Details

- Uses Server-Sent Events (SSE) for real-time progress updates
- Integrates with the Twitor Python service
- Follows the existing routing pattern (`/import/*`)
- Uses existing UI components (Card, Button, Switch, Badge)
- Handles authentication via the existing auth system
