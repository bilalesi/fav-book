"""Simplified bookmark processor for Twitter bookmarks."""

import json
import logging
from pathlib import Path
from typing import Any

import httpx

from src.core.config import get_settings
from src.twitter.client import TwitterBookmark

logger = logging.getLogger(__name__)


class BookmarkProcessorError(Exception):
    """Base exception for bookmark processor errors."""

    pass


class DatabaseImportError(BookmarkProcessorError):
    """Raised when database import fails."""

    pass


class ProcessingResult:
    """Result of processing a single bookmark."""

    def __init__(self, success: bool, bookmark_id: str | None = None, error: str | None = None):
        self.success = success
        self.bookmark_id = bookmark_id
        self.error = error


class BookmarkProcessor:
    """Simplified processor for Twitter bookmarks."""

    def __init__(
        self,
        user_id: str,
        save_to_database: bool = True,
        export_to_file: bool = False,
        session_id: str | None = None,
    ):
        self.user_id = user_id
        self.save_to_database = save_to_database
        self.export_to_file = export_to_file
        self.session_id = session_id
        self.settings = get_settings()
        self.accumulated_bookmarks: list[dict[str, Any]] = []
        self.http_client = None

        if self.save_to_database:
            self.http_client = httpx.AsyncClient(
                base_url=self.settings.api_base_url,
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.settings.api_auth_token}",
                    "Content-Type": "application/json",
                },
            )

    async def process_bookmark(self, bookmark: TwitterBookmark) -> ProcessingResult:
        """Process a single bookmark."""
        try:
            bookmark_data = self._convert_to_dict(bookmark)
            if self.save_to_database:
                bookmark_id = await self._import_to_database(bookmark_data)
            else:
                bookmark_id = bookmark.tweet_id
            if self.export_to_file:
                self.accumulated_bookmarks.append(bookmark_data)
            return ProcessingResult(success=True, bookmark_id=bookmark_id)
        except Exception as e:
            logger.error(f"Failed to process bookmark {bookmark.tweet_id}: {e}")
            return ProcessingResult(success=False, error=str(e))

    def _convert_to_dict(self, bookmark: TwitterBookmark) -> dict[str, Any]:
        """Convert TwitterBookmark to dictionary format."""
        return {
            "postId": bookmark.tweet_id,
            "url": bookmark.tweet_url,
            "text": bookmark.text,
            "authorName": bookmark.author_name,
            "authorUsername": bookmark.author_username,
            "authorProfileUrl": bookmark.author_profile_url,
            "createdAt": bookmark.created_at.isoformat(),
            "platform": "twitter",
            "userId": self.user_id,
            "media": [
                {"type": m.media_type, "url": m.url, "thumbnailUrl": m.thumbnail_url}
                for m in bookmark.media
            ],
            "metadata": bookmark.metadata,
        }

    async def _import_to_database(self, bookmark_data: dict[str, Any]) -> str:
        """Import bookmark to database via API."""
        if not self.http_client:
            raise DatabaseImportError("HTTP client not initialized")
        try:
            response = await self.http_client.post(
                "/api/twitter-import/import-bookmark", json=bookmark_data
            )
            response.raise_for_status()
            result = response.json()
            return result.get("bookmarkId", bookmark_data["postId"])
        except httpx.HTTPError as e:
            error_msg = f"Database import failed: {str(e)}"
            logger.error(error_msg)
            raise DatabaseImportError(error_msg) from e

    async def finalize(self) -> str | None:
        """Finalize processing and export to file if enabled."""
        if self.http_client:
            await self.http_client.aclose()
        if self.export_to_file and self.accumulated_bookmarks:
            return await self._export_to_file()
        return None

    async def _export_to_file(self) -> str:
        """Export accumulated bookmarks to JSON file."""
        output_dir = Path(self.settings.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"twitter_bookmarks_{self.session_id}.json"
        file_path = output_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "bookmarks": self.accumulated_bookmarks,
                    "total": len(self.accumulated_bookmarks),
                    "userId": self.user_id,
                    "sessionId": self.session_id,
                },
                f,
                indent=2,
                ensure_ascii=False,
            )
        logger.info(f"Exported {len(self.accumulated_bookmarks)} bookmarks to {file_path}")
        return str(file_path)
