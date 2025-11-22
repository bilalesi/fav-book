# Web Crawler Service

A Restate-based web crawler service that extracts markdown content from URLs and uses **Pydantic AI** with Ollama for intelligent content extraction.

## Features

- 🔍 **URL Validation**: Pydantic-based URL validation
- 📄 **Markdown Extraction**: Uses crawl4ai to extract clean markdown content
- 🤖 **Pydantic AI Integration**: Type-safe LLM interactions with structured outputs
- 🔄 **Durable Execution**: All operations wrapped in `ctx.run()` for automatic retry and persistence
- 🔗 **Link Extraction**: Identifies and categorizes important links (GitHub, articles, tweets, YouTube, etc.)
- 🖼️ **Media Detection**: Extracts relevant images and videos with context
- 📝 **Smart Summaries**: Generates comprehensive summaries of content
- 🏷️ **Keyword Extraction**: Identifies key topics and keywords

## Prerequisites

- Python >= 3.12
- [Ollama](https://ollama.ai/) installed and running locally
- Playwright browsers installed
- Restate server running (Docker or local)

## Setup

1. **Install dependencies**:
   ```bash
   uv sync
   ```

2. **Install Playwright browsers**:
   ```bash
   uv run playwright install
   ```

3. **Start Ollama** (if not already running):
   ```bash
   ollama serve
   ```

4. **Pull the required model**:
   ```bash
   ollama pull llama3.2
   ```

5. **Configure environment** (optional):
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

## Usage

### Start the Service

```bash
./scripts/dev.sh
```

The service will start on `http://0.0.0.0:9080` by default (or port 9081 if you changed it).

### Register with Restate

Once the service is running, register it with your Restate runtime:

**If Restate is running locally:**
```bash
restate deployments register http://localhost:9081 --use-http1.1
```

**If Restate is running in Docker** (most common):
```bash
restate deployments register http://host.docker.internal:9081 --use-http1.1
```

> **Note**: Use `host.docker.internal` instead of `localhost` when Restate runs in Docker, as `localhost` inside the container refers to the container itself, not your host machine.

### Call the Service

Using the Restate CLI:

```bash
restate services invoke CrawlerService/crawl \
  --data '{"url": "https://example.com"}'
```

Using curl:

```bash
curl -X POST http://localhost:8080/CrawlerService/crawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## API

### `CrawlerService/crawl`

Crawls a URL and extracts structured information.

**Request**:
```json
{
  "url": "https://example.com"
}
```

**Response**:
```json
{
  "url": "https://example.com",
  "markdown_content": "# Example\n\nThis is the extracted markdown...",
  "summary": "This page discusses...",
  "important_links": [
    {
      "url": "https://github.com/example/repo",
      "title": "Example Repository",
      "link_type": "github",
      "relevance": "Main project repository"
    }
  ],
  "media": [
    {
      "url": "https://example.com/image.png",
      "media_type": "image",
      "caption": "Architecture diagram",
      "context": "Shows the system architecture"
    }
  ],
  "keywords": ["web", "crawler", "automation"]
}
```

## Configuration

Configuration is managed through environment variables with the `CRAWLER_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `CRAWLER_OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `CRAWLER_OLLAMA_MODEL` | `llama3.2` | Ollama model to use |
| `CRAWLER_SERVICE_HOST` | `0.0.0.0` | Service bind host |
| `CRAWLER_SERVICE_PORT` | `9080` | Service bind port |
| `CRAWLER_TIMEOUT` | `30` | Crawler timeout in seconds |
| `CRAWLER_VERBOSE` | `false` | Enable verbose crawler logging |

Additionally, Pydantic AI requires:
- `OLLAMA_BASE_URL` - Set to `http://localhost:11434/v1` for Ollama provider

## Project Structure

```
src/
├── __init__.py          # Package exports
├── main.py              # Restate service with durable execution
├── config.py            # Configuration management
├── models.py            # Pydantic models and dependencies
├── crawler.py           # Web crawling with crawl4ai (stateless)
└── agent.py             # Pydantic AI agent for content analysis
```

## Development

### Running Tests

```bash
# TODO: Add tests
```

### Code Quality

```bash
# Format code
uv run ruff format src/

# Lint code
uv run ruff check src/
```

## How It Works

1. **URL Validation**: The service validates the input URL using Pydantic
2. **Durable Markdown Extraction**: crawl4ai extracts clean markdown content (wrapped in `ctx.run()` for durability)
3. **Pydantic AI Analysis**: A single agent call with structured output to:
   - Extract and categorize important links
   - Identify relevant media with context
   - Generate a comprehensive summary
   - Extract key topics and keywords
4. **Structured Response**: All information is validated and returned via Pydantic models

### Durable Execution

All operations are wrapped in Restate's `ctx.run()` for automatic:
- **Persistence**: Each step is journaled
- **Retry**: Automatic retry on transient failures
- **Resumption**: Can resume from last successful step after crashes

## Troubleshooting

### Ollama Connection Issues

If you see connection errors to Ollama:
- Ensure Ollama is running: `ollama serve`
- Check the host/port in your `.env` file
- Verify the model is available: `ollama list`

### Playwright Issues

If crawling fails:
- Ensure Playwright browsers are installed: `uv run playwright install`
- Check for any firewall or network restrictions

### Memory Issues

For large pages or many concurrent requests:
- Reduce the content length passed to LLM (adjust in `llm_extractor.py`)
- Use a smaller/faster Ollama model
- Increase system resources

## License

[Your License Here]
