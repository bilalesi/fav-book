"""Twitter client module for fetching bookmarks using twikit."""

import asyncio
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from twikit import Client
from twikit.errors import (
    BadRequest,
    Forbidden,
    NotFound,
    RateLimitExceeded,
    ServerError,
    TooManyRequests,
    Unauthorized,
)

logger = logging.getLogger(__name__)


@dataclass
class TwitterMedia:
    """Represents media attached to a tweet."""

    media_type: str  # 'photo', 'video', 'animated_gif'
    url: str
    thumbnail_url: str | None = None


@dataclass
class TwitterBookmark:
    """Represents a Twitter bookmark."""

    tweet_id: str
    tweet_url: str
    text: str
    author_name: str
    author_username: str
    author_profile_url: str
    created_at: datetime
    media: list[TwitterMedia]
    metadata: dict[str, Any]


class TwitterClientError(Exception):
    """Base exception for Twitter client errors."""

    pass


class AuthenticationError(TwitterClientError):
    """Raised when authentication fails."""

    pass


class RateLimitError(TwitterClientError):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str, retry_after_seconds: int = 900):
        """Initialize rate limit error with retry time."""
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class NetworkError(TwitterClientError):
    """Raised when network errors occur."""

    pass


class TwitterClient:
    """Client for interacting with Twitter API via twikit."""

    def __init__(
        self,
        username: str,
        password: str,
        email: str,
        max_retries: int = 5,
        initial_backoff: float = 1.0,
    ):
        """
        Initialize Twitter client.

        Args:
            username: Twitter username
            password: Twitter password
            email: Twitter email
            max_retries: Maximum number of retry attempts for network errors
            initial_backoff: Initial backoff time in seconds for exponential backoff
        """
        self.username = username
        self.password = password
        self.email = email
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff
        self.client: Client | None = None
        self._authenticated = False

    async def authenticate(self) -> bool:
        """
        Authenticate with Twitter.

        Returns:
            True if authentication successful

        Raises:
            AuthenticationError: If authentication fails
        """
        if self._authenticated and self.client:
            return True

        try:
            logger.info(f"Authenticating with Twitter as {self.username}")
            self.client = Client("en-US")

            # Attempt login with retry logic for network errors
            await self._retry_with_backoff(
                self.client.login,
                auth_info_1=self.username,
                auth_info_2=self.email,
                password=self.password,
            )

            self._authenticated = True
            logger.info("Successfully authenticated with Twitter")
            return True

        except (Unauthorized, Forbidden) as e:
            error_msg = f"Authentication failed: Invalid credentials - {str(e)}"
            logger.error(error_msg)
            raise AuthenticationError(error_msg) from e
        except Exception as e:
            error_msg = f"Authentication failed: {str(e)}"
            logger.error(error_msg)
            raise AuthenticationError(error_msg) from e

    async def get_bookmarks(
        self,
        since_id: str | None = None,
        max_results: int = 100,
    ) -> AsyncIterator[TwitterBookmark]:
        """
        Fetch bookmarks with pagination.

        Args:
            since_id: Only fetch bookmarks newer than this tweet ID
            max_results: Maximum number of bookmarks to fetch per page

        Yields:
            TwitterBookmark objects

        Raises:
            AuthenticationError: If not authenticated
            RateLimitError: If rate limit is exceeded
            NetworkError: If network errors occur after retries
        """
        if not self._authenticated or not self.client:
            raise AuthenticationError("Client not authenticated. Call authenticate() first.")

        logger.info(f"Fetching bookmarks (since_id={since_id}, max_results={max_results})")

        try:
            cursor = None
            total_fetched = 0

            while True:
                # Fetch a page of bookmarks with retry logic
                try:
                    bookmarks_response = await self._retry_with_backoff(
                        self.client.get_bookmarks,
                        count=max_results,
                        cursor=cursor,
                    )
                except RateLimitError:
                    # Re-raise rate limit errors without retry
                    raise
                except Exception as e:
                    logger.error(f"Failed to fetch bookmarks page: {e}")
                    raise NetworkError(f"Failed to fetch bookmarks: {str(e)}") from e

                if not bookmarks_response:
                    logger.info("No more bookmarks to fetch")
                    break

                # Process tweets from the response
                tweets = getattr(bookmarks_response, "tweets", []) or []
                if not tweets:
                    logger.info("No tweets in response, ending pagination")
                    break

                for tweet in tweets:
                    # Skip if we've reached the since_id checkpoint
                    if since_id and tweet.id <= since_id:
                        logger.info(f"Reached checkpoint tweet {since_id}, stopping")
                        return

                    # Convert tweet to TwitterBookmark
                    bookmark = self._convert_tweet_to_bookmark(tweet)
                    total_fetched += 1
                    yield bookmark

                # Check for next page cursor
                cursor = getattr(bookmarks_response, "next_cursor", None)
                if not cursor:
                    logger.info("No more pages available")
                    break

                logger.info(f"Fetched {total_fetched} bookmarks so far, continuing to next page")

            logger.info(f"Completed fetching bookmarks. Total: {total_fetched}")

        except RateLimitError:
            raise
        except AuthenticationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error during bookmark fetching: {e}")
            raise NetworkError(f"Bookmark fetching failed: {str(e)}") from e

    async def get_bookmark_count(self) -> int:
        """
        Get total bookmark count.

        Returns:
            Total number of bookmarks

        Raises:
            AuthenticationError: If not authenticated
            NetworkError: If network errors occur
        """
        if not self._authenticated or not self.client:
            raise AuthenticationError("Client not authenticated. Call authenticate() first.")

        try:
            # Fetch first page to get count
            bookmarks_response = await self._retry_with_backoff(
                self.client.get_bookmarks,
                count=1,
            )

            # Try to get total count from response metadata
            total = getattr(bookmarks_response, "total", None)
            if total is not None:
                return total

            # If total not available, we can't determine count without fetching all
            logger.warning("Total bookmark count not available from API")
            return 0

        except Exception as e:
            logger.error(f"Failed to get bookmark count: {e}")
            raise NetworkError(f"Failed to get bookmark count: {str(e)}") from e

    def _convert_tweet_to_bookmark(self, tweet: Any) -> TwitterBookmark:
        """
        Convert twikit tweet object to TwitterBookmark.

        Args:
            tweet: Tweet object from twikit

        Returns:
            TwitterBookmark object
        """
        # Extract media
        media_list: list[TwitterMedia] = []
        if hasattr(tweet, "media") and tweet.media:
            for media_item in tweet.media:
                media_type = getattr(media_item, "type", "photo")
                media_url = getattr(media_item, "media_url_https", "") or getattr(
                    media_item, "url", ""
                )
                thumbnail_url = getattr(media_item, "thumbnail_url", None)

                if media_url:
                    media_list.append(
                        TwitterMedia(
                            media_type=media_type,
                            url=media_url,
                            thumbnail_url=thumbnail_url,
                        )
                    )

        # Extract author information
        author = getattr(tweet, "user", None)
        author_name = getattr(author, "name", "Unknown") if author else "Unknown"
        author_username = getattr(author, "screen_name", "unknown") if author else "unknown"
        author_profile_url = (
            f"https://twitter.com/{author_username}" if author_username != "unknown" else ""
        )

        # Extract tweet text
        text = getattr(tweet, "full_text", "") or getattr(tweet, "text", "")

        # Extract created_at timestamp
        created_at_str = getattr(tweet, "created_at", None)
        if created_at_str:
            # Parse Twitter's timestamp format
            try:
                created_at = datetime.strptime(created_at_str, "%a %b %d %H:%M:%S %z %Y")
            except (ValueError, TypeError):
                created_at = datetime.now()
        else:
            created_at = datetime.now()

        # Build metadata
        metadata = {
            "retweet_count": getattr(tweet, "retweet_count", 0),
            "favorite_count": getattr(tweet, "favorite_count", 0),
            "reply_count": getattr(tweet, "reply_count", 0),
            "lang": getattr(tweet, "lang", "en"),
        }

        return TwitterBookmark(
            tweet_id=str(tweet.id),
            tweet_url=f"https://twitter.com/{author_username}/status/{tweet.id}",
            text=text,
            author_name=author_name,
            author_username=author_username,
            author_profile_url=author_profile_url,
            created_at=created_at,
            media=media_list,
            metadata=metadata,
        )

    async def _retry_with_backoff(self, func: Any, *args: Any, **kwargs: Any) -> Any:
        """
        Execute function with exponential backoff retry logic.

        Args:
            func: Function to execute
            *args: Positional arguments for function
            **kwargs: Keyword arguments for function

        Returns:
            Function result

        Raises:
            RateLimitError: If rate limit is exceeded
            NetworkError: If all retries are exhausted
        """
        last_exception: Exception | None = None

        for attempt in range(self.max_retries):
            try:
                # Execute the function
                result = func(*args, **kwargs)

                # Handle async functions
                if asyncio.iscoroutine(result):
                    result = await result

                return result

            except (RateLimitExceeded, TooManyRequests) as e:
                # Rate limit errors should not be retried
                retry_after = 900  # Default to 15 minutes
                error_msg = f"Rate limit exceeded. Retry after {retry_after} seconds"
                logger.warning(error_msg)
                raise RateLimitError(error_msg, retry_after_seconds=retry_after) from e

            except (Unauthorized, Forbidden) as e:
                # Authentication errors should not be retried
                raise AuthenticationError(f"Authentication error: {str(e)}") from e

            except (BadRequest, NotFound) as e:
                # Client errors should not be retried
                raise TwitterClientError(f"Client error: {str(e)}") from e

            except (ServerError, ConnectionError, TimeoutError, OSError) as e:
                # Network/server errors can be retried
                last_exception = e
                backoff_time = self.initial_backoff * (2**attempt)

                if attempt < self.max_retries - 1:
                    logger.warning(
                        f"Network error on attempt {attempt + 1}/{self.max_retries}: {e}. "
                        f"Retrying in {backoff_time:.1f} seconds..."
                    )
                    await asyncio.sleep(backoff_time)
                else:
                    logger.error(
                        f"Network error after {self.max_retries} attempts: {e}. Giving up."
                    )

            except Exception as e:
                # Unknown errors - retry with caution
                last_exception = e
                backoff_time = self.initial_backoff * (2**attempt)

                if attempt < self.max_retries - 1:
                    logger.warning(
                        f"Unexpected error on attempt {attempt + 1}/{self.max_retries}: {e}. "
                        f"Retrying in {backoff_time:.1f} seconds..."
                    )
                    await asyncio.sleep(backoff_time)
                else:
                    logger.error(f"Unexpected error after {self.max_retries} attempts: {e}")

        # All retries exhausted
        error_msg = f"Failed after {self.max_retries} attempts"
        if last_exception:
            error_msg += f": {str(last_exception)}"
        raise NetworkError(error_msg) from last_exception
