# Production Deployment

This directory contains production deployment configurations and scripts for the Social Bookmarks application.

## Overview

The production environment runs all services in Docker containers with proper orchestration, health checks, monitoring, and resource management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │   Web    │─────▶│  Server  │─────▶│PostgreSQL│          │
│  │Port: 3001│      │Port: 3000│      │Port: 5432│          │
│  └──────────┘      └────┬─────┘      └──────────┘          │
│                          │                                   │
│                          ▼                                   │
│                  ┌──────────────┐                           │
│                  │   Restate    │                           │
│                  │Ingress: 8080 │                           │
│                  │ Admin:  9070 │                           │
│                  └──────┬───────┘                           │
│                          │                                   │
│                          ▼                                   │
│                  ┌──────────────┐                           │
│                  │Restate Worker│                           │
│                  │  Port: 9080  │                           │
│                  └──────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Services

### PostgreSQL Database

- **Image**: `postgres:16-alpine`
- **Port**: 5432
- **Resources**: 2 CPU / 2GB RAM
- **Health Check**: pg_isready every 10s
- **Restart Policy**: unless-stopped

### Restate Server

- **Image**: `restatedev/restate:latest`
- **Ports**: 8080 (ingress), 9070 (admin)
- **Resources**: 2 CPU / 2GB RAM
- **Health Check**: HTTP /health every 10s
- **Restart Policy**: unless-stopped

### Restate Worker

- **Image**: `bookmarks-restate-worker:latest`
- **Port**: 9080
- **Resources**: 2 CPU / 2GB RAM
- **Health Check**: HTTP /health every 30s
- **Restart Policy**: unless-stopped
- **Auto-registers** with Restate server on startup

### API Server

- **Image**: `bookmarks-server:latest`
- **Port**: 3000
- **Resources**: 1 CPU / 1GB RAM
- **Health Check**: HTTP /health every 30s
- **Restart Policy**: unless-stopped

### Web Application

- **Image**: `bookmarks-web:latest`
- **Port**: 3001
- **Resources**: 0.5 CPU / 512MB RAM
- **Health Check**: HTTP / every 30s
- **Restart Policy**: unless-stopped

## Prerequisites

1. **Docker and Docker Compose** installed
2. **Environment variables** configured in `.env.production`
3. **Docker images** built for all services

## Quick Start

### 1. Configure Environment

```bash
# Copy the example environment file
cp deployment/.env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Critical variables to set:**

- `BETTER_AUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `DB_PASSWORD` - Strong database password
- `BETTER_AUTH_URL` - Your API domain
- `CORS_ORIGIN` - Your frontend domain
- API keys for services (OpenAI, Resend, OAuth providers)

### 2. Build Docker Images

#### Using Build Scripts (Recommended)

The build scripts handle TypeScript compilation, dependency bundling, and artifact validation:

```bash
# Build all services with parallel execution
./deployment/prod/build-all.sh

# Build all services sequentially
./deployment/prod/build-all.sh --sequential

# Build specific services
./deployment/prod/build-all.sh --skip-restate  # Skip Restate worker
./deployment/prod/build-all.sh --skip-server   # Skip API server
./deployment/prod/build-all.sh --skip-web      # Skip web app

# Build individually
./deployment/prod/build-web.sh            # Web application
./deployment/prod/build-server.sh         # API server
./deployment/prod/build-restate-worker.sh # Restate worker

# Get help
./deployment/prod/build-all.sh --help
```

**Build Script Features:**

- ✅ TypeScript type checking before build
- ✅ Automatic Prisma client generation
- ✅ Production bundle optimization
- ✅ Build artifact validation
- ✅ Parallel builds where possible (web builds independently)
- ✅ Comprehensive error handling and reporting
- ✅ Build time tracking

#### Manual Docker Build

Alternatively, build Docker images directly:

```bash
docker build -f deployment/docker/Dockerfile.web -t bookmarks-web:latest .
docker build -f deployment/docker/Dockerfile.server -t bookmarks-server:latest .
docker build -f deployment/docker/Dockerfile.restate-worker -t bookmarks-restate-worker:latest .
```

### 3. Deploy

```bash
# Start all services
docker-compose -f deployment/prod/docker-compose.yml up -d

# View logs
docker-compose -f deployment/prod/docker-compose.yml logs -f

# Check status
docker-compose -f deployment/prod/docker-compose.yml ps
```

### 4. Verify Deployment

```bash
# Run health checks (when available)
./deployment/prod/health-check.sh

# Or check manually
curl http://localhost:3000/health  # API Server
curl http://localhost:3001/        # Web App
curl http://localhost:9070/health  # Restate Server
curl http://localhost:9080/health  # Restate Worker
```

## Service Management

### View Logs

```bash
# All services
docker-compose -f deployment/prod/docker-compose.yml logs -f

# Specific service
docker-compose -f deployment/prod/docker-compose.yml logs -f server

# Last 100 lines
docker-compose -f deployment/prod/docker-compose.yml logs --tail=100 server
```

### Restart Services

```bash
# Restart all services
docker-compose -f deployment/prod/docker-compose.yml restart

# Restart specific service
docker-compose -f deployment/prod/docker-compose.yml restart server
```

### Stop Services

