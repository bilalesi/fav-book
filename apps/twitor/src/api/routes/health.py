"""Health check routes."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
async def root() -> dict[str, str]:
    """Root endpoint - health check."""
    return {
        "service": "Twitor",
        "version": "2.0.0",
        "status": "running",
    }


@router.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "twitor",
    }
