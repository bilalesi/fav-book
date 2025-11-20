"""Pydantic models for API validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class CrawlStartRequest(BaseModel):
    """Request model for starting a crawl."""

    user_id: str = Field(..., min_length=1, description="User ID")
    save_to_database: bool = Field(default=True, description="Whether to save directly to database")
    export_to_file: bool = Field(default=False, description="Whether to export to JSON file")


class CrawlProgressUpdate(BaseModel):
    """Model for progress updates sent via SSE."""

    type: str = Field(..., description="Type of update: 'progress', 'complete', or 'error'")
    bookmarks_processed: int = Field(..., ge=0, description="Number of bookmarks processed")
    current_bookmark: dict | None = Field(None, description="Current bookmark being processed")
    error: str | None = Field(None, description="Error message if type is 'error'")


class CheckpointResponse(BaseModel):
    """Response model for checkpoint data."""

    last_tweet_id: str | None = Field(None, description="Last processed tweet ID")
    last_crawled_at: datetime | None = Field(None, description="Timestamp of last crawl")
    bookmarks_count: int = Field(default=0, ge=0, description="Total bookmarks processed")


class CrawlStartResponse(BaseModel):
    """Response model for starting a crawl."""

    session_id: str = Field(..., description="Unique session ID for this crawl")
    status: str = Field(default="started", description="Status of the crawl")


class CrawlStopResponse(BaseModel):
    """Response model for stopping a crawl."""

    status: str = Field(..., description="Status after stopping")
    bookmarks_processed: int = Field(
        ..., ge=0, description="Number of bookmarks processed before stopping"
    )
