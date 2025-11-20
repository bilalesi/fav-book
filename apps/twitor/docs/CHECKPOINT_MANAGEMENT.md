# Checkpoint Management System

The checkpoint management system enables resumable Twitter bookmark crawls by tracking the last successfully processed tweet ID for each user.

## Overview

The checkpoint system consists of:

1. **Database Schema**: Separate `crawler` schema with checkpoint and session tables
2. **SQLAlchemy Models**: ORM models for database operations
3. **Pydantic Schemas**: Request/response validation models
4. **CheckpointManager**: Service class for checkpoint operations
5. **Database Connection**: Async SQLAlchemy engine and session management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                      │
├─────────────────────────────────────────────────────────────┤
│  public schema                │  crawler schema             │
│  ├─ user                      │  ├─ twitter_crawl_checkpoint│
│  ├─ bookmark_post             │  └─ crawl_session           │
│  └─ ...                       │                             │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
                    ┌─────────┴─────────┐
                    │   database.py     │
                    │  (Connection Pool) │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │ checkpoint_manager│
                    │      .py          │
                    └───────────────────┘
```

## Database Schema

### crawler.twitter_crawl_checkpoint

Stores the last successfully crawled tweet ID for each user.

| Column          | Type         | Description                         |
| --------------- | ------------ | ----------------------------------- |
| user_id         | VARCHAR(255) | Primary key, references public.user |
| last_tweet_id   | VARCHAR(255) | Last processed tweet ID             |
| last_crawled_at | TIMESTAMP    | When the last crawl occurred        |
| bookmarks_count | INTEGER      | Total bookmarks processed           |
| created_at      | TIMESTAMP    | Record creation time                |
| updated_at      | TIMESTAMP    | Record update time (auto-updated)   |

### crawler.crawl_session

Tracks individual crawl sessions with their status and configuration.

| Column               | Type         | Description                         |
| -------------------- | ------------ | ----------------------------------- |
| session_id           | VARCHAR(255) | Primary key, unique session ID      |
| user_id              | VARCHAR(255) | References public.user              |
| started_at           | TIMESTAMP    | Session start time                  |
| completed_at         | TIMESTAMP    | Session completion time (nullable)  |
| status               | VARCHAR(50)  | running/completed/stopped/failed    |
| bookmarks_processed  | INTEGER      | Count of bookmarks processed        |
| direct_import        | BOOLEAN      | Whether importing to database       |
| enable_summarization | BOOLEAN      | Whether AI summarization is enabled |
| output_file_path     | TEXT         | Path to JSON output file (nullable) |
| error_message        | TEXT         | Error message if failed (nullable)  |

## Usage

### Setting Up the Database

1. Run the migration to create the schema:

```bash
./scripts/run_migration.sh
```

2. Verify the schema was created:

```bash
./scripts/verify_schema.sh
```

### Using CheckpointManager

```python
from src.database import get_db_session
from src.checkpoint_manager import CheckpointManager

# Get a database session
async with get_db_session() as db:
    # Create checkpoint manager for a user
    manager = CheckpointManager(db, user_id="user123")

    # Check if checkpoint exists
    checkpoint = await manager.get_checkpoint()
    if checkpoint:
        print(f"Resume from: {checkpoint.last_tweet_id}")

    # Save checkpoint after processing
    await manager.save_checkpoint(
        tweet_id="1234567890",
        bookmarks_count=50
    )

    # Get just the last tweet ID
    last_id = await manager.get_last_tweet_id()

    # Clear checkpoint (start from beginning)
    await manager.clear_checkpoint()
```

### Database Connection

The database connection is managed through `database.py`:

```python
from src.database import get_db_session, close_db_connection

# Use as FastAPI dependency
from fastapi import Depends

@app.get("/endpoint")
async def endpoint(db: AsyncSession = Depends(get_db_session)):
    # Use db session
    pass

# Close connections on shutdown
@app.on_event("shutdown")
async def shutdown():
    await close_db_connection()
```

## Configuration

Database connection is configured via environment variables:

```bash
# .env file
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/favbook
DEBUG=false
```

The connection string is automatically converted from `postgresql://` to `postgresql+asyncpg://` for async support.

## Testing

Run the checkpoint manager tests:

```bash
# Run all tests
uv run pytest tests/test_checkpoint_manager.py -v

# Run specific test
uv run pytest tests/test_checkpoint_manager.py::TestCheckpointManager::test_save_checkpoint_creates_new -v

# Run with coverage
uv run pytest tests/test_checkpoint_manager.py --cov=src.checkpoint_manager
```

## Error Handling

The checkpoint manager handles common errors:

- **No checkpoint exists**: Returns `None` from `get_checkpoint()`
- **Database connection errors**: Propagated to caller for handling
- **Concurrent updates**: SQLAlchemy handles with transactions
- **Invalid user_id**: Foreign key constraint enforced by database

## Best Practices

1. **Always use transactions**: The `get_db_session()` dependency handles this automatically
2. **Save checkpoints frequently**: After each successful batch of bookmarks
3. **Handle checkpoint failures gracefully**: Don't fail the entire crawl if checkpoint save fails
4. **Use separate sessions per user**: Each user should have their own CheckpointManager instance
5. **Clean up old sessions**: Periodically clean up completed/failed sessions from `crawl_session` table

## Schema Isolation

The `crawler` schema is separate from the `public` schema to:

- Isolate crawler-specific tables from main application tables
- Allow independent schema evolution
- Simplify permissions management
- Enable easier backup/restore of crawler data

## Migration Management

Migrations are stored in `migrations/` directory and should be:

1. Numbered sequentially (001, 002, etc.)
2. Idempotent (safe to run multiple times)
3. Include rollback instructions in comments
4. Tested on a development database first

## Troubleshooting

### Connection Issues

If you get connection errors:

1. Check DATABASE_URL is set correctly
2. Verify PostgreSQL is running
3. Ensure the database exists
4. Check user has permissions on crawler schema

### Schema Not Found

If you get "schema crawler does not exist":

1. Run the migration: `./scripts/run_migration.sh`
2. Verify with: `./scripts/verify_schema.sh`

### Foreign Key Violations

If you get foreign key errors:

1. Ensure the user exists in `public.user` table
2. Check user_id matches exactly (case-sensitive)
3. Verify the user hasn't been deleted

## Future Enhancements

Potential improvements to the checkpoint system:

1. **Checkpoint history**: Track multiple checkpoints for rollback
2. **Automatic cleanup**: Scheduled job to remove old sessions
3. **Checkpoint validation**: Verify tweet IDs are valid before saving
4. **Metrics tracking**: Add performance metrics to checkpoint records
5. **Multi-platform support**: Extend to LinkedIn, Reddit, etc.
