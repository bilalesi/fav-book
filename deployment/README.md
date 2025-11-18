# Deployment Infrastructure

Comprehensive deployment infrastructure for the Social Bookmarks application using Restate for durable workflow orchestration.

## Overview

This deployment infrastructure provides two distinct deployment modes:

1. **Development Mode**: Infrastructure services (PostgreSQL, Restate) run in Docker containers while application services (web, server) run locally for fast iteration and debugging
2. **Production Mode**: All services run in Docker containers with proper orchestration, health checks, monitoring, and resource management

## Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────────┐
│                     Development Environment                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Web (Local) │────────▶│Server (Local)│                  │
│  │  Port: 3001  │         │  Port: 3000  │                  │
│  └──────────────┘         └───────┬──────┘                  │
│                                    │                          │
│  ┌─────────────────────────────────┼──────────────────────┐ │
│  │           Docker Infrastructure  │                      │ │
│  │                                  ▼                      │ │
│  │  ┌──────────────┐    ┌──────────────┐                 │ │
│  │  │  PostgreSQL  │◀───│    Restate   │                 │ │
│  │  │  Port: 5432  │    │ Ingress:8080 │                 │ │
│  │  └──────────────┘    │  Admin: 9070 │                 │ │
│  │                      └──────────────┘                 │ │
│  │                                                        │ │
│  │  ┌──────────────┐                                     │ │
│  │  │Restate Worker│                                     │ │
│  │  │  Port: 9080  │                                     │ │
│  │  └──────────────┘                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                    Production Environment                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Docker Compose Orchestration                ││
│  │                                                           ││
│  │  ┌──────────┐      ┌──────────┐      ┌──────────┐      ││
│  │  │   Web    │─────▶│  Server  │─────▶│PostgreSQL│      ││
│  │  │Port: 3001│      │Port: 3000│      │Port: 5432│      ││
│  │  └──────────┘      └────┬─────┘      └──────────┘      ││
│  │                          │                               ││
│  │                          ▼                               ││
│  │                  ┌──────────────┐                       ││
│  │                  │   Restate    │                       ││
│  │                  │Ingress: 8080 │                       ││
│  │                  │ Admin:  9070 │                       ││
│  │                  └──────┬───────┘                       ││
│  │                          │                               ││
│  │                          ▼                               ││
│  │                  ┌──────────────┐                       ││
│  │                  │Restate Worker│                       ││
│  │                  │  Port: 9080  │                       ││
│  │                  └──────────────┘                       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
deployment/
├── README.md                          # This file
├── .env.development.example           # Development environment template
├── .env.production.example            # Production environment template
│
├── dev/                               # Development environment
│   ├── README.md                      # Development setup guide
│   ├── docker-compose.yml             # Infrastructure services only
│   ├── start.sh                       # Start development environment
│   ├── stop.sh                        # Stop development environment
│   ├── clean.sh                       # Clean and reset environment
│   └── status.sh                      # Check service status
│
├── prod/                              # Production environment
│   ├── README.md                      # Production deployment guide
│   ├── docker-compose.yml             # All services orchestration
│   ├── deploy.sh                      # Main deployment script
│   ├── rollback.sh                    # Rollback to previous version
│   ├── build-all.sh                   # Build all services
│   ├── build-web.sh                   # Build web application
│   ├── build-server.sh                # Build API server
│   ├── build-restate-worker.sh        # Build Restate worker
│   ├── health-check.sh                # Unified health check
│   ├── health-check-db.sh             # Database health check
│   ├── health-check-restate.sh        # Restate health check
│   ├── health-check-api.sh            # API server health check
│   └── health-check-web.sh            # Web application health check
│
├── docker/                            # Dockerfile definitions
│   ├── Dockerfile.web                 # Web application image
│   ├── Dockerfile.server              # API server image
│   └── Dockerfile.restate-worker      # Restate worker image
│
└── scripts/                           # Shared utility scripts
    ├── run-migrations.sh              # Execute database migrations
    ├── rollback-migrations.sh         # Rollback migrations
    ├── migration-status.sh            # Check migration status
    ├── validate-env.sh                # Validate environment variables
    ├── setup-env.sh                   # Interactive environment setup
    ├── view-logs.sh                   # View service logs
    ├── restart-service.sh             # Restart specific service
    ├── scale-service.sh               # Scale service replicas
    ├── service-status.sh              # Check service status
    ├── backup-db.sh                   # Backup database
    ├── restore-db.sh                  # Restore database
    ├── cleanup-old-images.sh          # Clean up Docker images
    └── cleanup-logs.sh                # Clean up old logs
