"""Crawl management routes."""

import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.schemas import CrawlStartRequest
from src.core.database import get_db_session
from src.core.database.models import CrawlSession
from src.services.crawl_service import (
    ConcurrentCrawlError,
    CrawlService,
    CrawlServiceError,
    ValidationError,
)
from src.services.progress_streamer import get_streamer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crawl", tags=["crawl"])


@router.post("/start")
async def start_crawl(
    request: CrawlStartRequest,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    Start a new crawling session.

    Args:
        request: Crawl start request with user ID and options
        db: Database session

    Returns:
        Response with session ID and status

    Raises:
        HTTPException: If validation fails or concurrent crawl detected
    """
    try:
        crawl_service = CrawlService(db)
        response = await crawl_service.start_crawl(request)

        return {
            "session_id": response.session_id,
            "status": response.status,
        }

    except ValidationError as e:
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

    except ConcurrentCrawlError as e:
        logger.warning(f"Concurrent crawl error: {e}")
        raise HTTPException(status_code=409, detail=str(e))

    except Exception as e:
        logger.error(f"Failed to start crawl: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to start crawl: {str(e)}")


@router.post("/stop/{session_id}")
async def stop_crawl(
    session_id: str,
    db: AsyncSession = Depends(get_db_session),
) -> dict:
    """
    Stop an active crawling session.

    Args:
        session_id: Session ID to stop
        db: Database session

    Returns:
        Response with final status

    Raises:
        HTTPException: If session not found
    """
    try:
        crawl_service = CrawlService(db)
        response = await crawl_service.stop_crawl(session_id)

        return {
            "status": response.status,
            "bookmarks_processed": response.bookmarks_processed,
        }

    except CrawlServiceError as e:
        logger.warning(f"Stop crawl error: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Failed to stop crawl: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop crawl: {str(e)}")


@router.get("/progress/{session_id}")
async def get_crawl_progress(session_id: str, request: Request):
    """
    SSE endpoint for streaming crawl progress updates.

    Args:
        session_id: Unique session identifier
        request: FastAPI request object

    Returns:
        EventSourceResponse streaming progress updates

    Raises:
        HTTPException: If session not found
    """
    streamer = get_streamer(session_id)
    if not streamer:
        raise HTTPException(
            status_code=404,
            detail=f"No active crawl session found with ID: {session_id}",
        )

    logger.info(f"Client connected to progress stream for session {session_id}")
    return await streamer.stream_events(request)


@router.get("/download/{session_id}")
async def download_crawl_file(
    session_id: str,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Download the JSON file for a completed crawl session.

    Args:
        session_id: Unique session identifier
        db: Database session

    Returns:
        FileResponse with the JSON file

    Raises:
        HTTPException: If session not found, file not available, or other errors
    """
    try:
        # Get session from database
        stmt = select(CrawlSession).where(CrawlSession.session_id == session_id)
        result = await db.execute(stmt)
        crawl_session = result.scalar_one_or_none()

        if not crawl_session:
            raise HTTPException(
                status_code=404,
                detail=f"Crawl session not found with ID: {session_id}",
            )

        # Check if session has an output file
        if not crawl_session.output_file_path:
            raise HTTPException(
                status_code=400,
                detail="No file available for this session. "
                "This session may not have enabled file export.",
            )

        # Check if file exists
        file_path = Path(crawl_session.output_file_path)
        if not file_path.exists():
            logger.error(f"Output file not found: {file_path}")
            raise HTTPException(
                status_code=404,
                detail="Output file not found. It may have been deleted.",
            )

        logger.info(f"Serving download for session {session_id}: {file_path}")

        # Return file with proper headers
        return FileResponse(
            path=str(file_path),
            media_type="application/json",
            filename=f"twitter_bookmarks_{session_id}.json",
            headers={
                "Content-Disposition": f'attachment; filename="twitter_bookmarks_{session_id}.json"'
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file for session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {str(e)}",
        )
