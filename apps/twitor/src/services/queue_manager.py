"""Queue manager using Valkey (Redis-compatible) for distributed task processing."""

import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

import redis.asyncio as redis

from src.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class QueueTask:
    """Represents a task in the queue."""

    task_id: str
    task_type: str
    payload: dict[str, Any]
    created_at: str
    retry_count: int = 0
    max_retries: int = 3
    priority: int = 0  # Higher priority = processed first


class QueueManager:
    """Manages task queues using Valkey (Redis)."""

    def __init__(
        self,
        redis_url: str | None = None,
        queue_name: str = "twitor:tasks",
        max_queue_size: int = 10000,
    ):
        """
        Initialize queue manager.

        Args:
            redis_url: Redis/Valkey connection URL
            queue_name: Name of the queue
            max_queue_size: Maximum number of items in queue
        """
        settings = get_settings()
        self.redis_url = redis_url or settings.valkey_url
        self.queue_name = queue_name
        self.max_queue_size = max_queue_size
        self.redis_client: redis.Redis | None = None
        self._connected = False

    async def connect(self) -> None:
        """Connect to Valkey/Redis."""
        if self._connected and self.redis_client:
            return

        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )

            # Test connection
            await self.redis_client.ping()
            self._connected = True
            logger.info(f"Connected to Valkey at {self.redis_url}")

        except Exception as e:
            logger.error(f"Failed to connect to Valkey: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from Valkey/Redis."""
        if self.redis_client:
            await self.redis_client.aclose()
            self._connected = False
            logger.info("Disconnected from Valkey")

    async def enqueue(
        self,
        task_type: str,
        payload: dict[str, Any],
        task_id: str | None = None,
        priority: int = 0,
    ) -> str:
        """
        Add a task to the queue.

        Args:
            task_type: Type of task (e.g., 'process_bookmark', 'trigger_summarization')
            payload: Task payload data
            task_id: Optional task ID (generated if not provided)
            priority: Task priority (higher = processed first)

        Returns:
            Task ID

        Raises:
            Exception: If queue is full or enqueue fails
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        # Check queue size
        queue_size = await self.redis_client.llen(self.queue_name)
        if queue_size >= self.max_queue_size:
            raise Exception(f"Queue is full (max size: {self.max_queue_size})")

        # Generate task ID if not provided
        if not task_id:
            task_id = f"{task_type}:{datetime.utcnow().timestamp()}"

        # Create task
        task = QueueTask(
            task_id=task_id,
            task_type=task_type,
            payload=payload,
            created_at=datetime.utcnow().isoformat(),
            priority=priority,
        )

        # Serialize task
        task_json = json.dumps(asdict(task))

        # Add to queue (right push for FIFO)
        # For priority, we use sorted sets
        if priority > 0:
            # Use sorted set for priority queue
            priority_queue = f"{self.queue_name}:priority"
            await self.redis_client.zadd(
                priority_queue,
                {task_json: -priority},  # Negative for descending order
            )
        else:
            # Use list for regular FIFO queue
            await self.redis_client.rpush(self.queue_name, task_json)

        logger.debug(f"Enqueued task {task_id} (type: {task_type}, priority: {priority})")
        return task_id

    async def dequeue(self, timeout: int = 0) -> QueueTask | None:
        """
        Remove and return a task from the queue.

        Args:
            timeout: Timeout in seconds (0 = non-blocking, >0 = blocking)

        Returns:
            QueueTask if available, None if queue is empty (non-blocking mode)
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        # Check priority queue first
        priority_queue = f"{self.queue_name}:priority"
        priority_task = await self.redis_client.zpopmax(priority_queue)

        if priority_task:
            task_json = priority_task[0][0]  # (value, score) tuple
            task_data = json.loads(task_json)
            return QueueTask(**task_data)

        # Check regular queue
        if timeout > 0:
            # Blocking pop
            result = await self.redis_client.blpop(self.queue_name, timeout=timeout)
            if result:
                _, task_json = result
                task_data = json.loads(task_json)
                return QueueTask(**task_data)
        else:
            # Non-blocking pop
            task_json = await self.redis_client.lpop(self.queue_name)
            if task_json:
                task_data = json.loads(task_json)
                return QueueTask(**task_data)

        return None

    async def peek(self) -> QueueTask | None:
        """
        Peek at the next task without removing it.

        Returns:
            QueueTask if available, None if queue is empty
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        # Check priority queue first
        priority_queue = f"{self.queue_name}:priority"
        priority_tasks = await self.redis_client.zrange(
            priority_queue,
            0,
            0,
            desc=True,
        )

        if priority_tasks:
            task_json = priority_tasks[0]
            task_data = json.loads(task_json)
            return QueueTask(**task_data)

        # Check regular queue
        task_json = await self.redis_client.lindex(self.queue_name, 0)
        if task_json:
            task_data = json.loads(task_json)
            return QueueTask(**task_data)

        return None

    async def size(self) -> int:
        """
        Get the current size of the queue.

        Returns:
            Number of tasks in queue
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        regular_size = await self.redis_client.llen(self.queue_name)
        priority_queue = f"{self.queue_name}:priority"
        priority_size = await self.redis_client.zcard(priority_queue)

        return regular_size + priority_size

    async def clear(self) -> int:
        """
        Clear all tasks from the queue.

        Returns:
            Number of tasks removed
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        regular_size = await self.redis_client.llen(self.queue_name)
        priority_queue = f"{self.queue_name}:priority"
        priority_size = await self.redis_client.zcard(priority_queue)

        await self.redis_client.delete(self.queue_name)
        await self.redis_client.delete(priority_queue)

        total_removed = regular_size + priority_size
        logger.info(f"Cleared {total_removed} tasks from queue")
        return total_removed

    async def retry_task(self, task: QueueTask) -> bool:
        """
        Retry a failed task if retries are available.

        Args:
            task: Task to retry

        Returns:
            True if task was re-queued, False if max retries exceeded
        """
        if task.retry_count >= task.max_retries:
            logger.warning(
                f"Task {task.task_id} exceeded max retries ({task.max_retries}), "
                "moving to dead letter queue"
            )
            await self._move_to_dead_letter(task)
            return False

        # Increment retry count
        task.retry_count += 1

        # Re-queue with lower priority
        new_priority = max(0, task.priority - 1)

        await self.enqueue(
            task_type=task.task_type,
            payload=task.payload,
            task_id=task.task_id,
            priority=new_priority,
        )

        logger.info(f"Re-queued task {task.task_id} (retry {task.retry_count}/{task.max_retries})")
        return True

    async def _move_to_dead_letter(self, task: QueueTask) -> None:
        """
        Move a task to the dead letter queue.

        Args:
            task: Task to move
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        dead_letter_queue = f"{self.queue_name}:dead_letter"
        task_json = json.dumps(asdict(task))

        await self.redis_client.rpush(dead_letter_queue, task_json)
        logger.info(f"Moved task {task.task_id} to dead letter queue")

    async def get_dead_letter_tasks(self, limit: int = 100) -> list[QueueTask]:
        """
        Get tasks from the dead letter queue.

        Args:
            limit: Maximum number of tasks to retrieve

        Returns:
            List of failed tasks
        """
        if not self._connected or not self.redis_client:
            await self.connect()

        dead_letter_queue = f"{self.queue_name}:dead_letter"
        task_jsons = await self.redis_client.lrange(dead_letter_queue, 0, limit - 1)

        tasks = []
        for task_json in task_jsons:
            task_data = json.loads(task_json)
            tasks.append(QueueTask(**task_data))

        return tasks

    async def health_check(self) -> dict[str, Any]:
        """
        Check the health of the queue system.

        Returns:
            Dictionary with health status
        """
        try:
            if not self._connected or not self.redis_client:
                await self.connect()

            # Ping Redis
            await self.redis_client.ping()

            # Get queue sizes
            queue_size = await self.size()
            dead_letter_queue = f"{self.queue_name}:dead_letter"
            dead_letter_size = await self.redis_client.llen(dead_letter_queue)

            return {
                "status": "healthy",
                "connected": True,
                "queue_size": queue_size,
                "dead_letter_size": dead_letter_size,
                "max_queue_size": self.max_queue_size,
            }

        except Exception as e:
            logger.error(f"Queue health check failed: {e}")
            return {
                "status": "unhealthy",
                "connected": False,
                "error": str(e),
            }

    async def __aenter__(self) -> "QueueManager":
        """Context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit."""
        await self.disconnect()
