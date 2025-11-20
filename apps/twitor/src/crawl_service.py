"""Crawl orchestration service for managing Twitter bookmark crawling sessions."""

import asyncio
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .bookmark_processor import BookmarkProcessor
from .checkpoint_manager import CheckpointManager
from .config import get_settings
from .error_handler import (
    DatabaseError,
    ErrorAction,
    ErrorContext,
    ErrorHandler,
    FatalError,
)
from .error_handler import (
    ValidationError as ErrorValidationError,
)
from .models import CrawlSession
from .progress_streamer import create_streamer, remove_streamer
from .queue_manager import QueueManager
from .schemas import CrawlStartRequest, CrawlStartResponse, CrawlStopResponse
from .twitter_client import (
    AuthenticationError,
    NetworkError,
    RateLimitError,
    TwitterClient,
)

logger = logging.getLogger(__name__)


class CrawlServiceError(Exception):
    """Base exception for crawl service errors."""

    pass


class ConcurrentCrawlError(CrawlServiceError):
    """Raised when attempting to start a crawl while one is already running."""

    pass


class RequestValidationError(CrawlServiceError):
    """Raised when request validation fails."""

    pass


class CrawlService:
    """Service for orchestrating Twitter bookmark crawling operations."""

    def __init__(self, db_session: AsyncSession, queue_manager: QueueManager | None = None):
        """
        Initialize crawl service.

        Args:
            db_session: Async SQLAlchemy session for database operations
            queue_manager: Optional queue manager for distributed task processing
        """
        self.db_session = db_session
        self.settings = get_settings()
        self.queue_manager = queue_manager
        self._active_crawls: dict[str, asyncio.Task] = {}

    async def start_crawl(self, request: CrawlStartRequest) -> CrawlStartResponse:
        """
        Start a new crawling session.

        Args:
            request: Crawl start request with user ID and options

        Returns:
            CrawlStartResponse with session ID

        Raises:
            ValidationError: If request validation fails
            ConcurrentCrawlError: If a crawl is already running for this user
        """
        # Validate request
        if not request.userId or not request.userId.strip():
            raise RequestValidationError("userId is required and cannot be empty")

        user_id = request.userId.strip()

        # Check for concurrent crawls
        if await self._is_crawl_running(user_id):
            raise ConcurrentCrawlError(
                f"A crawl is already in progress for user {user_id}. "
                "Please wait for it to complete or stop it before starting a new one."
            )

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Create crawl session in database
        crawl_session = CrawlSession(
            session_id=session_id,
            user_id=user_id,
            started_at=datetime.utcnow(),
            status="running",
            bookmarks_processed=0,
            direct_import=request.directImport,
            enable_summarization=request.enableSummarization,
        )
        self.db_session.add(crawl_session)
        await self.db_session.commit()

        logger.info(
            f"Starting crawl session {session_id} for user {user_id} "
            f"(direct_import={request.directImport}, summarization={request.enableSummarization})"
        )

        # Create progress streamer
        create_streamer(session_id)

        # Start crawl in background
        task = asyncio.create_task(
            self._run_crawl(
                session_id=session_id,
                user_id=user_id,
                direct_import=request.directImport,
                enable_summarization=request.enableSummarization,
            )
        )
        self._active_crawls[session_id] = task

        # Add callback to clean up when task completes
        task.add_done_callback(lambda t: self._cleanup_crawl(session_id))

        return CrawlStartResponse(
            sessionId=session_id,
            status="started",
        )

    async def stop_crawl(self, session_id: str) -> CrawlStopResponse:
        """
        Stop an active crawling session.

        Args:
            session_id: Session ID to stop

        Returns:
            CrawlStopResponse with final status

        Raises:
            CrawlServiceError: If session not found or already stopped
        """
        # Check if crawl is active
        task = self._active_crawls.get(session_id)
        if not task:
            raise CrawlServiceError(f"No active crawl found with session ID: {session_id}")

        # Cancel the task
        task.cancel()

        try:
            await task
        except asyncio.CancelledError:
            logger.info(f"Crawl session {session_id} cancelled successfully")

        # Get final session state from database
        stmt = select(CrawlSession).where(CrawlSession.session_id == session_id)
        result = await self.db_session.execute(stmt)
        crawl_session = result.scalar_one_or_none()

        if crawl_session:
            crawl_session.status = "stopped"
            crawl_session.completed_at = datetime.utcnow()
            await self.db_session.commit()

            return CrawlStopResponse(
                status="stopped",
                bookmarksProcessed=crawl_session.bookmarks_processed,
            )
        else:
            return CrawlStopResponse(
                status="stopped",
                bookmarksProcessed=0,
            )

    async def _is_crawl_running(self, user_id: str) -> bool:
        """
        Check if a crawl is currently running for a user.

        Args:
            user_id: User ID to check

        Returns:
            True if a crawl is running, False otherwise
        """
        # Check database for running sessions
        stmt = (
            select(CrawlSession)
            .where(CrawlSession.user_id == user_id)
            .where(CrawlSession.status == "running")
        )
        result = await self.db_session.execute(stmt)
        db_session = result.scalar_one_or_none()

        if db_session:
            # Verify the session is actually active in memory
            if db_session.session_id in self._active_crawls:
                task = self._active_crawls[db_session.session_id]
                if not task.done():
                    return True

            # Session in DB but not active - mark as failed
            db_session.status = "failed"
            db_session.completed_at = datetime.utcnow()
            db_session.error_message = "Session was interrupted"
            await self.db_session.commit()

        return False

    async def _run_crawl(
        self,
        session_id: str,
        user_id: str,
        direct_import: bool,
        enable_summarization: bool,
    ) -> None:
        """
        Main crawl loop - runs in background.

        Args:
            session_id: Unique session identifier
            user_id: User ID for the crawl
            direct_import: Whether to import directly to database
            enable_summarization: Whether to enable AI summarization
        """
        streamer = create_streamer(session_id)
        checkpoint_manager = CheckpointManager(self.db_session, user_id)
        error_handler = ErrorHandler(
            checkpoint_manager=checkpoint_manager,
            max_retries=5,
            initial_backoff=1.0,
        )
        bookmark_processor: Optional[BookmarkProcessor] = None
        twitter_client: Optional[TwitterClient] = None
        last_tweet_id: Optional[str] = None

        try:
            # Initialize Twitter client
            twitter_client = TwitterClient(
                username=self.settings.twitter_username,
                password=self.settings.twitter_password,
                email=self.settings.twitter_email,
            )

            # Authenticate
            logger.info(f"Authenticating Twitter client for session {session_id}")
            await twitter_client.authenticate()

            # Get checkpoint
            checkpoint = await checkpoint_manager.get_checkpoint()
            since_id = checkpoint.last_tweet_id if checkpoint else None

            if since_id:
                logger.info(f"Resuming from checkpoint: {since_id}")
            else:
                logger.info("Starting fresh crawl (no checkpoint)")

            # Initialize bookmark processor
            bookmark_processor = BookmarkProcessor(
                user_id=user_id,
                direct_import=direct_import,
                enable_summarization=enable_summarization,
                session_id=session_id,
            )

            # Fetch and process bookmarks
            bookmarks_processed = 0

            async for bookmark in twitter_client.get_bookmarks(
                since_id=since_id,
                max_results=self.settings.batch_size,
            ):
                retry_count = 0
                processing_success = False

                # Retry loop for processing individual bookmarks
                while retry_count <= error_handler.max_retries and not processing_success:
                    try:
                        # Process bookmark
                        result = await bookmark_processor.process_bookmark(bookmark)

                        if result.success:
                            bookmarks_processed += 1
                            last_tweet_id = bookmark.tweet_id
                            processing_success = True

                            # Update checkpoint periodically (every 10 bookmarks)
                            if bookmarks_processed % 10 == 0:
                                await checkpoint_manager.save_checkpoint(
                                    tweet_id=last_tweet_id,
                                    bookmarks_count=bookmarks_processed,
                                )

                            # Send progress update with summarization status
                            await streamer.send_progress(
                                bookmarks_processed=bookmarks_processed,
                                current_bookmark={
                                    "tweetId": bookmark.tweet_id,
                                    "text": bookmark.text[:100],  # Truncate for progress
                                    "author": bookmark.author_username,
                                },
                                summarization_status=result.summarization_status,
                            )

                            logger.debug(
                                f"Processed bookmark {bookmarks_processed}: {bookmark.tweet_id} "
                                f"(summarization: {result.summarization_status})"
                            )
                        else:
                            # Processing failed - handle error
                            error_context = ErrorContext(
                                error=DatabaseError(result.error or "Unknown error"),
                                retry_count=retry_count,
                                last_processed_id=last_tweet_id,
                                session_id=session_id,
                                user_id=user_id,
                                operation="process_bookmark",
                            )

                            strategy = await error_handler.handle_error(error_context)

                            if strategy.action == ErrorAction.SKIP:
                                # Skip this bookmark and continue
                                logger.warning(
                                    f"Skipping bookmark {bookmark.tweet_id}: {result.error}"
                                )
                                processing_success = True  # Mark as "handled"
                                break
                            elif strategy.action == ErrorAction.RETRY:
                                # Retry processing
                                retry_count += 1
                                await asyncio.sleep(strategy.delay)
                            else:
                                # Abort or other action
                                raise DatabaseError(result.error or "Processing failed")

                    except DatabaseError as e:
                        # Handle database errors with error handler
                        error_context = ErrorContext(
                            error=e,
                            retry_count=retry_count,
                            last_processed_id=last_tweet_id,
                            session_id=session_id,
                            user_id=user_id,
                            operation="process_bookmark",
                        )

                        strategy = await error_handler.handle_error(error_context)

                        if strategy.action == ErrorAction.SKIP:
                            logger.warning(
                                f"Skipping bookmark {bookmark.tweet_id} after error: {e}"
                            )
                            processing_success = True  # Mark as handled
                            break
                        elif strategy.action == ErrorAction.RETRY:
                            retry_count += 1
                            await asyncio.sleep(strategy.delay)
                        else:
                            # Fatal error - re-raise
                            raise

                    except Exception as e:
                        # Unexpected error during processing
                        logger.error(
                            f"Unexpected error processing bookmark {bookmark.tweet_id}: {e}"
                        )
                        error_context = ErrorContext(
                            error=e,
                            retry_count=retry_count,
                            last_processed_id=last_tweet_id,
                            session_id=session_id,
                            user_id=user_id,
                            operation="process_bookmark",
                        )

                        strategy = await error_handler.handle_error(error_context)

                        if strategy.action == ErrorAction.SKIP:
                            processing_success = True
                            break
                        elif strategy.action == ErrorAction.ABORT:
                            raise
                        else:
                            retry_count += 1
                            if strategy.delay > 0:
                                await asyncio.sleep(strategy.delay)

            # Save final checkpoint
            if last_tweet_id:
                await checkpoint_manager.save_checkpoint(
                    tweet_id=last_tweet_id,
                    bookmarks_count=bookmarks_processed,
                )

            # Handle file export if not direct import
            output_file_path: Optional[str] = None
            if not direct_import and bookmarks_processed > 0:
                output_dir = Path(self.settings.output_dir)
                output_file_path = str(output_dir / f"{session_id}.json")
                await bookmark_processor.save_to_file(output_file_path)
                logger.info(f"Saved {bookmarks_processed} bookmarks to {output_file_path}")

            # Update session in database
            stmt = select(CrawlSession).where(CrawlSession.session_id == session_id)
            result = await self.db_session.execute(stmt)
            crawl_session = result.scalar_one_or_none()

            if crawl_session:
                crawl_session.status = "completed"
                crawl_session.completed_at = datetime.utcnow()
                crawl_session.bookmarks_processed = bookmarks_processed
                crawl_session.output_file_path = output_file_path
                await self.db_session.commit()

            # Send completion message
            await streamer.send_complete(
                total_processed=bookmarks_processed,
                file_path=output_file_path,
            )

            logger.info(
                f"Crawl session {session_id} completed successfully. "
                f"Processed {bookmarks_processed} bookmarks."
            )

        except asyncio.CancelledError:
            logger.info(f"Crawl session {session_id} was cancelled")
            await streamer.send_error("Crawl was stopped by user")

            # Save checkpoint on cancellation
            if last_tweet_id:
                try:
                    await checkpoint_manager.save_checkpoint(tweet_id=last_tweet_id)
                    logger.info(f"Checkpoint saved on cancellation: {last_tweet_id}")
                except Exception as e:
                    logger.error(f"Failed to save checkpoint on cancellation: {e}")
            raise

        except (AuthenticationError, RateLimitError, NetworkError, DatabaseError, FatalError) as e:
            # Handle known errors with error handler
            error_context = ErrorContext(
                error=e,
                retry_count=0,
                last_processed_id=last_tweet_id,
                session_id=session_id,
                user_id=user_id,
                operation="crawl_session",
            )

            strategy = await error_handler.handle_error(error_context)
            error_msg = strategy.message or str(e)

            logger.error(f"Session {session_id}: {error_msg}")
            await streamer.send_error(error_msg)
            await self._mark_session_failed(session_id, error_msg)

            # Execute recovery strategy (save checkpoint if needed)
            await error_handler.execute_recovery_strategy(strategy, error_context)

        except Exception as e:
            # Unexpected error - treat as fatal
            error_context = ErrorContext(
                error=e,
                retry_count=0,
                last_processed_id=last_tweet_id,
                session_id=session_id,
                user_id=user_id,
                operation="crawl_session",
            )

            strategy = await error_handler.handle_error(error_context)
            error_msg = f"Unexpected error: {str(e)}"

            logger.error(f"Session {session_id}: {error_msg}", exc_info=True)
            await streamer.send_error(error_msg)
            await self._mark_session_failed(session_id, error_msg)

            # Graceful shutdown on fatal error
            await error_handler.graceful_shutdown(
                error_context,
                cleanup_tasks=[
                    bookmark_processor.close() if bookmark_processor else None,
                ],
            )

        finally:
            # Cleanup
            if bookmark_processor:
                await bookmark_processor.close()

            await remove_streamer(session_id)
            logger.info(f"Cleanup completed for session {session_id}")

    async def _mark_session_failed(self, session_id: str, error_message: str) -> None:
        """
        Mark a session as failed in the database.

        Args:
            session_id: Session ID to mark as failed
            error_message: Error message to store
        """
        try:
            stmt = select(CrawlSession).where(CrawlSession.session_id == session_id)
            result = await self.db_session.execute(stmt)
            crawl_session = result.scalar_one_or_none()

            if crawl_session:
                crawl_session.status = "failed"
                crawl_session.completed_at = datetime.utcnow()
                crawl_session.error_message = error_message
                await self.db_session.commit()
        except Exception as e:
            logger.error(f"Failed to mark session {session_id} as failed: {e}")

    def _cleanup_crawl(self, session_id: str) -> None:
        """
        Cleanup callback when crawl task completes.

        Args:
            session_id: Session ID to clean up
        """
        if session_id in self._active_crawls:
            del self._active_crawls[session_id]
            logger.info(f"Removed session {session_id} from active crawls")

    async def get_active_sessions(self) -> list[CrawlSession]:
        """
        Get all active crawl sessions.

        Returns:
            List of active CrawlSession objects
        """
        stmt = select(CrawlSession).where(CrawlSession.status == "running")
        result = await self.db_session.execute(stmt)
        return list(result.scalars().all())