```

## Quick Start

### Development Environment

1. **Prerequisites**

   - Docker and Docker Compose installed
   - Node.js 18+ or Bun installed
   - Git

2. **Setup**

   ```bash
   # Copy environment template
   cp deployment/.env.development.example deployment/.env.development

   # Edit environment variables (optional for basic setup)
   nano deployment/.env.development

   # Start infrastructure services
   cd deployment/dev
   ./start.sh
   ```

3. **Run Application Locally**

   ```bash
   # In terminal 1: Start API server
   cd apps/server
   bun run dev

   # In terminal 2: Start web application
   cd apps/web
   bun run dev
   ```

4. **Access Services**
   - Web Application: http://localhost:3001
   - API Server: http://localhost:3000
   - Restate Admin: http://localhost:9070
   - PostgreSQL: localhost:5432

### Production Deployment

1. **Prerequisites**

   - Docker and Docker Compose installed on production server
   - Domain name configured with DNS
   - SSL certificates (Let's Encrypt recommended)

2. **Setup**

   ```bash
   # Copy environment template
   cp deployment/.env.production.example deployment/.env.production

   # Edit with production credentials
   nano deployment/.env.production

   # Validate environment
   cd deployment/scripts
   ./validate-env.sh ../. env.production
   ```

3. **Build and Deploy**

   ```bash
   # Build all services
   cd deployment/prod
   ./build-all.sh

   # Deploy to production
   ./deploy.sh
   ```

4. **Verify Deployment**

   ```bash
   # Run health checks
   ./health-check.sh

   # Check service status
   docker-compose ps

   # View logs
   ../scripts/view-logs.sh
   ```

## Service Dependencies

Services start in the following order to ensure proper initialization:

1. **PostgreSQL** - Database must be ready first
2. **Restate Server** - Workflow orchestration platform
3. **Restate Worker** - Registers workflows with Restate
4. **API Server** - Backend API (depends on database and Restate)
5. **Web Application** - Frontend (depends on API server)

## Port Mappings

### Development

- `3000` - API Server (local)
- `3001` - Web Application (local)
- `5432` - PostgreSQL (Docker)
- `8080` - Restate Ingress (Docker)
- `9070` - Restate Admin (Docker)
- `9080` - Restate Worker (Docker)

### Production

- `80` - HTTP (redirects to HTTPS)
- `443` - HTTPS (Nginx reverse proxy)
- `5432` - PostgreSQL (internal only)
- `8080` - Restate Ingress (internal only)
- `9070` - Restate Admin (internal only)
- `9080` - Restate Worker (internal only)

## Environment Variables

### Required Variables

**Development:**

- `DATABASE_URL` - PostgreSQL connection string
- `RESTATE_INGRESS_URL` - Restate ingress endpoint
- `RESTATE_ADMIN_URL` - Restate admin endpoint
- `BETTER_AUTH_SECRET` - Authentication secret
- `BETTER_AUTH_URL` - API server URL
- `CORS_ORIGIN` - Frontend URL

**Production (additional):**

- `RESEND_API_KEY` - Email service API key
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` - OAuth credentials
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` - OAuth credentials
- `OPENAI_API_KEY` - AI service API key (or alternative)
- `STORAGE_*` - S3-compatible storage credentials

See `.env.development.example` and `.env.production.example` for complete lists.

## Health Checks

All services include health check endpoints:

- **PostgreSQL**: Connection test and query execution
- **Restate**: Ingress and admin API availability
- **API Server**: `/health` endpoint
- **Web Application**: HTTP response check

Run unified health check:

```bash
cd deployment/prod
./health-check.sh
```

## Database Migrations

Migrations are managed using Prisma:

```bash
# Check migration status
cd deployment/scripts
./migration-status.sh

