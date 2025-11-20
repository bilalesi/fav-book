"""Tests for checkpoint manager."""

from datetime import datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.checkpoint_manager import CheckpointManager
from src.models import Base, TwitterCrawlCheckpoint

# Test database URL (in-memory SQLite for testing)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine):
    """Create a test database session."""
    session_factory = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        yield session


@pytest.fixture
def checkpoint_manager(db_session):
    """Create a checkpoint manager instance."""
    return CheckpointManager(db_session, user_id="test_user_123")


class TestCheckpointManager:
    """Test suite for CheckpointManager."""

    @pytest.mark.asyncio
    async def test_get_checkpoint_when_none_exists(self, checkpoint_manager):
        """Test getting checkpoint when none exists returns None."""
        checkpoint = await checkpoint_manager.get_checkpoint()
        assert checkpoint is None

    @pytest.mark.asyncio
    async def test_save_checkpoint_creates_new(self, checkpoint_manager):
        """Test saving a new checkpoint."""
        tweet_id = "1234567890"
        bookmarks_count = 10

        checkpoint = await checkpoint_manager.save_checkpoint(
            tweet_id=tweet_id, bookmarks_count=bookmarks_count
        )

        assert checkpoint is not None
        assert checkpoint.user_id == "test_user_123"
        assert checkpoint.last_tweet_id == tweet_id
        assert checkpoint.bookmarks_count == bookmarks_count
        assert checkpoint.last_crawled_at is not None

    @pytest.mark.asyncio
    async def test_save_checkpoint_updates_existing(self, checkpoint_manager):
        """Test updating an existing checkpoint."""
        # Create initial checkpoint
        initial_tweet_id = "1111111111"
        await checkpoint_manager.save_checkpoint(tweet_id=initial_tweet_id, bookmarks_count=5)

        # Update checkpoint
        new_tweet_id = "2222222222"
        new_count = 15
        updated_checkpoint = await checkpoint_manager.save_checkpoint(
            tweet_id=new_tweet_id, bookmarks_count=new_count
        )

        assert updated_checkpoint.last_tweet_id == new_tweet_id
        assert updated_checkpoint.bookmarks_count == new_count

        # Verify only one checkpoint exists
        checkpoint = await checkpoint_manager.get_checkpoint()
        assert checkpoint.last_tweet_id == new_tweet_id

    @pytest.mark.asyncio
    async def test_get_last_tweet_id(self, checkpoint_manager):
        """Test getting just the last tweet ID."""
        # No checkpoint exists
        tweet_id = await checkpoint_manager.get_last_tweet_id()
        assert tweet_id is None

        # Create checkpoint
        expected_id = "9876543210"
        await checkpoint_manager.save_checkpoint(tweet_id=expected_id)

        # Get tweet ID
        tweet_id = await checkpoint_manager.get_last_tweet_id()
        assert tweet_id == expected_id

    @pytest.mark.asyncio
    async def test_get_bookmarks_count(self, checkpoint_manager):
        """Test getting bookmarks count."""
        # No checkpoint exists
        count = await checkpoint_manager.get_bookmarks_count()
        assert count == 0

        # Create checkpoint
        expected_count = 42
        await checkpoint_manager.save_checkpoint(tweet_id="123", bookmarks_count=expected_count)

        # Get count
        count = await checkpoint_manager.get_bookmarks_count()
        assert count == expected_count

    @pytest.mark.asyncio
    async def test_clear_checkpoint(self, checkpoint_manager):
        """Test clearing a checkpoint."""
        # Create checkpoint
        await checkpoint_manager.save_checkpoint(tweet_id="123")

        # Verify it exists
        checkpoint = await checkpoint_manager.get_checkpoint()
        assert checkpoint is not None

        # Clear checkpoint
        result = await checkpoint_manager.clear_checkpoint()
        assert result is True

        # Verify it's gone
        checkpoint = await checkpoint_manager.get_checkpoint()
        assert checkpoint is None

    @pytest.mark.asyncio
    async def test_clear_checkpoint_when_none_exists(self, checkpoint_manager):
        """Test clearing checkpoint when none exists."""
        result = await checkpoint_manager.clear_checkpoint()
        assert result is False

    @pytest.mark.asyncio
    async def test_multiple_users_separate_checkpoints(self, db_session):
        """Test that different users have separate checkpoints."""
        user1_manager = CheckpointManager(db_session, user_id="user1")
        user2_manager = CheckpointManager(db_session, user_id="user2")

        # Create checkpoints for both users
        await user1_manager.save_checkpoint(tweet_id="111", bookmarks_count=10)
        await user2_manager.save_checkpoint(tweet_id="222", bookmarks_count=20)

        # Verify each user has their own checkpoint
        user1_checkpoint = await user1_manager.get_checkpoint()
        user2_checkpoint = await user2_manager.get_checkpoint()

        assert user1_checkpoint.last_tweet_id == "111"
        assert user1_checkpoint.bookmarks_count == 10
        assert user2_checkpoint.last_tweet_id == "222"
        assert user2_checkpoint.bookmarks_count == 20

    @pytest.mark.asyncio
    async def test_save_checkpoint_without_count(self, checkpoint_manager):
        """Test saving checkpoint without specifying bookmarks count."""
        checkpoint = await checkpoint_manager.save_checkpoint(tweet_id="123")

        assert checkpoint.last_tweet_id == "123"
        assert checkpoint.bookmarks_count == 0

    @pytest.mark.asyncio
    async def test_checkpoint_timestamps(self, checkpoint_manager):
        """Test that checkpoint timestamps are set correctly."""
        checkpoint = await checkpoint_manager.save_checkpoint(tweet_id="123")

        assert checkpoint.created_at is not None
        assert checkpoint.last_crawled_at is not None
        assert isinstance(checkpoint.last_crawled_at, datetime)
