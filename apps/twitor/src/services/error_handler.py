"""Error handler for classifying and recovering from errors during crawling."""

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any

from src.services.checkpoint_manager import CheckpointManager
from src.twitter.client import AuthenticationError, NetworkError, RateLimitError

logger = logging.getLogger(__name__)


class ErrorCategory(str, Enum):
    """Categories of errors that can occur during crawling."""

    AUTH = "authentication"
    RATE_LIMIT = "rate_limit"
    NETWORK = "network"
    VALIDATION = "validation"
    DATABASE = "database"
    FATAL = "fatal"


class ErrorAction(str, Enum):
    """Actions to take in response to errors."""

    ABORT = "abort"  # Stop crawling immediately
    RETRY = "retry"  # Retry the operation
    SKIP = "skip"  # Skip the current item and continue
    PAUSE = "pause"  # Pause and wait before continuing


@dataclass
class ErrorContext:
    """Context information about an error."""

    error: Exception
    retry_count: int = 0
    last_processed_id: str | None = None
    session_id: str | None = None
    user_id: str | None = None
    operation: str | None = None


@dataclass
class ErrorRecoveryStrategy:
    """Strategy for recovering from an error."""

    action: ErrorAction
    delay: float = 0.0  # Delay in seconds before taking action
    message: str = ""
    should_save_checkpoint: bool = False


class DatabaseError(Exception):
    """Raised when database operations fail."""

    pass


class ValidationError(Exception):
    """Raised when validation fails."""

    pass


class FatalError(Exception):
    """Raised when a fatal error occurs that cannot be recovered."""

    pass


