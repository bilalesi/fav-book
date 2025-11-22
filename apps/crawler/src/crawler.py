"""Web crawling functionality using crawl4ai."""

from crawl4ai import AsyncWebCrawler

from src.config import settings


async def extract_markdown(url: str) -> str:
    """
    Extract markdown content from a URL using crawl4ai.

    This function is designed to be called via ctx.run() in Restate
    for durable execution.

    Args:
        url: The URL to crawl

    Returns:
        Extracted markdown content

    Raises:
        Exception: If crawling fails
    """
    async with AsyncWebCrawler(verbose=settings.crawler_verbose) as crawler:
        result = await crawler.arun(
            url=url,
            word_count_threshold=10,
            bypass_cache=True,
        )

        if not result.success:
            raise Exception(f"Failed to crawl URL: {result.error_message}")

        return result.markdown or ""
