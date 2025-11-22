"""Pydantic AI agent for content extraction."""

import logging

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.ollama import OllamaProvider

from src.config import settings
from src.models import CrawlerDependencies, CrawlResult

logger = logging.getLogger(__name__)

# Create Ollama model using OllamaProvider
# Ollama exposes an OpenAI-compatible API at /v1
ollama_model = OpenAIChatModel(
    model_name=settings.ollama_model,
    provider=OllamaProvider(base_url=f"{settings.ollama_base_url}/v1"),
)

# Create the Pydantic AI agent with structured output
# Optimized for faster processing
crawler_agent = Agent[CrawlerDependencies, CrawlResult](
    ollama_model,
    deps_type=CrawlerDependencies,
    output_type=CrawlResult,
    system_prompt=(
        "You are a fast and efficient content analyzer. Extract key information concisely.\n\n"
        "IMPORTANT - Be CONCISE but complete:\n"
        "- summary: 2-3 paragraphs maximum\n"
        "- important_links: Top 5-10 most relevant links only\n"
        "- media: Top 3-5 most important images/videos\n"
        "- keywords: 5-7 main topics\n\n"
        "Categorize links as: github, article, twitter, youtube, documentation, other.\n"
        "Work quickly and efficiently."
    ),
)


async def analyze_content(url: str, markdown_content: str) -> CrawlResult:
    """
    Analyze content using the Pydantic AI agent with optimizations for speed.

    Optimizations:
    1. Limit content to 8000 chars (reduces LLM processing time)
    2. Use concise prompts
    3. Request only top items (not exhaustive extraction)

    Args:
        url: Original URL
        markdown_content: Markdown content to analyze

    Returns:
        CrawlResult with all extracted information
    """
    logger.info(f"Analyzing content from {url}")
    
    # OPTIMIZATION 1: Aggressive content limiting to reduce LLM processing time
    # 8000 chars is enough for most pages and processes much faster
    content_limit = 8000
    content_to_analyze = markdown_content[:content_limit]
    
    logger.info(f"Processing {len(content_to_analyze)} chars (original: {len(markdown_content)})")

    deps = CrawlerDependencies(url=url, markdown_content=content_to_analyze)

    # OPTIMIZATION 2: Concise, focused prompt
    prompt = f"""Analyze this web page quickly and extract key information.

URL: {url}

CONTENT:
{content_to_analyze}

Extract:
1. 2-3 paragraph summary
2. Top 5-10 most important links with types
3. Top 3-5 key images/videos
4. 5-7 main keywords

Be concise and fast."""

    try:
        result = await crawler_agent.run(prompt, deps=deps)
        
        logger.info(
            f"Analysis complete: {len(result.output.summary)} chars, "
            f"{len(result.output.important_links)} links, "
            f"{len(result.output.keywords)} keywords"
        )
        
        # Return result with full original markdown
        result.output.markdown_content = markdown_content
        return result.output
        
    except Exception as e:
        logger.error(f"LLM analysis failed: {e}")
        # Return basic result on timeout/error
        return CrawlResult(
            url=url,
            markdown_content=markdown_content,
            summary="Analysis timed out or failed. Content extracted but not analyzed.",
            important_links=[],
            media=[],
            keywords=[]
        )