```bash
# Stop all services (preserves data)
docker-compose -f deployment/prod/docker-compose.yml down

# Stop and remove volumes (DELETES DATA!)
docker-compose -f deployment/prod/docker-compose.yml down -v
```

### Scale Services

```bash
# Scale API server to 3 instances
docker-compose -f deployment/prod/docker-compose.yml up -d --scale server=3
```

## Database Management

### Run Migrations

```bash
# Access the server container
docker exec -it bookmarks-prod-server sh

# Run migrations
cd packages/db && bun run db:push
```

### Backup Database

```bash
# Create backup
docker exec bookmarks-prod-postgres pg_dump -U postgres bookmarks_prod > backup.sql

# Restore backup
docker exec -i bookmarks-prod-postgres psql -U postgres bookmarks_prod < backup.sql
```

## Monitoring

### Health Checks

All services have built-in health checks that Docker monitors:

```bash
# View health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Resource Usage

```bash
# View resource consumption
docker stats

# Specific service
docker stats bookmarks-prod-server
```

### Logs

Logs are automatically rotated (max 10MB per file, 3 files retained):

```bash
# View logs location
docker inspect bookmarks-prod-server | grep LogPath
```

## Troubleshooting

### Service Won't Start

1. Check logs: `docker-compose -f deployment/prod/docker-compose.yml logs <service>`
2. Verify environment variables: `docker-compose -f deployment/prod/docker-compose.yml config`
3. Check health status: `docker ps`
4. Verify dependencies are healthy

### Database Connection Issues

```bash
# Test database connectivity
docker exec bookmarks-prod-postgres psql -U postgres -d bookmarks_prod -c "SELECT 1"

# Check database logs
docker-compose -f deployment/prod/docker-compose.yml logs postgres
```

### Restate Worker Not Registering

```bash
# Check worker logs
docker-compose -f deployment/prod/docker-compose.yml logs restate-worker

# Verify Restate server is healthy
curl http://localhost:9070/health

# Check registered services
curl http://localhost:9070/deployments
```

### Out of Memory

If services are being killed due to OOM:

1. Check resource usage: `docker stats`
2. Increase memory limits in `docker-compose.yml`
3. Adjust environment variables: `RESTATE_MEMORY_LIMIT`, `API_MEMORY_LIMIT`, `WEB_MEMORY_LIMIT`

### Port Conflicts

```bash
# Check what's using a port
lsof -i :3000

# Change port in .env.production
PORT=3001
```

## Security Considerations

### Network Security

- Services communicate via internal Docker network
- Only necessary ports are exposed to host
- Consider using a reverse proxy (nginx, Traefik) for external access

### Secrets Management

- Never commit `.env.production` to version control
- Use strong, randomly generated secrets
- Rotate credentials regularly
- Consider using Docker secrets or external secret managers

### Database Security

- Use strong passwords
- Enable SSL/TLS for database connections
- Restrict database port exposure (comment out port mapping)
- Regular backups

## Performance Tuning

### Resource Limits

Adjust in `.env.production`:

```bash
POSTGRES_MAX_CONNECTIONS=100
RESTATE_MEMORY_LIMIT=2g
API_MEMORY_LIMIT=1g
WEB_MEMORY_LIMIT=512m
```

### Database Optimization

```bash
# Increase shared_buffers for better performance
# Add to postgres environment in docker-compose.yml
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

### Restate Optimization

Adjust in `docker-compose.yml` under restate service:

```yaml
environment:
  RESTATE_WORKER__NUM_TIMERS_IN_MEMORY_LIMIT: 2048
  RESTATE_WORKER__STORAGE__ROCKSDB__WRITE_BUFFER_SIZE: 134217728
```

## Backup and Recovery

### Automated Backups

Create a cron job for regular backups:

```bash
# Add to crontab
0 2 * * * docker exec bookmarks-prod-postgres pg_dump -U postgres bookmarks_prod | gzip > /backups/bookmarks_$(date +\%Y\%m\%d).sql.gz
```

### Disaster Recovery

1. Stop all services
2. Restore database from backup
3. Verify data integrity
4. Start services
5. Run health checks

## Scaling

### Horizontal Scaling

For high availability, consider:

1. **Load Balancer**: nginx, HAProxy, or cloud load balancer
2. **Multiple API Instances**: Scale server service
3. **Database Replication**: PostgreSQL streaming replication
4. **Restate Clustering**: Multiple Restate nodes

### Vertical Scaling

Increase resources in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: "4.0"
      memory: 4G
```

## Maintenance

### Update Services

```bash
# Pull latest images
docker-compose -f deployment/prod/docker-compose.yml pull

# Rebuild custom images
./deployment/prod/build-all.sh

# Restart with new images
docker-compose -f deployment/prod/docker-compose.yml up -d
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune
```

## Support

For issues and questions:

1. Check logs: `docker-compose logs`
2. Review troubleshooting section above
3. Check main documentation: `deployment/README.md`
4. Review service-specific documentation in `packages/*/README.md`

## Related Documentation

- [Main Deployment README](../README.md)
- [Development Environment](../dev/README.md)
- [Docker Configuration](../docker/README.md)
- [Restate Infrastructure](../../scripts/RESTATE_INFRASTRUCTURE.md)
