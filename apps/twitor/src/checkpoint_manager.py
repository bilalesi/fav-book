"""Checkpoint manager for tracking crawl progress."""

from datetime import datetime
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import TwitterCrawlCheckpoint


class CheckpointManager:
    """Manages checkpoint storage and retrieval for Twitter crawls."""

    def __init__(self, db_session: AsyncSession, user_id: str):
        """
        Initialize the checkpoint manager.

        Args:
            db_session: Async SQLAlchemy session
            user_id: User ID for this checkpoint
        """
        self.db_session = db_session
        self.user_id = user_id

    async def get_checkpoint(self) -> Optional[TwitterCrawlCheckpoint]:
        """
        Retrieve the last checkpoint from the crawler schema.

        Returns:
            TwitterCrawlCheckpoint if exists, None otherwise
        """
        stmt = select(TwitterCrawlCheckpoint).where(TwitterCrawlCheckpoint.user_id == self.user_id)
        result = await self.db_session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_checkpoint(
        self, tweet_id: str, bookmarks_count: Optional[int] = None
    ) -> TwitterCrawlCheckpoint:
        """
        Save or update checkpoint after successful processing.

        Args:
            tweet_id: The tweet ID to save as checkpoint
            bookmarks_count: Optional total count of bookmarks processed

        Returns:
            The saved checkpoint
        """
        # Check if checkpoint exists
        existing = await self.get_checkpoint()

        if existing:
            # Update existing checkpoint
            existing.last_tweet_id = tweet_id
            existing.last_crawled_at = datetime.utcnow()
            if bookmarks_count is not None:
                existing.bookmarks_count = bookmarks_count
            checkpoint = existing
        else:
            # Create new checkpoint
            checkpoint = TwitterCrawlCheckpoint(
                user_id=self.user_id,
                last_tweet_id=tweet_id,
                last_crawled_at=datetime.utcnow(),
                bookmarks_count=bookmarks_count or 0,
            )
            self.db_session.add(checkpoint)

        await self.db_session.commit()
        await self.db_session.refresh(checkpoint)
        return checkpoint

    async def clear_checkpoint(self) -> bool:
        """
        Clear the checkpoint for manual reset (start from beginning).

        Returns:
            True if checkpoint was deleted, False if no checkpoint existed
        """
        stmt = delete(TwitterCrawlCheckpoint).where(TwitterCrawlCheckpoint.user_id == self.user_id)
        result = await self.db_session.execute(stmt)
        await self.db_session.commit()
        return result.rowcount > 0

    async def get_last_tweet_id(self) -> Optional[str]:
        """
        Get just the last tweet ID without fetching the full checkpoint.

        Returns:
            Last tweet ID if checkpoint exists, None otherwise
        """
        checkpoint = await self.get_checkpoint()
        return checkpoint.last_tweet_id if checkpoint else None

    async def get_bookmarks_count(self) -> int:
        """
        Get the total count of bookmarks processed.

        Returns:
            Total bookmarks count, 0 if no checkpoint exists
        """
        checkpoint = await self.get_checkpoint()
        return checkpoint.bookmarks_count if checkpoint else 0
