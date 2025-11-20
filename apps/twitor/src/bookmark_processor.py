"""Bookmark processor module for transforming and importing Twitter bookmarks."""

import json
import logging
from pathlib import Path
from typing import Any

import httpx

from .config import get_settings
from .twitter_client import TwitterBookmark

logger = logging.getLogger(__name__)


class SummarizationStatus:
    """Enumeration of summarization status values."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class BookmarkProcessorError(Exception):
    """Base exception for bookmark processor errors."""

    pass


class DatabaseImportError(BookmarkProcessorError):
    """Raised when database import fails."""

    pass


class ProcessingResult:
    """Result of processing a single bookmark."""

    def __init__(
        self,
        success: bool,
        bookmark_id: str | None = None,
        error: str | None = None,
        summarization_status: str | None = None,
    ):
        """
        Initialize processing result.

        Args:
            success: Whether processing was successful
            bookmark_id: ID of created bookmark (if successful)
            error: Error message (if failed)
            summarization_status: Status of AI summarization
        """
        self.success = success
        self.bookmark_id = bookmark_id
        self.error = error
        self.summarization_status = summarization_status


class BookmarkProcessor:
    """Processor for transforming and importing Twitter bookmarks."""

    def __init__(
        self,
        user_id: str,
        direct_import: bool = True,
        enable_summarization: bool = False,
        session_id: str | None = None,
    ):
        """
        Initialize bookmark processor.

        Args:
            user_id: User ID for bookmark ownership
            direct_import: Whether to import directly to database
            enable_summarization: Whether to enable AI summarization
            session_id: Session ID for file accumulation
        """
        self.user_id = user_id
        self.direct_import = direct_import
        self.enable_summarization = enable_summarization
        self.session_id = session_id
        self.settings = get_settings()

        # Accumulated bookmarks for JSON export
        self.accumulated_bookmarks: list[dict[str, Any]] = []

        # HTTP client for API calls
        self.http_client = httpx.AsyncClient(
            base_url=self.settings.api_base_url,
            timeout=30.0,
            headers={
                "Authorization": f"Bearer {self.settings.api_auth_token}",
                "Content-Type": "application/json",
            },
        )

    async def close(self) -> None:
        """Close HTTP client and cleanup resources."""
        await self.http_client.aclose()

    async def process_bookmark(self, twitter_bookmark: TwitterBookmark) -> ProcessingResult:
        """
        Process a single Twitter bookmark.

        Args:
            twitter_bookmark: Twitter bookmark to process

        Returns:
            ProcessingResult indicating success or failure
        """
        summarization_status = SummarizationStatus.SKIPPED
        bookmark_id = None

        try:
            # Transform to application format
            bookmark_data = self._transform_bookmark(twitter_bookmark)

            if self.direct_import:
                # Import directly to database
                bookmark_id = await self._import_to_database(bookmark_data)
                logger.info(
                    f"Successfully imported bookmark {twitter_bookmark.tweet_id} as {bookmark_id}"
                )

                # Trigger AI summarization if enabled
                if self.enable_summarization:
                    summarization_status = await self._trigger_summarization(
                        bookmark_id=bookmark_id,
                        url=twitter_bookmark.tweet_url,
                        content=twitter_bookmark.text,
                    )
                else:
                    summarization_status = SummarizationStatus.SKIPPED

                return ProcessingResult(
                    success=True,
                    bookmark_id=bookmark_id,
                    summarization_status=summarization_status,
                )
            else:
                # Accumulate for JSON export
                self.accumulated_bookmarks.append(bookmark_data)
                logger.debug(f"Accumulated bookmark {twitter_bookmark.tweet_id} for export")
                return ProcessingResult(
                    success=True,
                    summarization_status=SummarizationStatus.SKIPPED,
                )

        except DatabaseImportError as e:
            # Log error but don't stop processing
            error_msg = f"Database import failed for {twitter_bookmark.tweet_id}: {e}"
            logger.error(error_msg)
            return ProcessingResult(
                success=False,
                error=error_msg,
                summarization_status=summarization_status,
            )

        except Exception as e:
            # Unexpected error
            error_msg = f"Unexpected error processing {twitter_bookmark.tweet_id}: {e}"
            logger.error(error_msg, exc_info=True)
            return ProcessingResult(
                success=False,
                error=error_msg,
                summarization_status=summarization_status,
            )

    def _transform_bookmark(self, twitter_bookmark: TwitterBookmark) -> dict[str, Any]:
        """
        Transform Twitter bookmark to application format.

        Args:
            twitter_bookmark: Twitter bookmark to transform

        Returns:
            Dictionary in application bookmark format
        """
        # Transform media
        media = []
        for twitter_media in twitter_bookmark.media:
            media_type = twitter_media.media_type.upper()
            # Map Twitter media types to application media types
            if media_type in ("PHOTO", "IMAGE"):
                media_type = "IMAGE"
            elif media_type in ("VIDEO", "ANIMATED_GIF"):
                media_type = "VIDEO"
            else:
                media_type = "LINK"

            media.append(
                {
                    "type": media_type,
                    "url": twitter_media.url,
                    "thumbnailUrl": twitter_media.thumbnail_url,
                }
            )

        # Build bookmark data in application format
        bookmark_data = {
            "platform": "TWITTER",
            "postId": twitter_bookmark.tweet_id,
            "postUrl": twitter_bookmark.tweet_url,
            "content": twitter_bookmark.text,
            "authorName": twitter_bookmark.author_name,
            "authorUsername": twitter_bookmark.author_username,
            "authorProfileUrl": twitter_bookmark.author_profile_url,
            "createdAt": twitter_bookmark.created_at.isoformat(),
            "metadata": twitter_bookmark.metadata,
        }

        # Add media if present
        if media:
            bookmark_data["media"] = media

        return bookmark_data

    async def _import_to_database(self, bookmark_data: dict[str, Any]) -> str:
        """
        Import bookmark to database via API.

        Args:
            bookmark_data: Bookmark data in application format

        Returns:
            Created bookmark ID

        Raises:
            DatabaseImportError: If import fails
        """
        try:
            # Call the bookmark creation API
            response = await self.http_client.post(
                "/api/bookmarks/create",
                json=bookmark_data,
            )

            # Check for errors
            if response.status_code == 409:
                # Bookmark already exists - not an error, just skip
                logger.info(f"Bookmark {bookmark_data['postId']} already exists, skipping")
                raise DatabaseImportError("Bookmark already exists")

            if response.status_code >= 400:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message", error_detail)
                except Exception:
                    pass

                raise DatabaseImportError(f"API returned {response.status_code}: {error_detail}")

            # Parse response
            result = response.json()
            bookmark_id = result.get("id")

            if not bookmark_id:
                raise DatabaseImportError("API response missing bookmark ID")

            return bookmark_id

        except httpx.HTTPError as e:
            raise DatabaseImportError(f"HTTP error during import: {e}") from e
        except DatabaseImportError:
            raise
        except Exception as e:
            raise DatabaseImportError(f"Unexpected error during import: {e}") from e

    async def _trigger_summarization(
        self,
        bookmark_id: str,
        url: str,
        content: str,
    ) -> str:
        """
        Trigger AI summarization workflow via Restate.

        Args:
            bookmark_id: ID of the bookmark to enrich
            url: URL of the bookmark
            content: Content of the bookmark

        Returns:
            Summarization status string
        """
        try:
            logger.info(f"Triggering summarization for bookmark {bookmark_id}")

            # Prepare enrichment workflow payload
            payload = {
                "bookmarkId": bookmark_id,
                "userId": self.user_id,
                "platform": "TWITTER",
                "url": url,
                "content": content,
                "enableMediaDownload": False,  # Media download handled separately
            }

            # Call the Restate workflow trigger endpoint
            response = await self.http_client.post(
                f"{self.settings.restate_ingress_url}/BookmarkEnrichment/{bookmark_id}/enrich",
                json=payload,
                headers={
                    "Content-Type": "application/json",
                },
            )

            if response.status_code >= 400:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message", error_detail)
                except Exception:
                    pass

                logger.error(
                    f"Failed to trigger summarization for {bookmark_id}: "
                    f"{response.status_code} - {error_detail}"
                )
                return SummarizationStatus.FAILED

            logger.info(f"Successfully triggered summarization for bookmark {bookmark_id}")
            return SummarizationStatus.PENDING

        except httpx.HTTPError as e:
            # Network error - log but don't fail the crawl
            logger.error(f"HTTP error triggering summarization for {bookmark_id}: {e}")
            return SummarizationStatus.FAILED

        except Exception as e:
            # Unexpected error - log but don't fail the crawl
            logger.error(
                f"Unexpected error triggering summarization for {bookmark_id}: {e}",
                exc_info=True,
            )
            return SummarizationStatus.FAILED

    async def save_to_file(self, file_path: str | Path) -> None:
        """
        Save accumulated bookmarks to JSON file.

        Args:
            file_path: Path to save JSON file

        Raises:
            BookmarkProcessorError: If file save fails
        """
        try:
            file_path = Path(file_path)
            file_path.parent.mkdir(parents=True, exist_ok=True)

            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "platform": "TWITTER",
                        "bookmarks": self.accumulated_bookmarks,
                        "total": len(self.accumulated_bookmarks),
                    },
                    f,
                    indent=2,
                    ensure_ascii=False,
                )

            logger.info(f"Saved {len(self.accumulated_bookmarks)} bookmarks to {file_path}")

        except Exception as e:
            error_msg = f"Failed to save bookmarks to file: {e}"
            logger.error(error_msg, exc_info=True)
            raise BookmarkProcessorError(error_msg) from e

    def get_accumulated_count(self) -> int:
        """
        Get count of accumulated bookmarks.

        Returns:
            Number of accumulated bookmarks
        """
        return len(self.accumulated_bookmarks)

    def clear_accumulated(self) -> None:
        """Clear accumulated bookmarks."""
        self.accumulated_bookmarks.clear()