class ErrorHandler:
    """Handles error classification and recovery strategies."""

    def __init__(
        self,
        checkpoint_manager: CheckpointManager | None = None,
        max_retries: int = 5,
        initial_backoff: float = 1.0,
    ):
        """
        Initialize error handler.

        Args:
            checkpoint_manager: Optional checkpoint manager for saving state on fatal errors
            max_retries: Maximum number of retry attempts
            initial_backoff: Initial backoff time in seconds for exponential backoff
        """
        self.checkpoint_manager = checkpoint_manager
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff

    def classify_error(self, error: Exception) -> ErrorCategory:
        """
        Classify an error into a category.

        Args:
            error: The exception to classify

        Returns:
            ErrorCategory enum value
        """
        # Authentication errors
        if isinstance(error, AuthenticationError):
            return ErrorCategory.AUTH

        # Rate limit errors
        if isinstance(error, RateLimitError):
            return ErrorCategory.RATE_LIMIT

        # Network errors
        if isinstance(error, NetworkError):
            return ErrorCategory.NETWORK

        # Validation errors
        if isinstance(error, (ValidationError, ValueError, TypeError)):
            return ErrorCategory.VALIDATION

        # Database errors
        if isinstance(error, DatabaseError):
            return ErrorCategory.DATABASE

        # Fatal errors
        if isinstance(
            error,
            (
                FatalError,
                MemoryError,
                OSError,
                SystemError,
            ),
        ):
            return ErrorCategory.FATAL

        # Default to fatal for unknown errors
        logger.warning(f"Unknown error type: {type(error).__name__}, treating as fatal")
        return ErrorCategory.FATAL

    async def handle_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Determine the appropriate recovery strategy for an error.

        Args:
            context: Error context with details about the error

        Returns:
            ErrorRecoveryStrategy with action to take
        """
        category = self.classify_error(context.error)
        error_msg = str(context.error)

        logger.info(
            f"Handling {category.value} error (retry {context.retry_count}/{self.max_retries}): "
            f"{error_msg}"
        )

        # Handle based on category
        if category == ErrorCategory.AUTH:
            return await self._handle_auth_error(context)

        elif category == ErrorCategory.RATE_LIMIT:
            return await self._handle_rate_limit_error(context)

        elif category == ErrorCategory.NETWORK:
            return await self._handle_network_error(context)

        elif category == ErrorCategory.VALIDATION:
            return await self._handle_validation_error(context)

        elif category == ErrorCategory.DATABASE:
            return await self._handle_database_error(context)

        elif category == ErrorCategory.FATAL:
            return await self._handle_fatal_error(context)

        # Default: abort
        return ErrorRecoveryStrategy(
            action=ErrorAction.ABORT,
            message=f"Unknown error category: {category}",
            should_save_checkpoint=True,
        )

    async def _handle_auth_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Handle authentication errors.

        Authentication errors are not recoverable - abort immediately.

        Args:
            context: Error context

        Returns:
            ErrorRecoveryStrategy to abort
        """
        logger.error(f"Authentication failed: {context.error}")
        return ErrorRecoveryStrategy(
            action=ErrorAction.ABORT,
            message=("Authentication failed. Please check your Twitter credentials and try again."),
            should_save_checkpoint=False,
        )

    async def _handle_rate_limit_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Handle rate limit errors.

        Rate limit errors require pausing until the limit resets.

        Args:
            context: Error context

        Returns:
            ErrorRecoveryStrategy to pause
        """
        # Extract retry_after from RateLimitError if available
        retry_after = 900  # Default to 15 minutes
        if isinstance(context.error, RateLimitError):
            retry_after = context.error.retry_after_seconds

        logger.warning(
            f"Rate limit exceeded. Pausing for {retry_after} seconds (~{retry_after // 60} minutes)"
        )

        return ErrorRecoveryStrategy(
            action=ErrorAction.PAUSE,
            delay=retry_after,
            message=f"Rate limit exceeded. Retry after {retry_after} seconds",
            should_save_checkpoint=True,
        )

    async def _handle_network_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Handle network errors with exponential backoff.

        Network errors are retried with exponential backoff up to max_retries.

        Args:
            context: Error context

        Returns:
            ErrorRecoveryStrategy to retry or abort
        """
        if context.retry_count < self.max_retries:
            # Calculate exponential backoff
            backoff_time = self.initial_backoff * (2**context.retry_count)

            logger.warning(
                f"Network error (attempt {context.retry_count + 1}/{self.max_retries}). "
                f"Retrying in {backoff_time:.1f} seconds..."
            )

            return ErrorRecoveryStrategy(
                action=ErrorAction.RETRY,
                delay=backoff_time,
                message=f"Network error. Retrying in {backoff_time:.1f} seconds",
                should_save_checkpoint=False,
            )
        else:
            logger.error(
                f"Network error after {self.max_retries} attempts. Giving up. "
                f"Error: {context.error}"
            )

            return ErrorRecoveryStrategy(
                action=ErrorAction.ABORT,
                message=f"Network error after {self.max_retries} attempts. Please try again later.",
                should_save_checkpoint=True,
            )

    async def _handle_validation_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Handle validation errors.

        Validation errors indicate bad data - skip the item and continue.

        Args:
            context: Error context

        Returns:
            ErrorRecoveryStrategy to skip
        """
        logger.warning(f"Validation error: {context.error}. Skipping item.")

        return ErrorRecoveryStrategy(
            action=ErrorAction.SKIP,
            message=f"Validation error: {context.error}",
            should_save_checkpoint=False,
        )

    async def _handle_database_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Handle database errors.

        Database errors are logged and the item is skipped to continue processing.

        Args:
            context: Error context

        Returns:
            ErrorRecoveryStrategy to skip
        """
        logger.error(
            f"Database error during {context.operation or 'operation'}: {context.error}. "
            "Skipping item and continuing."
        )

        return ErrorRecoveryStrategy(
            action=ErrorAction.SKIP,
            message=f"Database error: {context.error}",
            should_save_checkpoint=False,
        )

    async def _handle_fatal_error(self, context: ErrorContext) -> ErrorRecoveryStrategy:
        """
        Handle fatal errors.

        Fatal errors require saving checkpoint and graceful shutdown.

        Args:
            context: Error context

        Returns:
            ErrorRecoveryStrategy to abort with checkpoint save
        """
        logger.critical(
            f"Fatal error during {context.operation or 'operation'}: {context.error}. "
            "Saving checkpoint and shutting down gracefully."
        )

        # Save checkpoint if available
        if self.checkpoint_manager and context.last_processed_id:
            try:
                await self.checkpoint_manager.save_checkpoint(
                    tweet_id=context.last_processed_id,
                )
                logger.info(f"Checkpoint saved: {context.last_processed_id}")
            except Exception as e:
                logger.error(f"Failed to save checkpoint on fatal error: {e}")

        return ErrorRecoveryStrategy(
            action=ErrorAction.ABORT,
            message=f"Fatal error: {context.error}. Checkpoint saved. You can resume later.",
            should_save_checkpoint=True,
        )

    async def execute_recovery_strategy(
        self,
        strategy: ErrorRecoveryStrategy,
        context: ErrorContext,
    ) -> None:
        """
        Execute a recovery strategy.

        Args:
            strategy: The recovery strategy to execute
            context: Error context
        """
        # Apply delay if specified
        if strategy.delay > 0:
            logger.info(f"Waiting {strategy.delay:.1f} seconds before {strategy.action.value}...")
            await asyncio.sleep(strategy.delay)

        # Save checkpoint if required
        if strategy.should_save_checkpoint and self.checkpoint_manager:
            if context.last_processed_id:
                try:
                    await self.checkpoint_manager.save_checkpoint(
                        tweet_id=context.last_processed_id,
                    )
                    logger.info(f"Checkpoint saved: {context.last_processed_id}")
                except Exception as e:
                    logger.error(f"Failed to save checkpoint: {e}")

        # Log the action
        logger.info(f"Recovery action: {strategy.action.value} - {strategy.message}")

    def calculate_backoff(self, retry_count: int) -> float:
        """
        Calculate exponential backoff time.

        Args:
            retry_count: Current retry attempt number (0-indexed)

        Returns:
            Backoff time in seconds
        """
        return self.initial_backoff * (2**retry_count)

    def should_retry(self, context: ErrorContext) -> bool:
        """
        Determine if an operation should be retried.

        Args:
            context: Error context

        Returns:
            True if should retry, False otherwise
        """
        category = self.classify_error(context.error)

        # Never retry auth or validation errors
        if category in (ErrorCategory.AUTH, ErrorCategory.VALIDATION):
            return False

        # Retry network errors up to max_retries
        if category == ErrorCategory.NETWORK:
            return context.retry_count < self.max_retries

        # Don't retry other errors
        return False

    async def graceful_shutdown(
        self,
        context: ErrorContext,
        cleanup_tasks: list[Any] | None = None,
    ) -> None:
        """
        Perform graceful shutdown on fatal error.

        Args:
            context: Error context
            cleanup_tasks: Optional list of cleanup tasks to execute
        """
        logger.info("Initiating graceful shutdown...")

        # Save checkpoint
        if self.checkpoint_manager and context.last_processed_id:
            try:
                await self.checkpoint_manager.save_checkpoint(
                    tweet_id=context.last_processed_id,
                )
                logger.info(f"Final checkpoint saved: {context.last_processed_id}")
            except Exception as e:
                logger.error(f"Failed to save final checkpoint: {e}")

        # Execute cleanup tasks
        if cleanup_tasks:
            logger.info(f"Executing {len(cleanup_tasks)} cleanup tasks...")
            for task in cleanup_tasks:
                try:
                    if asyncio.iscoroutine(task):
                        await task
                    elif callable(task):
                        result = task()
                        if asyncio.iscoroutine(result):
                            await result
                except Exception as e:
                    logger.error(f"Error during cleanup: {e}")

        logger.info("Graceful shutdown complete")
