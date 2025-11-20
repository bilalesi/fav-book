# Twitor Docker Deployment Guide

This document describes the Docker configuration for the Twitor service and how to deploy it.

## Overview

The Twitor service is containerized using Docker and integrated into the production deployment stack. It depends on:

- PostgreSQL (database)
- Valkey (Redis-compatible queue)
- API Server (for bookmark import)

## Docker Configuration

### Dockerfile

Location: `fav-book/apps/twitor/Dockerfile`

The Dockerfile:

- Uses Python 3.11 slim base image
- Installs uv package manager
- Copies project files and dependencies
- Installs Python dependencies using `uv sync --frozen`
- Exposes port 8001
- Includes health check endpoint
- Runs the FastAPI application using uvicorn

### Docker Compose

The Twitor service is defined in `fav-book/deployment/prod/docker-compose.yml` along with:

1. **Valkey Service**: Redis-compatible queue for background job processing

   - Image: `valkey/valkey:7-alpine`
   - Port: 6379
   - Persistent storage with volume
   - Memory limits and LRU eviction policy

2. **Twitor Service**: Twitter bookmark crawler
   - Image: `bookmarks-twitor:latest`
   - Port: 8001
   - Depends on: postgres, valkey, server
   - Health check on `/health` endpoint

## Environment Variables

The following environment variables are required for Twitor:

### Twitter API Credentials

- `TWITTER_USERNAME`: Twitter account username
- `TWITTER_PASSWORD`: Twitter account password
- `TWITTER_EMAIL`: Twitter account email

### Database Configuration

- `DATABASE_URL`: PostgreSQL connection string (format: `postgresql+asyncpg://user:pass@host:port/db`)

### API Configuration

- `API_BASE_URL`: Base URL for the API server (e.g., `http://server:3000`)
- `API_AUTH_TOKEN`: Authentication token for API calls

### Service Configuration

- `TWITOR_PORT`: Port to run the service on (default: 8001)
- `TWITOR_HOST`: Host to bind to (default: 0.0.0.0)
- `MAX_CONCURRENT_CRAWLS`: Maximum concurrent crawl sessions (default: 5)
- `BATCH_SIZE`: Number of bookmarks to process in each batch (default: 100)

### Feature Flags

- `ENABLE_AI_SUMMARIZATION`: Enable AI summarization (default: true)
- `ENABLE_MEDIA_DOWNLOAD`: Enable media download (default: true)

### Valkey/Redis Configuration

- `VALKEY_URL`: Valkey connection URL (e.g., `redis://valkey:6379/0`)
- `VALKEY_MAX_CONNECTIONS`: Maximum connections to Valkey (default: 10)

### Logging

- `LOG_LEVEL`: Logging level (default: INFO)
- `DEBUG`: Enable debug mode (default: false)

### Resource Limits

- `TWITOR_MEMORY_LIMIT`: Memory limit for Twitor container (default: 1g)
- `VALKEY_MEMORY_LIMIT`: Memory limit for Valkey container (default: 512m)
- `VALKEY_MAX_MEMORY`: Max memory for Valkey data (default: 256mb)

## Building the Docker Image

### Using the Build Script

```bash
# Build Twitor image only
./deployment/prod/build-twitor.sh

# Build all images including Twitor
./deployment/prod/build-all.sh

# Build all except Twitor
./deployment/prod/build-all.sh --skip-twitor
```

### Manual Build

```bash
cd fav-book
docker build -t bookmarks-twitor:latest -f apps/twitor/Dockerfile apps/twitor
```

## Deployment

### Production Deployment

1. Configure environment variables in `.env.production` or `.env.server`

2. Build all Docker images:

   ```bash
   cd deployment/prod
   ./build-all.sh
   ```

3. Start all services:

   ```bash
   docker-compose -f deployment/prod/docker-compose.yml up -d
   ```

4. Verify Twitor is running:

   ```bash
   docker-compose -f deployment/prod/docker-compose.yml ps twitor
   docker-compose -f deployment/prod/docker-compose.yml logs -f twitor
   ```

