"""Progress streaming module for real-time crawl updates via SSE."""

import asyncio
import json
import logging
from typing import Any

from fastapi import Request
from sse_starlette.sse import EventSourceResponse

from .schemas import CrawlProgressUpdate

logger = logging.getLogger(__name__)


class ProgressStreamer:
    """Manages SSE connections and sends progress updates to clients."""

    def __init__(self, session_id: str):
        """
        Initialize progress streamer for a crawl session.

        Args:
            session_id: Unique identifier for the crawl session
        """
        self.session_id = session_id
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._closed = False
        logger.info(f"ProgressStreamer initialized for session {session_id}")

    async def send_progress(
        self,
        bookmarks_processed: int,
        current_bookmark: dict | None = None,
        summarization_status: str | None = None,
    ) -> None:
        """
        Send a progress update to connected clients.

        Args:
            bookmarks_processed: Number of bookmarks processed so far
            current_bookmark: Optional dict containing current bookmark data
            summarization_status: Optional status of AI summarization
        """
        if self._closed:
            logger.warning(f"Attempted to send progress on closed streamer {self.session_id}")
            return

        update = CrawlProgressUpdate(
            type="progress",
            bookmarksProcessed=bookmarks_processed,
            currentBookmark=current_bookmark,
            summarizationStatus=summarization_status,
            error=None,
        )

        await self._send_update(update.model_dump())
        logger.debug(
            f"Progress update sent for session {self.session_id}: {bookmarks_processed} bookmarks"
        )

    async def send_complete(
        self,
        total_processed: int,
        file_path: str | None = None,
    ) -> None:
        """
        Send a completion message indicating the crawl finished successfully.

        Args:
            total_processed: Total number of bookmarks processed
            file_path: Optional path to the output file if direct import was disabled
        """
        if self._closed:
            logger.warning(f"Attempted to send completion on closed streamer {self.session_id}")
            return

        update = CrawlProgressUpdate(
            type="complete",
            bookmarksProcessed=total_processed,
            currentBookmark={"filePath": file_path} if file_path else None,
            error=None,
        )

        await self._send_update(update.model_dump())
        logger.info(f"Completion message sent for session {self.session_id}")

        # Close the stream after sending completion
        await self.close()

    async def send_error(self, error: str) -> None:
        """
        Send an error message to connected clients.

        Args:
            error: Error message to send
        """
        if self._closed:
            logger.warning(f"Attempted to send error on closed streamer {self.session_id}")
            return

        update = CrawlProgressUpdate(
            type="error",
            bookmarksProcessed=0,
            currentBookmark=None,
            error=error,
        )

        await self._send_update(update.model_dump())
        logger.error(f"Error message sent for session {self.session_id}: {error}")

        # Close the stream after sending error
        await self.close()

    async def _send_update(self, data: dict[str, Any]) -> None:
        """
        Internal method to queue an update for sending.

        Args:
            data: Update data to send
        """
        try:
            await self.queue.put(data)
        except Exception as e:
            logger.error(f"Failed to queue update for session {self.session_id}: {e}")

    async def close(self) -> None:
        """Close the progress streamer and clean up resources."""
        if not self._closed:
            self._closed = True
            # Send a sentinel value to signal the stream to close
            await self.queue.put(None)
            logger.info(f"ProgressStreamer closed for session {self.session_id}")

    async def stream_events(self, request: Request) -> EventSourceResponse:
        """
        Create an SSE stream for the client to consume.

        Args:
            request: FastAPI request object for connection management

        Returns:
            EventSourceResponse that streams progress updates
        """

        async def event_generator():
            """Generate SSE events from the queue."""
            try:
                while not self._closed:
                    # Check if client disconnected
                    if await request.is_disconnected():
                        logger.info(f"Client disconnected from session {self.session_id}")
                        break

                    try:
                        # Wait for updates with timeout to check for disconnection
                        data = await asyncio.wait_for(self.queue.get(), timeout=1.0)

                        # None is our sentinel value for stream closure
                        if data is None:
                            logger.info(f"Stream closing for session {self.session_id}")
                            break

                        # Yield the SSE event
                        yield {
                            "event": "message",
                            "data": json.dumps(data),
                        }

                    except TimeoutError:
                        # No data available, continue loop to check for disconnection
                        continue

            except Exception as e:
                logger.error(f"Error in event generator for session {self.session_id}: {e}")
                # Send error event before closing
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)}),
                }
            finally:
                # Ensure cleanup
                await self.close()

        return EventSourceResponse(event_generator())


# Global registry to manage active streamers
_active_streamers: dict[str, ProgressStreamer] = {}


def create_streamer(session_id: str) -> ProgressStreamer:
    """
    Create and register a new progress streamer.

    Args:
        session_id: Unique session identifier

    Returns:
        New ProgressStreamer instance
    """
    if session_id in _active_streamers:
        logger.warning(f"Streamer already exists for session {session_id}, returning existing")
        return _active_streamers[session_id]

    streamer = ProgressStreamer(session_id)
    _active_streamers[session_id] = streamer
    logger.info(f"Created new streamer for session {session_id}")
    return streamer


def get_streamer(session_id: str) -> ProgressStreamer | None:
    """
    Get an existing progress streamer by session ID.

    Args:
        session_id: Session identifier

    Returns:
        ProgressStreamer if found, None otherwise
    """
    return _active_streamers.get(session_id)


async def remove_streamer(session_id: str) -> None:
    """
    Remove and clean up a progress streamer.

    Args:
        session_id: Session identifier
    """
    streamer = _active_streamers.pop(session_id, None)
    if streamer:
        await streamer.close()
        logger.info(f"Removed streamer for session {session_id}")
