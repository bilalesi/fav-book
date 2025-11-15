# Trigger.dev Background Processing Infrastructure

This directory contains the self-hosted infrastructure for the background processing pipeline that enriches bookmarks with AI-generated summaries, extracted metadata, and downloaded media content.

## Architecture Overview

The infrastructure consists of the following services:

- **Trigger.dev Webapp**: Web interface and API for workflow management
- **Trigger.dev Supervisor**: Worker that executes background tasks
- **PostgreSQL**: Database for Trigger.dev state
- **Redis**: Cache and queue for Trigger.dev
- **MinIO**: S3-compatible object storage for media files
- **Container Registry**: Docker registry for deployment images
- **Cobalt API**: Media download service for social platforms
- **Docker Socket Proxy**: Security layer for Docker access

## Prerequisites

- Docker 20.10.0+
- Docker Compose 2.20.0+
- 8GB+ RAM available
- 20GB+ disk space

## Quick Start

### 1. Automated Setup (Recommended)

Run the setup script to automatically configure and start all services:

```bash
./setup.sh
```

The script will:

- Check prerequisites
- Create `.env` file from template
- Generate secure random keys
- Set up registry authentication
- Start all Docker services
- Display access information

### 2. Manual Setup

If you prefer manual setup:

```bash
# Copy environment template
cp .env.example .env

# Edit .env and configure your settings
nano .env

# Generate secure keys (optional)
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Update .env with generated keys
sed -i "s/your-secret-key-here-change-in-production/$SECRET_KEY/" .env
sed -i "s/your-encryption-key-here-change-in-production/$ENCRYPTION_KEY/" .env

# Create Docker network
docker network create trigger-network

# Start services
docker-compose up -d

# Start Cobalt API
docker-compose -f cobalt-compose.yml up -d
```

## Service Access

After setup, services are available at:

| Service            | URL                   | Credentials                        |
| ------------------ | --------------------- | ---------------------------------- |
| Trigger.dev Webapp | http://localhost:8030 | Magic link (check logs)            |
| MinIO Console      | http://localhost:9001 | minioadmin / minioadmin            |
| Container Registry | localhost:5000        | registry-user / very-secure-indeed |
| Cobalt API         | http://localhost:9002 | No auth required                   |

## Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@postgres:5432/triggerdev

# Security (CHANGE IN PRODUCTION!)
SECRET_KEY=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here

# Access URL
LOGIN_ORIGIN=http://localhost:8030

# Email (optional - logs to console if not set)
EMAIL_TRANSPORT=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password

# Worker Token (generated on first run)
TRIGGER_WORKER_TOKEN=tr_wgt_xxxxxxxxxxxxx
```

### Getting the Worker Token

The worker token is generated when you first log in to the webapp:

1. Start the services: `docker-compose up -d`
2. Check webapp logs: `docker-compose logs -f webapp`
3. Look for the worker token in the logs (starts with `tr_wgt_`)
4. Copy the token to your `.env` file
5. Restart the supervisor: `docker-compose restart supervisor`

Alternatively, the token is stored in a shared volume and can be referenced as:

```bash
TRIGGER_WORKER_TOKEN=file:///home/node/shared/worker_token
```

## Usage

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start Cobalt API
docker-compose -f cobalt-compose.yml up -d

# Or use the setup script
./setup.sh
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop Cobalt API
docker-compose -f cobalt-compose.yml down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Viewing Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f webapp
docker-compose logs -f supervisor
docker-compose logs -f cobalt

# View last 100 lines
docker-compose logs --tail=100 webapp
```

### Checking Service Health

```bash
# Check service status
docker-compose ps

# Check specific service health
docker-compose ps webapp

# Check all services are healthy
docker-compose ps | grep healthy
```

## Trigger.dev CLI Setup

### Login to Self-Hosted Instance

