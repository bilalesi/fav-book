"""Main FastAPI application for Twitor service."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes import crawl, health
from src.core.config import get_settings
from src.core.database import close_db_connection

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
    description="Simplified Twitter bookmark crawler service",
    version="2.0.0",
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

# Include routers
app.include_router(health.router)
app.include_router(crawl.router)


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
