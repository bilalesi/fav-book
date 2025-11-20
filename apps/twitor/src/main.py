"""Main FastAPI application for Twitor service."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .crawl_service import (
    ConcurrentCrawlError,
    CrawlService,
    CrawlServiceError,
    ValidationError,
)
from .database import close_db_connection, get_db_session
from .progress_streamer import get_streamer
from .schemas import CrawlStartRequest

settings = get_settings()

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifespan events."""
    logger.info("Starting Twitor service...")
    logger.info(f"Service running on {settings.twitor_host}:{settings.twitor_port}")
    db_info = (
        settings.database_url.split("@")[1] if "@" in settings.database_url else "Not configured"
    )
    logger.info(f"Database URL: {db_info}")
    logger.info(f"API Base URL: {settings.api_base_url}")

    yield

    logger.info("Shutting down Twitor service...")
    await close_db_connection()
    logger.info("Database connections closed")


# Create FastAPI application
app = FastAPI(
    title="Twitor",
    description="Twitter bookmark crawler service using twikit",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint - health check."""
    return {
        "service": "Twitor",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "twitor",
    }


@app.post("/api/crawl/start")
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
            "sessionId": response.sessionId,
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


@app.post("/api/crawl/stop/{session_id}")
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
            "bookmarksProcessed": response.bookmarksProcessed,
        }

    except CrawlServiceError as e:
        logger.warning(f"Stop crawl error: {e}")
        raise HTTPException(status_code=404, detail=str(e))

    except Exception as e:
        logger.error(f"Failed to stop crawl: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop crawl: {str(e)}")


@app.get("/api/crawl/progress/{session_id}")
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


@app.get("/api/crawl/download/{session_id}")
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
    from pathlib import Path

    from fastapi.responses import FileResponse
    from sqlalchemy import select

    from .models import CrawlSession

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
                "This session may have used direct import mode.",
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
            background=_cleanup_file_task(file_path),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download file for session {session_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download file: {str(e)}",
        )


def _cleanup_file_task(file_path):
    """
    Create a background task to clean up the file after download.

    Args:
        file_path: Path to the file to delete

    Returns:
        Callable that deletes the file
    """
    from pathlib import Path

    def cleanup():
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                logger.info(f"Cleaned up file: {file_path}")
        except Exception as e:
            logger.error(f"Failed to clean up file {file_path}: {e}")

    return cleanup


@app.exception_handler(Exception)
async def global_exception_handler(request: object, exc: Exception) -> JSONResponse:
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.twitor_host,
        port=settings.twitor_port,
        reload=True,
    )
