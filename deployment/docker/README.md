# Production Dockerfiles

This directory contains production-ready Dockerfiles for all application services.

## Files

### Dockerfile.web

Multi-stage Dockerfile for the web frontend application:

- **Base**: Node.js 20 Alpine
- **Build**: Vite production build with optimizations
- **Runtime**: Nginx Alpine for serving static files
- **Port**: 3001
- **Health Check**: HTTP check on root endpoint
- **Features**:
  - Multi-stage build for minimal image size
  - Nginx with gzip compression and caching
  - SPA routing support
  - Security headers
  - Non-root user execution

### Dockerfile.server

Multi-stage Dockerfile for the API server:

- **Base**: Bun 1.2.19 Alpine
- **Build**: TypeScript compilation with tsdown
- **Runtime**: Bun runtime
- **Port**: 3000
- **Health Check**: HTTP check on /health endpoint
- **Features**:
  - Multi-stage build for minimal image size
  - Prisma client generation
  - Production dependencies only
  - Non-root user execution

### Dockerfile.restate-worker

Multi-stage Dockerfile for the Restate workflow worker:

- **Base**: Node.js 20 Alpine
- **Build**: TypeScript compilation with Restate SDK
- **Runtime**: Node.js runtime
- **Port**: 9080
- **Health Check**: HTTP check on /health endpoint
- **Features**:
  - Multi-stage build for minimal image size
  - Prisma client generation
  - Auto-registration with Restate server
  - Non-root user execution

### Supporting Files

#### nginx.conf

Production Nginx configuration for the web frontend:

- Gzip compression
- Static file caching
- SPA routing
- Security headers
- Health check endpoint

#### register-restate-worker.sh

Auto-registration script for Restate worker:

- Waits for worker to be ready
- Waits for Restate admin API to be ready
- Registers worker with Restate server
- Handles registration errors gracefully
- Idempotent (safe to run multiple times)

## Building Images

### Build Web Application

```bash
docker build -f deployment/docker/Dockerfile.web -t fav-book-web:latest .
```

### Build API Server

```bash
docker build -f deployment/docker/Dockerfile.server -t fav-book-server:latest .
```

### Build Restate Worker

```bash
docker build -f deployment/docker/Dockerfile.restate-worker -t fav-book-restate-worker:latest .
```

## Running Containers

### Web Application

```bash
docker run -p 3001:3001 fav-book-web:latest
```

### API Server

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e BETTER_AUTH_SECRET="your-secret" \
  -e BETTER_AUTH_URL="http://localhost:3000" \
  fav-book-server:latest
```

### Restate Worker

```bash
docker run -p 9080:9080 \
  -e RESTATE_ADMIN_URL="http://restate:9070" \
  -e RESTATE_INGRESS_URL="http://restate:8080" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  fav-book-restate-worker:latest
```

## Environment Variables

### Web Application

No environment variables required (static build).

### API Server

- `DATABASE_URL`: PostgreSQL connection string (required)
- `BETTER_AUTH_SECRET`: Authentication secret (required)
- `BETTER_AUTH_URL`: Authentication URL (required)
- `CORS_ORIGIN`: CORS origin (optional, default: http://localhost:3001)
- `PORT`: Server port (optional, default: 3000)

### Restate Worker

- `DATABASE_URL`: PostgreSQL connection string (required)
- `RESTATE_ADMIN_URL`: Restate admin API URL (optional, default: http://restate:9070)
- `RESTATE_INGRESS_URL`: Restate ingress URL (optional, default: http://restate:8080)
- `RESTATE_SERVICE_PORT`: Worker service port (optional, default: 9080)
- `WORKER_HOST`: Worker hostname for registration (optional, default: restate-worker)

## Health Checks

All containers include health checks:

- **Web**: `wget http://localhost:3001/`
- **Server**: `curl http://localhost:3000/health`
- **Restate Worker**: `curl http://localhost:9080/health`

Health checks run every 30 seconds with a 3-second timeout.

## Security

All containers:

- Run as non-root users
- Use Alpine Linux for minimal attack surface
- Include only production dependencies
- Follow Docker best practices

## Next Steps

These Dockerfiles are used by:

1. Production Docker Compose configuration (`deployment/prod/docker-compose.yml`)
2. Production build scripts (`deployment/prod/build-*.sh`)
3. Production deployment scripts (`deployment/prod/deploy.sh`)

See the main deployment README for complete deployment workflows.
