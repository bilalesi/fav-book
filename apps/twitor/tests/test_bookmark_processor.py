"""Tests for bookmark processor."""

from datetime import datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.bookmark_processor import (
    BookmarkProcessor,
    DatabaseImportError,
    ProcessingResult,
)
from src.twitter_client import TwitterBookmark, TwitterMedia


@pytest.fixture
def sample_twitter_bookmark():
    """Create a sample Twitter bookmark for testing."""
    return TwitterBookmark(
        tweet_id="1234567890",
        tweet_url="https://twitter.com/testuser/status/1234567890",
        text="This is a test tweet with some content",
        author_name="Test User",
        author_username="testuser",
        author_profile_url="https://twitter.com/testuser",
        created_at=datetime(2024, 1, 15, 12, 0, 0),
        media=[
            TwitterMedia(
                media_type="photo",
                url="https://pbs.twimg.com/media/test.jpg",
                thumbnail_url="https://pbs.twimg.com/media/test_thumb.jpg",
            )
        ],
        metadata={
            "retweet_count": 10,
            "favorite_count": 25,
            "reply_count": 3,
            "lang": "en",
        },
    )


@pytest.fixture
def processor_direct_import():
    """Create a processor with direct import enabled."""
    with patch("src.bookmark_processor.get_settings") as mock_settings:
        mock_settings.return_value = MagicMock(
            api_base_url="http://localhost:3000",
            api_auth_token="test_token",
        )
        processor = BookmarkProcessor(
            user_id="test_user_123",
            direct_import=True,
            enable_summarization=False,
        )
        yield processor


@pytest.fixture
def processor_json_export():
    """Create a processor with JSON export (no direct import)."""
    with patch("src.bookmark_processor.get_settings") as mock_settings:
        mock_settings.return_value = MagicMock(
            api_base_url="http://localhost:3000",
            api_auth_token="test_token",
        )
        processor = BookmarkProcessor(
            user_id="test_user_123",
            direct_import=False,
            enable_summarization=False,
        )
        yield processor


class TestBookmarkTransformation:
    """Test bookmark transformation logic."""

    def test_transform_bookmark_basic_fields(
        self, processor_direct_import, sample_twitter_bookmark
    ):
        """Test that basic fields are transformed correctly."""
        result = processor_direct_import._transform_bookmark(sample_twitter_bookmark)

        assert result["platform"] == "TWITTER"
        assert result["postId"] == "1234567890"
        assert result["postUrl"] == "https://twitter.com/testuser/status/1234567890"
        assert result["content"] == "This is a test tweet with some content"
        assert result["authorName"] == "Test User"
        assert result["authorUsername"] == "testuser"
        assert result["authorProfileUrl"] == "https://twitter.com/testuser"

    def test_transform_bookmark_media(self, processor_direct_import, sample_twitter_bookmark):
        """Test that media is transformed correctly."""
        result = processor_direct_import._transform_bookmark(sample_twitter_bookmark)

        assert "media" in result
        assert len(result["media"]) == 1
        assert result["media"][0]["type"] == "IMAGE"
        assert result["media"][0]["url"] == "https://pbs.twimg.com/media/test.jpg"
        assert result["media"][0]["thumbnailUrl"] == "https://pbs.twimg.com/media/test_thumb.jpg"

    def test_transform_bookmark_metadata(self, processor_direct_import, sample_twitter_bookmark):
        """Test that metadata is preserved."""
        result = processor_direct_import._transform_bookmark(sample_twitter_bookmark)

        assert result["metadata"]["retweet_count"] == 10
        assert result["metadata"]["favorite_count"] == 25
        assert result["metadata"]["reply_count"] == 3
        assert result["metadata"]["lang"] == "en"

    def test_transform_bookmark_media_type_mapping(self, processor_direct_import):
        """Test that media types are mapped correctly."""
        # Test photo -> IMAGE
        bookmark_photo = TwitterBookmark(
            tweet_id="1",
            tweet_url="https://twitter.com/u/status/1",
            text="",
            author_name="User",
            author_username="user",
            author_profile_url="https://twitter.com/user",
            created_at=datetime.now(),
            media=[TwitterMedia(media_type="photo", url="http://example.com/photo.jpg")],
            metadata={},
        )
        result = processor_direct_import._transform_bookmark(bookmark_photo)
        assert result["media"][0]["type"] == "IMAGE"

        # Test video -> VIDEO
        bookmark_video = TwitterBookmark(
            tweet_id="2",
            tweet_url="https://twitter.com/u/status/2",
            text="",
            author_name="User",
            author_username="user",
            author_profile_url="https://twitter.com/user",
            created_at=datetime.now(),
            media=[TwitterMedia(media_type="video", url="http://example.com/video.mp4")],
            metadata={},
        )
        result = processor_direct_import._transform_bookmark(bookmark_video)
        assert result["media"][0]["type"] == "VIDEO"

        # Test animated_gif -> VIDEO
        bookmark_gif = TwitterBookmark(
            tweet_id="3",
            tweet_url="https://twitter.com/u/status/3",
            text="",
            author_name="User",
            author_username="user",
            author_profile_url="https://twitter.com/user",
            created_at=datetime.now(),
            media=[TwitterMedia(media_type="animated_gif", url="http://example.com/anim.gif")],
            metadata={},
        )
        result = processor_direct_import._transform_bookmark(bookmark_gif)
        assert result["media"][0]["type"] == "VIDEO"


