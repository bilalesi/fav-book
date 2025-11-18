# Quick Start Guide

Get the background processing infrastructure up and running in 5 minutes using the official Trigger.dev Docker setup.

## Prerequisites

- Docker 20.10.0+ and Docker Compose 2.20.0+ installed
- 8GB+ RAM available
- 20GB+ disk space

## Step 1: Run Setup Script

```bash
cd apps/trigger
./start-infrastructure.sh
```

This automated script will:

- Create `.env` files with secure random secrets
- Start Trigger.dev webapp + worker (combined setup)
- Start Cobalt API for media downloads
- Create MinIO buckets (packets, bookmark-media)
- Display access information

## Step 2: Access Trigger.dev

1. Open http://localhost:8030 in your browser
2. Check the webapp logs for the magic link:
   ```bash
   cd docker
   docker-compose -f webapp/docker-compose.yml logs -f webapp
   ```
3. Click the magic link to login

## Step 3: Worker Token (Automatic!)

✅ The combined setup uses automatic bootstrap - no manual token configuration needed!

The worker token is automatically generated and shared between webapp and worker through a shared volume. The worker will connect automatically.

## Step 4: Verify Everything Works

Run the connectivity test:

```bash
./test-connectivity.sh
```

All tests should pass ✅

## Step 5: Access Other Services

### MinIO Console (Object Storage)

- URL: http://localhost:9001
- Username: `admin` (or check your .env)
- Password: `very-safe-password` (or check your .env)
- Buckets: `packets`, `bookmark-media`

### Cobalt API (Media Downloader)

- URL: http://localhost:9002
- Test: `curl http://localhost:9002/api/serverInfo`

### Container Registry

- URL: localhost:5000
- Username: `registry-user`
- Password: `very-secure-indeed`

## Next Steps

1. **Initialize a Trigger.dev project** in your application:

   ```bash
   cd ../../  # Back to project root
   npx trigger.dev@latest init -p <project-ref> -a http://localhost:8030
   ```

2. **Create your first task** (see main project documentation)

3. **Deploy your tasks**:
   ```bash
   npx trigger.dev@latest deploy
   ```

## Using Make Commands

For convenience, use the Makefile:

```bash
make help          # Show all commands
make start         # Start services
make stop          # Stop services
make logs          # View logs
make status        # Check status
make health        # Run health checks
make backup        # Backup database
```

## Troubleshooting

### Services won't start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :8030 :9000 :9001 :9002 :5000

# View logs
cd docker
docker-compose -f webapp/docker-compose.yml logs
```

### Need help?

- Check the full [README.md](./README.md)
- View logs: `cd docker && docker-compose -f webapp/docker-compose.yml logs [service-name]`
- Run tests: `./test-connectivity.sh`

## Stopping Services

```bash
# Stop all services
cd docker
docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml down
cd ..
docker-compose -f cobalt-compose.yml down

# Or use make
make stop

# Stop and remove all data (WARNING: deletes everything)
make destroy
```

## Common Commands

```bash
# View all logs
cd docker && docker-compose -f webapp/docker-compose.yml logs -f

# View specific service logs
cd docker && docker-compose -f webapp/docker-compose.yml logs -f webapp
cd docker && docker-compose -f worker/docker-compose.yml logs -f supervisor

# Check service status
cd docker && docker-compose -f webapp/docker-compose.yml ps

# Restart a service
cd docker && docker-compose -f webapp/docker-compose.yml restart webapp

# Update services
make update
```

That's it! You're ready to start building background tasks. 🚀
