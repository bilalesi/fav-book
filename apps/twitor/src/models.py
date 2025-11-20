"""SQLAlchemy models for the Twitor service."""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class TwitterCrawlCheckpoint(Base):
    """Model for storing Twitter crawl checkpoints."""

    __tablename__ = "twitter_crawl_checkpoint"
    __table_args__ = {"schema": "crawler"}

    user_id = Column(String(255), primary_key=True)
    last_tweet_id = Column(String(255), nullable=False)
    last_crawled_at = Column(DateTime, nullable=False)
    bookmarks_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CrawlSession(Base):
    """Model for tracking crawl sessions."""

    __tablename__ = "crawl_session"
    __table_args__ = {"schema": "crawler"}

    session_id = Column(String(255), primary_key=True)
    user_id = Column(String(255), nullable=False)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
    status = Column(String(50), default="running")
    bookmarks_processed = Column(Integer, default=0)
    direct_import = Column(Boolean, nullable=False)
    enable_summarization = Column(Boolean, nullable=False)
    output_file_path = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
