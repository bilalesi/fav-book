"""Pydantic models for API validation."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CrawlStartRequest(BaseModel):
    """Request model for starting a crawl."""

    userId: str = Field(..., min_length=1, description="User ID")
    directImport: bool = Field(default=True, description="Whether to import directly to database")
    enableSummarization: bool = Field(
        default=False, description="Whether to enable AI summarization"
    )


class CrawlProgressUpdate(BaseModel):
    """Model for progress updates sent via SSE."""

    type: str = Field(..., description="Type of update: 'progress', 'complete', or 'error'")
    bookmarksProcessed: int = Field(..., ge=0, description="Number of bookmarks processed")
    currentBookmark: Optional[dict] = Field(None, description="Current bookmark being processed")
    summarizationStatus: Optional[str] = Field(
        None,
        description="Status of AI summarization: 'pending', 'processing', 'completed', 'failed', 'skipped'",
    )
    error: Optional[str] = Field(None, description="Error message if type is 'error'")


class CheckpointResponse(BaseModel):
    """Response model for checkpoint data."""

    lastTweetId: Optional[str] = Field(None, description="Last processed tweet ID")
    lastCrawledAt: Optional[datetime] = Field(None, description="Timestamp of last crawl")
    bookmarksCount: int = Field(default=0, ge=0, description="Total bookmarks processed")


class CrawlStartResponse(BaseModel):
    """Response model for starting a crawl."""

    sessionId: str = Field(..., description="Unique session ID for this crawl")
    status: str = Field(default="started", description="Status of the crawl")


class CrawlStopResponse(BaseModel):
    """Response model for stopping a crawl."""

    status: str = Field(..., description="Status after stopping")
    bookmarksProcessed: int = Field(
        ..., ge=0, description="Number of bookmarks processed before stopping"
    )