# Run pending migrations
./run-migrations.sh

# Rollback last migration
./rollback-migrations.sh
```

## Monitoring and Logging

### View Logs

```bash
# All services
cd deployment/scripts
./view-logs.sh

# Specific service
./view-logs.sh api-server

# Follow logs
./view-logs.sh --follow web
```

### Service Status

```bash
# Check all services
cd deployment/prod
docker-compose ps

# Detailed status
../scripts/service-status.sh
```

## Backup and Recovery

### Database Backup

```bash
cd deployment/scripts
./backup-db.sh
```

Backups are stored in `deployment/backups/` with timestamps.

### Database Restore

```bash
cd deployment/scripts
./restore-db.sh backup-2024-01-15-120000.sql
```

## Troubleshooting

### Common Issues

**Services won't start:**

```bash
# Check Docker status
docker ps -a

# View service logs
cd deployment/scripts
./view-logs.sh <service-name>

# Restart specific service
./restart-service.sh <service-name>
```

**Database connection errors:**

```bash
# Test database connectivity
cd deployment/prod
./health-check-db.sh

# Check PostgreSQL logs
docker-compose logs postgres
```

**Restate workflows not registered:**

```bash
# Check Restate status
cd deployment/prod
./health-check-restate.sh

# Manually register workflows
curl -X POST http://localhost:9070/deployments \
  -H "Content-Type: application/json" \
  -d '{"uri": "http://restate-worker:9080"}'
```

**Port conflicts:**

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Getting Help

1. Check service logs: `deployment/scripts/view-logs.sh`
2. Run health checks: `deployment/prod/health-check.sh`
3. Review documentation in `deployment/dev/README.md` or `deployment/prod/README.md`
4. Check Restate admin UI: http://localhost:9070 (dev) or https://restate.yourdomain.com (prod)

## Security Considerations

### Development

- Use test credentials only
- Never commit `.env.development` with real secrets
- OAuth providers are optional for basic development

### Production

- Generate strong random secrets for all credentials
- Use SSL/TLS for all external connections
- Restrict database access to internal network only
- Enable firewall rules to limit service exposure
- Regularly update dependencies and Docker images
- Implement rate limiting and DDoS protection
- Set up monitoring and alerting
- Regular security audits and penetration testing

## Maintenance

### Regular Tasks

- Monitor disk space and clean up old logs/images
- Review and rotate logs regularly
- Update Docker images for security patches
- Backup database daily
- Test restore procedures monthly
- Review and update environment variables
- Monitor service health and performance metrics

### Cleanup Commands

```bash
# Remove old Docker images
cd deployment/scripts
./cleanup-old-images.sh

# Clean up old logs
./cleanup-logs.sh

# Remove unused volumes
docker volume prune
```

## Scaling

### Horizontal Scaling

```bash
# Scale API server
cd deployment/scripts
./scale-service.sh api-server 3

# Scale Restate workers
./scale-service.sh restate-worker 2
```

### Vertical Scaling

Edit resource limits in `deployment/prod/docker-compose.yml`:

```yaml
services:
  api-server:
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
```

## Additional Resources

- [Development Setup Guide](dev/README.md)
- [Production Deployment Guide](prod/README.md)
- [Operations Runbook](OPERATIONS.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [Restate Documentation](https://docs.restate.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## Support

For issues and questions:

1. Check the troubleshooting guide
2. Review service logs
3. Consult the operations runbook
4. Open an issue in the project repository

## License

This deployment infrastructure is part of the Social Bookmarks application.