5. Check health:
   ```bash
   curl http://localhost:8001/health
   ```

### Development Deployment

#### Option 1: Using Docker Compose (Recommended)

The dev environment includes Twitor, Valkey, and PostgreSQL in Docker:

```bash
cd deployment/dev
docker-compose up -d
```

This will start:

- PostgreSQL (port 5432)
- Valkey (port 6379)
- Twitor (port 8001)

The web and server applications run locally for fast iteration.

#### Option 2: Running Twitor Locally

For development without Docker:

```bash
cd apps/twitor
uv run uvicorn src.main:app --reload --port 8001
```

Or use the dev script:

```bash
cd apps/twitor
npm run dev
```

## Service Dependencies

The Twitor service has the following startup dependencies:

1. **PostgreSQL** - Must be healthy before Twitor starts
2. **Valkey** - Must be healthy before Twitor starts
3. **API Server** - Must be healthy before Twitor starts

Docker Compose handles these dependencies automatically using health checks.

## Networking

All services communicate over the `bookmarks-prod-network` Docker bridge network:

- Twitor → PostgreSQL: `postgres:5432`
- Twitor → Valkey: `valkey:6379`
- Twitor → API Server: `server:3000`

External access:

- Twitor API: `localhost:8001`
- Valkey: `localhost:6379` (if needed for debugging)

## Volumes

The following volumes are created for persistent data:

- `bookmarks-prod-postgres-data`: PostgreSQL data
- `bookmarks-prod-valkey-data`: Valkey queue data

## Resource Limits

Default resource limits for Twitor:

- CPU: 1.0 cores (limit), 0.25 cores (reservation)
- Memory: 1GB (limit), 256MB (reservation)

Default resource limits for Valkey:

- CPU: 0.5 cores (limit), 0.1 cores (reservation)
- Memory: 512MB (limit), 128MB (reservation)

These can be adjusted via environment variables.

## Troubleshooting

### Container won't start

Check logs:

```bash
docker-compose -f deployment/prod/docker-compose.yml logs twitor
```

### Health check failing

Test the health endpoint:

```bash
docker exec bookmarks-prod-twitor curl -f http://localhost:8001/health
```

### Database connection issues

Verify PostgreSQL is running and accessible:

```bash
docker-compose -f deployment/prod/docker-compose.yml ps postgres
docker exec bookmarks-prod-postgres pg_isready
```

### Valkey connection issues

Verify Valkey is running:

```bash
docker-compose -f deployment/prod/docker-compose.yml ps valkey
docker exec bookmarks-prod-valkey valkey-cli ping
```

### View all service status

```bash
docker-compose -f deployment/prod/docker-compose.yml ps
```

## Maintenance

### Restart Twitor

```bash
docker-compose -f deployment/prod/docker-compose.yml restart twitor
```

### View logs

```bash
# Follow logs
docker-compose -f deployment/prod/docker-compose.yml logs -f twitor

# Last 100 lines
docker-compose -f deployment/prod/docker-compose.yml logs --tail=100 twitor
```

### Update Twitor

```bash
# Rebuild image
./deployment/prod/build-twitor.sh

# Recreate container
docker-compose -f deployment/prod/docker-compose.yml up -d --force-recreate twitor
```

### Clean up

```bash
# Stop and remove containers
docker-compose -f deployment/prod/docker-compose.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f deployment/prod/docker-compose.yml down -v
```

## Security Considerations

1. **Credentials**: Never commit Twitter credentials to version control
2. **Network**: Twitor only exposes port 8001; internal services use Docker network
3. **Authentication**: API calls require authentication token
4. **Resource Limits**: Prevents resource exhaustion attacks
5. **Health Checks**: Ensures service is responding correctly

## Next Steps

After deploying Twitor:

1. Configure Twitter credentials in environment variables
2. Test the `/health` endpoint
3. Test crawl functionality via the web interface
4. Monitor logs for any errors
5. Set up monitoring and alerting (optional)