```bash
# Login with API URL
npx trigger.dev@latest login -a http://localhost:8030

# Or with a profile name
npx trigger.dev@latest login -a http://localhost:8030 --profile self-hosted
```

### Initialize a Project

```bash
# From your application directory
npx trigger.dev@latest init -p <project-ref> -a http://localhost:8030
```

### Deploy Tasks

```bash
# Deploy to self-hosted instance
npx trigger.dev@latest deploy

# Or with specific profile
npx trigger.dev@latest deploy --profile self-hosted
```

### Switch Profiles

```bash
# Interactive profile switcher
npx trigger.dev@latest switch

# Switch to specific profile
npx trigger.dev@latest switch self-hosted

# List all profiles
npx trigger.dev@latest list-profiles
```

## Registry Setup

The container registry is used to store deployment images.

### Login to Registry

```bash
# Login from your development machine
docker login -u registry-user localhost:5000

# Enter password when prompted: very-secure-indeed
```

### Change Registry Credentials (Production)

1. Generate new htpasswd entry:

```bash
docker run --rm --entrypoint htpasswd httpd:2 -Bbn <username> <password>
```

2. Update `registry/auth/.htpasswd` with the output

3. Update `.env` with new credentials:

```bash
REGISTRY_USERNAME=<username>
REGISTRY_PASSWORD=<password>
```

4. Restart services:

```bash
docker-compose restart registry webapp supervisor
```

## MinIO (Object Storage) Setup

MinIO provides S3-compatible storage for media files.

### Access MinIO Console

1. Open http://localhost:9001
2. Login with credentials from `.env` (default: minioadmin/minioadmin)

### Buckets

Two buckets are automatically created:

- `packets`: Used by Trigger.dev for payloads
- `bookmark-media`: Used for downloaded media files

### Create Additional Buckets

```bash
# Using MinIO client
docker run --rm -it --network trigger-network \
  --entrypoint /bin/sh minio/mc -c "
  mc alias set myminio http://minio:9000 minioadmin minioadmin;
  mc mb myminio/my-new-bucket;
  mc anonymous set download myminio/my-new-bucket;
  "
```

## Cobalt API (Media Downloader)

Cobalt API is used to download media from social platforms and websites.

### Test Cobalt API

```bash
# Check server info
curl http://localhost:9002/api/serverInfo

# Download media (example)
curl -X POST http://localhost:9002/api/json \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://twitter.com/user/status/123",
    "videoQuality": "1080"
  }'
```

### Supported Platforms

Cobalt supports downloading from:

- Twitter/X
- YouTube
- TikTok
- Instagram
- Reddit
- And many more...

