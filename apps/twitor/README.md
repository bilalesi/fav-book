# Twitor - Twitter Bookmark Crawler

A Python-based FastAPI service that crawls Twitter bookmarks using the twikit library and integrates with the fav-book monorepo.

## Features

- Fetch Twitter bookmarks using twikit
- Real-time progress tracking via Server-Sent Events (SSE)
- Checkpoint-based resumption
- Optional AI summarization during crawling
- Direct database import or JSON file export

## Prerequisites

- Python 3.11 or higher
- [uv](https://github.com/astral-sh/uv) package manager
- PostgreSQL database (shared with main application)

## Installation

1. Install uv if you haven't already:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. Install dependencies:

```bash
uv sync
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Edit `.env` file with your settings:

- **Twitter Credentials**: Your Twitter username, password, and email
- **Database URL**: PostgreSQL connection string
- **API Configuration**: Base URL and auth token for the main API
- **Service Configuration**: Port, host, and other service settings

## Development

Start the development server:

```bash
npm run dev
# or
uv run uvicorn src.main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`

## Testing

Run tests:

```bash
npm run test
# or
uv run pytest
```

Run tests with coverage:

```bash
uv run pytest --cov=src --cov-report=html
```

## API Endpoints

### Health Check

```
GET /
GET /health
```

### Crawling (to be implemented)

```
POST /api/crawl/start
GET /api/crawl/progress/{sessionId}
POST /api/crawl/stop/{sessionId}
GET /api/crawl/checkpoint
GET /api/crawl/download/{sessionId}
```

## Integration with Monorepo

This service is part of the fav-book monorepo and integrates with:

- **Turbo**: Build orchestration via `package.json` scripts
- **PostgreSQL**: Shared database with `crawler` schema
- **Main API**: Bookmark creation and enrichment workflows

## Architecture

- **FastAPI**: Web framework for HTTP endpoints
- **twikit**: Twitter API integration
- **SQLAlchemy**: Database ORM with async support
- **Pydantic**: Request/response validation
- **SSE**: Real-time progress updates

## License

Part of the fav-book project.
