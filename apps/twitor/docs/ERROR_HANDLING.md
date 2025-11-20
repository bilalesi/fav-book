# Error Handling and Recovery

This document describes the error handling and recovery mechanisms in the Twitor service.

## Overview

The Twitor service implements comprehensive error handling with automatic recovery strategies for different types of errors. The system uses:

1. **Error Classification**: Categorizes errors into specific types
2. **Recovery Strategies**: Applies appropriate recovery actions based on error type
3. **Checkpoint Management**: Saves progress to enable resumption after failures
4. **Queue System**: Uses Valkey (Redis-compatible) for distributed task processing

## Error Categories

### 1. Authentication Errors

**Category**: `AUTH`

**Causes**:

- Invalid Twitter credentials
- Expired authentication tokens
- Missing required credentials

**Recovery Strategy**: **ABORT**

- Stop crawling immediately
- Return clear error message to user
- Do not save checkpoint (no progress was made)

**User Action Required**: Update credentials and retry

### 2. Rate Limit Errors

**Category**: `RATE_LIMIT`

**Causes**:

- Twitter API rate limit exceeded
- Too many requests in short time period

**Recovery Strategy**: **PAUSE**

- Pause crawling for specified duration (typically 15 minutes)
- Save checkpoint before pausing
- Automatically resume after wait period

**User Action Required**: None (automatic recovery)

### 3. Network Errors

**Category**: `NETWORK`

**Causes**:

- Connection timeouts
- DNS resolution failures
- Temporary network issues

**Recovery Strategy**: **RETRY** with exponential backoff

- Retry up to 5 times
- Backoff timing: 1s, 2s, 4s, 8s, 16s
- If all retries fail, abort and save checkpoint

**User Action Required**: None for temporary issues; check network if persistent

### 4. Validation Errors

**Category**: `VALIDATION`

**Causes**:

- Invalid bookmark data from Twitter
- Missing required fields
- Data type mismatches

**Recovery Strategy**: **SKIP**

- Log error details
- Skip the problematic bookmark
- Continue processing remaining bookmarks

**User Action Required**: None (individual items skipped)

### 5. Database Errors

**Category**: `DATABASE`

**Causes**:

- Database connection failures
- Constraint violations
- Transaction errors

**Recovery Strategy**: **SKIP**

- Log error details
- Skip the problematic bookmark
- Continue processing remaining bookmarks
- Report errors in final summary

**User Action Required**: Review logs; check database connectivity

### 6. Fatal Errors

**Category**: `FATAL`

**Causes**:

- Out of memory
- Disk space exhausted
- Unrecoverable service errors

**Recovery Strategy**: **ABORT** with graceful shutdown

- Save checkpoint immediately
- Execute cleanup tasks
- Gracefully shutdown service
- Allow resume from checkpoint

**User Action Required**: Resolve underlying issue (free memory/disk) and resume

## Error Handler Usage

### Basic Usage

```python
from error_handler import ErrorHandler, ErrorContext

# Initialize with checkpoint manager
error_handler = ErrorHandler(
    checkpoint_manager=checkpoint_manager,
    max_retries=5,
    initial_backoff=1.0,
)

# Handle an error
try:
    # ... operation that might fail
    pass
except Exception as e:
    context = ErrorContext(
        error=e,
        retry_count=0,
        last_processed_id=last_tweet_id,
        session_id=session_id,
        user_id=user_id,
        operation="process_bookmark",
    )

    strategy = await error_handler.handle_error(context)

    if strategy.action == ErrorAction.RETRY:
        # Retry with delay
        await asyncio.sleep(strategy.delay)
        # ... retry operation
    elif strategy.action == ErrorAction.SKIP:
        # Skip and continue
        logger.warning(f"Skipping: {strategy.message}")
    elif strategy.action == ErrorAction.ABORT:
        # Save checkpoint and abort
        await error_handler.execute_recovery_strategy(strategy, context)
        raise
```

### Graceful Shutdown

```python
# On fatal error
await error_handler.graceful_shutdown(
    error_context,
    cleanup_tasks=[
        bookmark_processor.close(),
        http_client.aclose(),
    ],
)
```

## Queue System (Valkey)

The service uses Valkey (Redis-compatible) for distributed task processing and error recovery.

### Starting Valkey

```bash
# Using Docker Compose
cd fav-book/apps/twitor
docker-compose -f docker-compose.valkey.yml up -d

# Check status
docker-compose -f docker-compose.valkey.yml ps

# View logs
docker-compose -f docker-compose.valkey.yml logs -f valkey
```

### Queue Manager Usage

```python
from queue_manager import QueueManager, QueueTask

# Initialize queue manager
queue_manager = QueueManager(
    redis_url="redis://localhost:6379/0",
    queue_name="twitor:tasks",
)

# Connect
await queue_manager.connect()

# Enqueue a task
task_id = await queue_manager.enqueue(
    task_type="process_bookmark",
    payload={"bookmark_id": "123", "url": "..."},
    priority=1,  # Higher priority = processed first
)

# Dequeue a task
task = await queue_manager.dequeue(timeout=5)
if task:
    try:
        # Process task
        await process_task(task)
    except Exception as e:
        # Retry failed task
        await queue_manager.retry_task(task)

# Check queue health
health = await queue_manager.health_check()
print(f"Queue status: {health['status']}")
print(f"Queue size: {health['queue_size']}")

# Cleanup
await queue_manager.disconnect()
```

### Dead Letter Queue

Failed tasks (after max retries) are moved to a dead letter queue for manual inspection:

