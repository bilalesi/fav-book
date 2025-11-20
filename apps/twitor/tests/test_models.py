"""Tests for SQLAlchemy models."""

from datetime import datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.models import Base, CrawlSession, TwitterCrawlCheckpoint

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_engine():
    """Create a test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

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
        await session.rollback()


class TestTwitterCrawlCheckpoint:
    """Test suite for TwitterCrawlCheckpoint model."""

    @pytest.mark.asyncio
    async def test_create_checkpoint(self, db_session):
        """Test creating a checkpoint."""
        checkpoint = TwitterCrawlCheckpoint(
            user_id="user123",
            last_tweet_id="tweet456",
            last_crawled_at=datetime.utcnow(),
            bookmarks_count=10,
        )

        db_session.add(checkpoint)
        await db_session.commit()
        await db_session.refresh(checkpoint)

        assert checkpoint.user_id == "user123"
        assert checkpoint.last_tweet_id == "tweet456"
        assert checkpoint.bookmarks_count == 10
        assert checkpoint.created_at is not None

    @pytest.mark.asyncio
    async def test_checkpoint_default_values(self, db_session):
        """Test checkpoint default values."""
        checkpoint = TwitterCrawlCheckpoint(
            user_id="user123",
            last_tweet_id="tweet456",
            last_crawled_at=datetime.utcnow(),
        )

        db_session.add(checkpoint)
        await db_session.commit()
        await db_session.refresh(checkpoint)

        assert checkpoint.bookmarks_count == 0

    @pytest.mark.asyncio
    async def test_checkpoint_unique_user_id(self, db_session):
        """Test that user_id is unique (primary key)."""
        checkpoint1 = TwitterCrawlCheckpoint(
            user_id="user123",
            last_tweet_id="tweet1",
            last_crawled_at=datetime.utcnow(),
        )

        db_session.add(checkpoint1)
        await db_session.commit()

        # Try to add another checkpoint with same user_id
        checkpoint2 = TwitterCrawlCheckpoint(
            user_id="user123",
            last_tweet_id="tweet2",
            last_crawled_at=datetime.utcnow(),
        )

        db_session.add(checkpoint2)

        with pytest.raises(Exception):  # Should raise integrity error
            await db_session.commit()


class TestCrawlSession:
    """Test suite for CrawlSession model."""

    @pytest.mark.asyncio
    async def test_create_crawl_session(self, db_session):
        """Test creating a crawl session."""
        session = CrawlSession(
            session_id="session123",
            user_id="user456",
            direct_import=True,
            enable_summarization=False,
        )

        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        assert session.session_id == "session123"
        assert session.user_id == "user456"
        assert session.direct_import is True
        assert session.enable_summarization is False
        assert session.started_at is not None

    @pytest.mark.asyncio
    async def test_crawl_session_default_values(self, db_session):
        """Test crawl session default values."""
        session = CrawlSession(
            session_id="session123",
            user_id="user456",
            direct_import=True,
            enable_summarization=False,
        )

        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        assert session.status == "running"
        assert session.bookmarks_processed == 0
        assert session.completed_at is None
        assert session.output_file_path is None
        assert session.error_message is None

    @pytest.mark.asyncio
    async def test_crawl_session_update_status(self, db_session):
        """Test updating crawl session status."""
        session = CrawlSession(
            session_id="session123",
            user_id="user456",
            direct_import=True,
            enable_summarization=False,
        )

        db_session.add(session)
        await db_session.commit()

        # Update status
        session.status = "completed"
        session.bookmarks_processed = 50
        session.completed_at = datetime.utcnow()

        await db_session.commit()
        await db_session.refresh(session)

        assert session.status == "completed"
        assert session.bookmarks_processed == 50
        assert session.completed_at is not None

    @pytest.mark.asyncio
    async def test_crawl_session_with_error(self, db_session):
        """Test crawl session with error message."""
        session = CrawlSession(
            session_id="session123",
            user_id="user456",
            direct_import=True,
            enable_summarization=False,
            status="failed",
            error_message="Authentication failed",
        )

        db_session.add(session)
        await db_session.commit()
        await db_session.refresh(session)

        assert session.status == "failed"
        assert session.error_message == "Authentication failed"

    @pytest.mark.asyncio
    async def test_multiple_sessions_per_user(self, db_session):
        """Test that a user can have multiple sessions."""
        session1 = CrawlSession(
            session_id="session1",
            user_id="user123",
            direct_import=True,
            enable_summarization=False,
        )

        session2 = CrawlSession(
            session_id="session2",
            user_id="user123",
            direct_import=False,
            enable_summarization=True,
        )

        db_session.add(session1)
        db_session.add(session2)
        await db_session.commit()

        # Query sessions for user
        stmt = select(CrawlSession).where(CrawlSession.user_id == "user123")
        result = await db_session.execute(stmt)
        sessions = result.scalars().all()

        assert len(sessions) == 2
