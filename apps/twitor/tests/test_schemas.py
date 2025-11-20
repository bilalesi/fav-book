"""Tests for Pydantic schemas."""

from datetime import datetime

import pytest
from pydantic import ValidationError

from src.schemas import (
    CheckpointResponse,
    CrawlProgressUpdate,
    CrawlStartRequest,
    CrawlStartResponse,
    CrawlStopResponse,
)


class TestCrawlStartRequest:
    """Test suite for CrawlStartRequest schema."""

    def test_valid_request(self):
        """Test creating a valid crawl start request."""
        request = CrawlStartRequest(
            userId="user123",
            directImport=True,
            enableSummarization=False,
        )

        assert request.userId == "user123"
        assert request.directImport is True
        assert request.enableSummarization is False

    def test_default_values(self):
        """Test default values for optional fields."""
        request = CrawlStartRequest(userId="user123")

        assert request.userId == "user123"
        assert request.directImport is True  # Default
        assert request.enableSummarization is False  # Default

    def test_empty_user_id_fails(self):
        """Test that empty user ID fails validation."""
        with pytest.raises(ValidationError):
            CrawlStartRequest(userId="")

    def test_missing_user_id_fails(self):
        """Test that missing user ID fails validation."""
        with pytest.raises(ValidationError):
            CrawlStartRequest()


class TestCrawlProgressUpdate:
    """Test suite for CrawlProgressUpdate schema."""

    def test_progress_update(self):
        """Test creating a progress update."""
        update = CrawlProgressUpdate(
            type="progress",
            bookmarksProcessed=10,
            currentBookmark={"id": "123", "text": "Test"},
        )

        assert update.type == "progress"
        assert update.bookmarksProcessed == 10
        assert update.currentBookmark == {"id": "123", "text": "Test"}
        assert update.error is None

    def test_complete_update(self):
        """Test creating a complete update."""
        update = CrawlProgressUpdate(
            type="complete",
            bookmarksProcessed=50,
        )

        assert update.type == "complete"
        assert update.bookmarksProcessed == 50

    def test_error_update(self):
        """Test creating an error update."""
        update = CrawlProgressUpdate(
            type="error",
            bookmarksProcessed=5,
            error="Authentication failed",
        )

        assert update.type == "error"
        assert update.error == "Authentication failed"

    def test_negative_bookmarks_fails(self):
        """Test that negative bookmarks count fails validation."""
        with pytest.raises(ValidationError):
            CrawlProgressUpdate(
                type="progress",
                bookmarksProcessed=-1,
            )


class TestCheckpointResponse:
    """Test suite for CheckpointResponse schema."""

    def test_checkpoint_with_data(self):
        """Test checkpoint response with data."""
        now = datetime.utcnow()
        response = CheckpointResponse(
            lastTweetId="tweet123",
            lastCrawledAt=now,
            bookmarksCount=42,
        )

        assert response.lastTweetId == "tweet123"
        assert response.lastCrawledAt == now
        assert response.bookmarksCount == 42

    def test_checkpoint_empty(self):
        """Test checkpoint response with no data."""
        response = CheckpointResponse()

        assert response.lastTweetId is None
        assert response.lastCrawledAt is None
        assert response.bookmarksCount == 0

    def test_negative_count_fails(self):
        """Test that negative bookmarks count fails validation."""
        with pytest.raises(ValidationError):
            CheckpointResponse(bookmarksCount=-1)


class TestCrawlStartResponse:
    """Test suite for CrawlStartResponse schema."""

    def test_start_response(self):
        """Test creating a start response."""
        response = CrawlStartResponse(
            sessionId="session123",
            status="started",
        )

        assert response.sessionId == "session123"
        assert response.status == "started"

    def test_default_status(self):
        """Test default status value."""
        response = CrawlStartResponse(sessionId="session123")

        assert response.status == "started"


class TestCrawlStopResponse:
    """Test suite for CrawlStopResponse schema."""

    def test_stop_response(self):
        """Test creating a stop response."""
        response = CrawlStopResponse(
            status="stopped",
            bookmarksProcessed=25,
        )

        assert response.status == "stopped"
        assert response.bookmarksProcessed == 25

    def test_negative_bookmarks_fails(self):
        """Test that negative bookmarks count fails validation."""
        with pytest.raises(ValidationError):
            CrawlStopResponse(
                status="stopped",
                bookmarksProcessed=-1,
            )