```python
# Get failed tasks
failed_tasks = await queue_manager.get_dead_letter_tasks(limit=100)

for task in failed_tasks:
    print(f"Task {task.task_id} failed after {task.retry_count} retries")
    print(f"Payload: {task.payload}")
```

## Checkpoint Management

Checkpoints are saved automatically:

1. **Periodic Saves**: Every 10 bookmarks processed
2. **On Pause**: Before pausing for rate limits
3. **On Fatal Error**: Before graceful shutdown
4. **On Cancellation**: When user stops the crawl

### Resuming from Checkpoint

The service automatically resumes from the last checkpoint:

```python
# Get checkpoint
checkpoint = await checkpoint_manager.get_checkpoint()

if checkpoint:
    print(f"Resuming from tweet ID: {checkpoint.last_tweet_id}")
    print(f"Last crawled: {checkpoint.last_crawled_at}")
    print(f"Bookmarks processed: {checkpoint.bookmarks_count}")
else:
    print("No checkpoint found, starting fresh crawl")
```

### Manual Checkpoint Management

```python
# Clear checkpoint (start from beginning)
await checkpoint_manager.clear_checkpoint()

# Save checkpoint manually
await checkpoint_manager.save_checkpoint(
    tweet_id="1234567890",
    bookmarks_count=100,
)
```

## Configuration

### Environment Variables

```bash
# Valkey/Redis Configuration
VALKEY_URL=redis://localhost:6379/0
VALKEY_MAX_CONNECTIONS=10

# Error Handling
MAX_RETRIES=5
INITIAL_BACKOFF=1.0
```

### Settings in Code

```python
from config import get_settings

settings = get_settings()

# Access configuration
print(f"Valkey URL: {settings.valkey_url}")
print(f"Max connections: {settings.valkey_max_connections}")
```

## Monitoring and Debugging

### Logging

The error handler logs all errors with appropriate severity:

- **DEBUG**: Retry attempts, backoff calculations
- **INFO**: Recovery actions, checkpoint saves
- **WARNING**: Skipped items, rate limits
- **ERROR**: Failed operations, database errors
- **CRITICAL**: Fatal errors, graceful shutdowns

### Health Checks

```python
# Check queue health
health = await queue_manager.health_check()

if health['status'] == 'healthy':
    print(f"✓ Queue is healthy")
    print(f"  Queue size: {health['queue_size']}")
    print(f"  Dead letter: {health['dead_letter_size']}")
else:
    print(f"✗ Queue is unhealthy: {health['error']}")
```

### Metrics to Monitor

1. **Error Rates**: Track errors by category
2. **Retry Counts**: Monitor retry attempts
3. **Queue Size**: Watch for queue buildup
4. **Dead Letter Size**: Check for persistent failures
5. **Checkpoint Frequency**: Ensure regular saves

## Best Practices

1. **Always Use Error Handler**: Wrap operations in try-except with error handler
2. **Save Checkpoints Frequently**: Don't lose progress on failures
3. **Monitor Queue Size**: Prevent queue overflow
4. **Review Dead Letter Queue**: Investigate persistent failures
5. **Set Appropriate Timeouts**: Balance responsiveness vs. reliability
6. **Log Context**: Include session_id, user_id in error logs
7. **Test Recovery**: Simulate failures to verify recovery works

## Troubleshooting

### Queue Connection Failures

```bash
# Check if Valkey is running
docker-compose -f docker-compose.valkey.yml ps

# Test connection
redis-cli -h localhost -p 6379 ping
# Should return: PONG

# Check logs
docker-compose -f docker-compose.valkey.yml logs valkey
```

### Checkpoint Not Saving

1. Check database connectivity
2. Verify user_id is valid
3. Check database permissions
4. Review error logs for SQLAlchemy errors

### High Retry Rates

1. Check network stability
2. Verify Twitter API status
3. Review rate limit settings
4. Consider increasing backoff times

### Dead Letter Queue Growing

1. Review failed task payloads
2. Check for data validation issues
3. Verify external service availability
4. Consider adjusting max_retries

## Examples

### Complete Error Handling Flow

```python
async def process_with_error_handling():
    error_handler = ErrorHandler(checkpoint_manager=checkpoint_manager)
    retry_count = 0

    while retry_count <= error_handler.max_retries:
        try:
            # Attempt operation
            result = await risky_operation()
            return result

        except Exception as e:
            context = ErrorContext(
                error=e,
                retry_count=retry_count,
                last_processed_id=last_id,
                operation="risky_operation",
            )

            strategy = await error_handler.handle_error(context)

            if strategy.action == ErrorAction.RETRY:
                retry_count += 1
                await asyncio.sleep(strategy.delay)
                continue
            elif strategy.action == ErrorAction.SKIP:
                logger.warning(f"Skipping: {strategy.message}")
                return None
            else:  # ABORT
                await error_handler.execute_recovery_strategy(strategy, context)
                raise

    # Max retries exceeded
    raise Exception("Operation failed after max retries")
```

### Queue-Based Processing

```python
async def process_queue():
    queue_manager = QueueManager()
    await queue_manager.connect()

    try:
        while True:
            # Dequeue task (blocking with timeout)
            task = await queue_manager.dequeue(timeout=30)

            if not task:
                continue

            try:
                # Process task
                await process_task(task)
                logger.info(f"Task {task.task_id} completed")

            except Exception as e:
                logger.error(f"Task {task.task_id} failed: {e}")

                # Retry if retries available
                if not await queue_manager.retry_task(task):
                    logger.error(f"Task {task.task_id} moved to dead letter queue")

    finally:
        await queue_manager.disconnect()
```
