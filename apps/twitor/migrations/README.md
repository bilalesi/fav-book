# Database Migrations

This directory contains SQL migration files for the Twitor service.

## Running Migrations

To apply migrations to your database, run them in order using `psql` or your preferred PostgreSQL client:

```bash
# Using psql
psql -U your_username -d your_database -f migrations/001_create_crawler_schema.sql

# Or using environment variable
psql $DATABASE_URL -f migrations/001_create_crawler_schema.sql
```

## Migration Files

- `001_create_crawler_schema.sql` - Creates the `crawler` schema and initial tables:
  - `crawler.twitter_crawl_checkpoint` - Stores checkpoint data for resuming crawls
  - `crawler.crawl_session` - Tracks active and completed crawl sessions

## Schema Structure

The migrations create a separate `crawler` schema to isolate crawler-specific tables from the main application schema in the `public` namespace.

### Tables

#### crawler.twitter_crawl_checkpoint

Stores the last successfully crawled tweet ID for each user to enable resumable crawls.

- `user_id` (PK) - References public.user.\_id
- `last_tweet_id` - Last processed tweet ID
- `last_crawled_at` - Timestamp of last crawl
- `bookmarks_count` - Total bookmarks processed
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp (auto-updated via trigger)

#### crawler.crawl_session

Tracks individual crawl sessions with their status and configuration.

- `session_id` (PK) - Unique session identifier
- `user_id` - References public.user.\_id
- `started_at` - Session start timestamp
- `completed_at` - Session completion timestamp (nullable)
- `status` - Current status (running, completed, stopped, failed)
- `bookmarks_processed` - Count of bookmarks processed in this session
- `direct_import` - Whether bookmarks are imported directly to database
- `enable_summarization` - Whether AI summarization is enabled
- `output_file_path` - Path to output JSON file (if not direct import)
- `error_message` - Error message if session failed

## Rollback

To rollback the migrations:

```sql
-- Drop tables
DROP TABLE IF EXISTS crawler.crawl_session CASCADE;
DROP TABLE IF EXISTS crawler.twitter_crawl_checkpoint CASCADE;

-- Drop function
DROP FUNCTION IF EXISTS crawler.update_updated_at_column() CASCADE;

-- Drop schema
DROP SCHEMA IF EXISTS crawler CASCADE;
```
