"""Pydantic models for request/response validation."""

from dataclasses import dataclass
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


@dataclass
class CrawlerDependencies:
    """Dependencies for the crawler agent."""

    url: str
    markdown_content: str


class CrawlRequest(BaseModel):
    """Request model for crawling a URL."""

    url: HttpUrl = Field(..., description="The URL to crawl and extract information from")


class ExtractedLink(BaseModel):
    """Model for an extracted link with metadata."""

    url: str = Field(..., description="The URL of the link")
    title: Optional[str] = Field(None, description="Title or description of the link")
    link_type: str = Field(
        ...,
        description="Type of link (github, article, twitter, youtube, documentation, etc.)",
    )
    relevance: Optional[str] = Field(
        None, description="Why this link is important in context"
    )


class ExtractedMedia(BaseModel):
    """Model for extracted media (images/videos)."""

    url: str = Field(..., description="URL of the media")
    media_type: str = Field(..., description="Type of media (image, video)")
    caption: Optional[str] = Field(None, description="Caption or description")
    context: Optional[str] = Field(
        None, description="Context about why this media is important"
    )


class CrawlResult(BaseModel):
    """Complete result from crawling and extracting information."""

    url: str = Field(..., description="The original URL that was crawled")
    markdown_content: str = Field(..., description="Extracted markdown content")
    summary: str = Field(..., description="AI-generated summary of the content")
    important_links: list[ExtractedLink] = Field(
        default_factory=list, description="List of important extracted links"
    )
    media: list[ExtractedMedia] = Field(
        default_factory=list, description="List of important media items"
    )
    keywords: list[str] = Field(
        default_factory=list, description="Key topics and keywords from the content"
    )
