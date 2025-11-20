# Twitor Turbo Integration

This document describes how the Twitor Python service is integrated into the Turbo monorepo.

## Overview

Twitor is a Python-based FastAPI service that crawls Twitter bookmarks. It's integrated into the Turbo monorepo alongside TypeScript/JavaScript services.

## Workspace Configuration

### Package.json

The `package.json` file in the twitor directory defines the scripts that Turbo can execute:

```json
{
  "name": "twitor",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "uv run uvicorn src.main:app --reload --port 8001 --host 0.0.0.0",
    "build": "uv sync",
    "test": "uv run pytest",
    "test:watch": "uv run pytest-watch",
    "check-types": "uv run mypy src/",
    "lint": "uv run ruff check src/",
    "format": "uv run ruff format src/"
  }
}
```

### Turbo.json

The root `turbo.json` includes configuration for Python projects:

- **build**: Outputs include `.venv/**` for Python virtual environments
- **dev**: Persistent task for running the development server
- **test**: Task for running tests

## Running Twitor

### Development Mode

Run all services including Twitor:

```bash
bun run dev
```

Run only Twitor:

```bash
bun run dev:twitor
# or
turbo run dev --filter=twitor
```

### Building

Build all services including Twitor:

```bash
bun run build
```

Build only Twitor:

```bash
turbo run build --filter=twitor
```

### Testing

Run tests for Twitor:

```bash
turbo run test --filter=twitor
```

## Deployment Integration

### Build Scripts

The deployment scripts include Twitor:

- `deployment/prod/build-twitor.sh` - Builds the Twitor service
- `deployment/prod/build-all.sh` - Builds all services including Twitor

### Docker Support

Twitor will be containerized using Docker (see task 13 for Docker configuration).

## Prerequisites

### UV Package Manager

Twitor uses `uv` for Python package management. Install it:

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with pip
pip install uv
```

### Python Version

Twitor requires Python 3.11 or higher. UV will automatically manage the Python version.

## Troubleshooting

### Turbo doesn't recognize twitor

Make sure the workspace configuration in the root `package.json` includes `apps/*`:

```json
{
  "workspaces": {
    "packages": ["apps/*", "packages/*"]
  }
}
```

### Build fails

1. Check that `uv` is installed: `uv --version`
2. Check that `pyproject.toml` exists in `apps/twitor/`
3. Try building manually: `cd apps/twitor && uv sync`

### Dev server doesn't start

1. Check that port 8001 is available
2. Check that environment variables are set (see `.env.example`)
3. Check that the database is running

## Integration with Other Services

### API Server

The API server proxies requests to Twitor at `http://localhost:8001` (development) or `http://twitor:8001` (production).

### Database

Twitor uses the same PostgreSQL database as other services but with a separate `crawler` schema.

### Restate

Twitor can trigger Restate workflows for AI summarization and enrichment.