See [Cobalt documentation](https://github.com/imputnet/cobalt) for full list.

## Troubleshooting

### Services Won't Start

```bash
# Check Docker daemon is running
docker info

# Check for port conflicts
lsof -i :8030  # Trigger.dev webapp
lsof -i :9000  # MinIO API
lsof -i :9001  # MinIO console
lsof -i :9002  # Cobalt API
lsof -i :5000  # Registry

# Check service logs
docker-compose logs webapp
```

### Worker Not Connecting

1. Check worker token is set in `.env`
2. Verify webapp is healthy: `docker-compose ps webapp`
3. Check supervisor logs: `docker-compose logs supervisor`
4. Restart supervisor: `docker-compose restart supervisor`

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d triggerdev -c "SELECT 1;"
```

### MinIO Not Accessible

```bash
# Check MinIO is running
docker-compose ps minio

# Check MinIO logs
docker-compose logs minio

# Verify buckets exist
docker-compose exec minio mc ls /data
```

### Registry Authentication Fails

```bash
# Regenerate htpasswd file
docker run --rm --entrypoint htpasswd httpd:2 -Bbn registry-user very-secure-indeed > registry/auth/.htpasswd

# Restart registry
docker-compose restart registry

# Login again
docker login -u registry-user localhost:5000
```

### Cobalt API Not Responding

```bash
# Check Cobalt is running
docker-compose -f cobalt-compose.yml ps

# Check Cobalt logs
docker-compose -f cobalt-compose.yml logs cobalt

# Restart Cobalt
docker-compose -f cobalt-compose.yml restart cobalt
```

## Monitoring

### View Resource Usage

```bash
# View container stats
docker stats

# View specific service stats
docker stats trigger-webapp trigger-supervisor
```

### Check Disk Usage

```bash
# Check volume sizes
docker system df -v

# Check specific volume
docker volume inspect trigger_postgres-data
```

### Health Checks

All services have health checks configured. Check status:

```bash
# View health status
docker-compose ps

# Services should show "healthy" status
```

## Backup and Restore

### Backup PostgreSQL Database

```bash
# Create backup
docker-compose exec postgres pg_dump -U postgres triggerdev > backup.sql

# Or with timestamp
docker-compose exec postgres pg_dump -U postgres triggerdev > backup-$(date +%Y%m%d-%H%M%S).sql
```

### Restore PostgreSQL Database

```bash
# Restore from backup
docker-compose exec -T postgres psql -U postgres triggerdev < backup.sql
```

### Backup MinIO Data

```bash
# Backup MinIO data directory
docker run --rm -v trigger_minio-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/minio-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
```

### Restore MinIO Data

```bash
# Restore MinIO data
docker run --rm -v trigger_minio-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/minio-backup.tar.gz -C /data
```

## Security Considerations

### Production Deployment

Before deploying to production:

1. **Change all default passwords**:

   - PostgreSQL password
   - MinIO credentials
   - Registry credentials
   - SECRET_KEY and ENCRYPTION_KEY

2. **Enable HTTPS**:

   - Use a reverse proxy (nginx, Traefik)
   - Configure SSL certificates
   - Update LOGIN_ORIGIN to HTTPS URL

3. **Restrict network access**:

   - Don't expose all ports publicly
   - Use firewall rules
   - Consider VPN for internal services

4. **Enable authentication**:

   - Configure email transport for magic links
   - Set up GitHub OAuth
   - Use WHITELISTED_EMAILS to restrict access

5. **Regular backups**:

   - Automate database backups
   - Backup MinIO data
   - Store backups securely off-site

6. **Monitor and alert**:
   - Set up log aggregation
   - Configure alerts for failures
   - Monitor resource usage

## Scaling

### Horizontal Scaling

To add more workers:

1. Copy the supervisor service configuration
2. Give it a unique name
3. Start the additional worker:

```yaml
supervisor-2:
  image: ghcr.io/triggerdotdev/trigger.dev:latest
  container_name: trigger-supervisor-2
  # ... same configuration as supervisor
```

### Resource Limits

Configure resource limits in docker-compose.yml:

```yaml
supervisor:
  # ...
  deploy:
    resources:
      limits:
        cpus: "4"
        memory: 8G
      reservations:
        cpus: "2"
        memory: 4G
```

## Maintenance

### Update Services

```bash
# Pull latest images
docker-compose pull

# Restart services with new images
docker-compose up -d

# Or specific service
docker-compose pull webapp
docker-compose up -d webapp
```

### Clean Up

```bash
# Remove stopped containers
docker-compose rm

# Remove unused images
docker image prune

# Remove unused volumes (WARNING: deletes data)
docker volume prune

# Full cleanup (WARNING: deletes everything)
docker system prune -a --volumes
```

## Support

For issues and questions:

- Trigger.dev Documentation: https://trigger.dev/docs
- Trigger.dev GitHub: https://github.com/triggerdotdev/trigger.dev
- Cobalt Documentation: https://github.com/imputnet/cobalt
- MinIO Documentation: https://min.io/docs

## License

This infrastructure setup is part of the bookmark management system.
Individual components (Trigger.dev, Cobalt, MinIO) have their own licenses.
