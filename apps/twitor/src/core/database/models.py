"""SQLAlchemy models for the Twitor service."""

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


class TwitterCrawlCheckpoint(Base):
    """Model for storing Twitter crawl checkpoints."""

    __tablename__ = "twitter_crawl_checkpoint"
    __table_args__ = {"schema": "crawler"}

    user_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    last_tweet_id: Mapped[str] = mapped_column(String(255))
    last_crawled_at: Mapped[datetime] = mapped_column()
    bookmarks_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())


class CrawlSession(Base):
    """Model for tracking crawl sessions."""

    __tablename__ = "crawl_session"
    __table_args__ = {"schema": "crawler"}

    session_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(255))
    started_at: Mapped[datetime] = mapped_column(server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="running")
    bookmarks_processed: Mapped[int] = mapped_column(default=0)
    save_to_database: Mapped[bool] = mapped_column(default=True)
    export_to_file: Mapped[bool] = mapped_column(default=False)
    output_file_path: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
