"""Restate web crawler service."""

import asyncio
import logging

import restate
from restate import Context

from src.agent import analyze_content
from src.config import settings
from src.crawler import extract_markdown
from src.models import CrawlRequest, CrawlResult

logger = logging.getLogger(__name__)

# Create the Restate service
crawler_service = restate.Service("crawler_service")


@crawler_service.handler()
async def crawl(ctx: Context, request: CrawlRequest) -> CrawlResult:
    """
    Crawl a URL and extract structured information.

    This handler uses Restate's durable execution via ctx.run() to ensure
    that each step is persisted and can be retried on failure.

    Steps:
    1. Validate the URL (via Pydantic)
    2. Extract markdown content using crawl4ai (durable via ctx.run)
    3. Analyze content with Pydantic AI agent (durable via ctx.run)

    Args:
        ctx: Restate context
        request: Crawl request with URL

    Returns:
        CrawlResult with all extracted information
    """
    url = str(request.url)

    logger.info(f"Starting crawl for URL: {url}")

    # Step 1: Extract markdown content (durable execution)
    logger.info("Extracting markdown content...")
    markdown_content = await ctx.run_typed("extract_markdown", extract_markdown, url=url)

    if not markdown_content:
        raise Exception("Failed to extract markdown content from URL")

    logger.info(f"Extracted {len(markdown_content)} characters of markdown")

    # Step 2: Analyze content with Pydantic AI agent (durable execution)
    logger.info("Analyzing content with Pydantic AI...")
    result = await ctx.run_typed("analyze_content", analyze_content, url=url, markdown_content=markdown_content)

    logger.info(
        f"Analysis complete: {len(result.important_links)} links, "
        f"{len(result.media)} media items, {len(result.keywords)} keywords"
    )

    return result


# Create the Restate app
app = restate.app(services=[crawler_service])


def main():
    """Run the Restate service."""
    import hypercorn
    import hypercorn.asyncio

    conf = hypercorn.Config()
    conf.bind = [f"{settings.service_host}:{settings.service_port}"]

    print(f"🚀 Starting Restate Crawler Service on {conf.bind[0]}")
    print(f"📝 Using Ollama model: {settings.ollama_model}")
    print(f"🔗 Ollama base URL: {settings.ollama_base_url}")
    print(f"✨ Using Pydantic AI for structured extraction")

    asyncio.run(hypercorn.asyncio.serve(app, conf))


if __name__ == "__main__":
    main()