class TestDirectImport:
    """Test direct database import functionality."""

    @pytest.mark.asyncio
    async def test_process_bookmark_direct_import_success(
        self, processor_direct_import, sample_twitter_bookmark
    ):
        """Test successful direct import."""
        # Mock the HTTP client
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"id": "bookmark_123"}

        processor_direct_import.http_client.post = AsyncMock(return_value=mock_response)

        result = await processor_direct_import.process_bookmark(sample_twitter_bookmark)

        assert result.success is True
        assert result.bookmark_id == "bookmark_123"
        assert result.error is None

    @pytest.mark.asyncio
    async def test_process_bookmark_direct_import_duplicate(
        self, processor_direct_import, sample_twitter_bookmark
    ):
        """Test handling of duplicate bookmarks."""
        # Mock 409 Conflict response
        mock_response = MagicMock()
        mock_response.status_code = 409
        mock_response.text = "Bookmark already exists"

        processor_direct_import.http_client.post = AsyncMock(return_value=mock_response)

        result = await processor_direct_import.process_bookmark(sample_twitter_bookmark)

        assert result.success is False
        assert result.error is not None
        assert "already exists" in result.error.lower()

    @pytest.mark.asyncio
    async def test_process_bookmark_direct_import_api_error(
        self, processor_direct_import, sample_twitter_bookmark
    ):
        """Test handling of API errors."""
        # Mock 500 error response
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal server error"
        mock_response.json.side_effect = Exception("Not JSON")

        processor_direct_import.http_client.post = AsyncMock(return_value=mock_response)

        result = await processor_direct_import.process_bookmark(sample_twitter_bookmark)

        assert result.success is False
        assert result.error is not None


class TestJSONExport:
    """Test JSON file export functionality."""

    @pytest.mark.asyncio
    async def test_process_bookmark_accumulation(
        self, processor_json_export, sample_twitter_bookmark
    ):
        """Test that bookmarks are accumulated when direct import is disabled."""
        result = await processor_json_export.process_bookmark(sample_twitter_bookmark)

        assert result.success is True
        assert len(processor_json_export.accumulated_bookmarks) == 1
        assert processor_json_export.accumulated_bookmarks[0]["postId"] == "1234567890"

    @pytest.mark.asyncio
    async def test_save_to_file(self, processor_json_export, sample_twitter_bookmark, tmp_path):
        """Test saving accumulated bookmarks to file."""
        # Accumulate some bookmarks
        await processor_json_export.process_bookmark(sample_twitter_bookmark)

        # Save to file
        output_file = tmp_path / "bookmarks.json"
        await processor_json_export.save_to_file(output_file)

        # Verify file exists and contains correct data
        assert output_file.exists()

        import json

        with open(output_file, "r") as f:
            data = json.load(f)

        assert data["platform"] == "TWITTER"
        assert data["total"] == 1
        assert len(data["bookmarks"]) == 1
        assert data["bookmarks"][0]["postId"] == "1234567890"

    def test_get_accumulated_count(self, processor_json_export):
        """Test getting accumulated bookmark count."""
        assert processor_json_export.get_accumulated_count() == 0

        processor_json_export.accumulated_bookmarks.append({"test": "data"})
        assert processor_json_export.get_accumulated_count() == 1

    def test_clear_accumulated(self, processor_json_export):
        """Test clearing accumulated bookmarks."""
        processor_json_export.accumulated_bookmarks.append({"test": "data"})
        assert processor_json_export.get_accumulated_count() == 1

        processor_json_export.clear_accumulated()
        assert processor_json_export.get_accumulated_count() == 0


class TestErrorHandling:
    """Test error handling in bookmark processor."""

    @pytest.mark.asyncio
    async def test_database_import_error_continues_processing(
        self, processor_direct_import, sample_twitter_bookmark
    ):
        """Test that database errors don't stop processing."""
        # Mock HTTP client to raise an exception
        processor_direct_import.http_client.post = AsyncMock(side_effect=Exception("Network error"))

        result = await processor_direct_import.process_bookmark(sample_twitter_bookmark)

        # Should return failed result, not raise exception
        assert result.success is False
        assert result.error is not None
        assert "error" in result.error.lower()
