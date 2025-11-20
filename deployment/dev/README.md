# Development Environment Setup

This guide covers setting up and using the local development environment for the Social Bookmarks application with Restate workflow orchestration.

## Overview

The development environment runs infrastructure services (PostgreSQL, Restate) in Docker containers while keeping application services (web, server) running locally for fast iteration and debugging.

### Architecture

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
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before starting, ensure you have the following installed:

- **Docker Desktop** (or Docker Engine + Docker Compose)

  - macOS: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
  - Linux: Install via package manager
  - Windows: [Download Docker Desktop](https://www.docker.com/products/docker-desktop)

- **Node.js 18+** or **Bun**

  - Bun (recommended): `curl -fsSL https://bun.sh/install | bash`
  - Node.js: [Download from nodejs.org](https://nodejs.org/)

- **Git**
  - macOS: Included with Xcode Command Line Tools
  - Linux: `sudo apt-get install git` or equivalent
  - Windows: [Download from git-scm.com](https://git-scm.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fav-book
```

### 2. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 3. Configure Environment

```bash
# Copy the environment templates
cd deployment/dev
cp .env.server.example .env.server
cp .env.web.example .env.web

# Optional: Edit environment variables
nano .env.server
nano .env.web
```

The default configuration works out of the box for local development. You only need to modify it if you want to:

- Use different ports
- Configure OAuth providers (Twitter, LinkedIn)
- Set up email service (Resend)
- Configure AI services (LM Studio, OpenAI)

### 4. Start Everything with One Command

```bash
cd deployment/dev
./dev.sh
```

This script will:

- Install dotenvx if not already installed
- Start PostgreSQL and Restate in Docker containers
- Start the API server with `.env.server` configuration
- Start the web app with `.env.web` configuration
- Display all service URLs

**Or start services individually:**

```bash
# Start infrastructure only
./start.sh

# Then start app services in separate terminals using dotenvx
cd ../../
dotenvx run --env-file=deployment/dev/.env.server -- bun run --cwd apps/server dev
dotenvx run --env-file=deployment/dev/.env.web -- bun run --cwd apps/web dev
```

### 5. Access the Application

- **Web Application**: http://localhost:3001
- **API Server**: http://localhost:3000
- **Restate Admin UI**: http://localhost:9070
- **PostgreSQL**: localhost:5432 (user: postgres, password: postgres, database: bookmarks_dev)

## Development Workflow

### Daily Workflow

1. **Start infrastructure** (if not already running):

   ```bash
   cd deployment/dev
   ./start.sh
   ```

2. **Start application services** in separate terminals:

   ```bash
   # Terminal 1
   cd apps/server && bun run dev

   # Terminal 2
   cd apps/web && bun run dev

   # Terminal 3
   cd packages/restate && bun run dev
   ```

3. **Develop and test** - Changes to application code will hot-reload automatically

4. **Stop services** when done:
   ```bash
   cd deployment/dev
   ./stop.sh
   ```

### Working with the Database

**View database contents:**

```bash
# Connect to PostgreSQL
docker exec -it bookmarks-dev-postgres psql -U postgres -d bookmarks_dev

# Run queries
SELECT * FROM users;
\dt  # List tables
\q   # Quit
```

**Run migrations:**

```bash
cd packages/db
bun run prisma migrate dev
```

**Reset database:**

```bash
cd deployment/dev
./clean.sh  # Removes all data
./start.sh  # Fresh start
```

### Working with Restate

**View registered services:**

```bash
# Using curl
curl http://localhost:9070/deployments

# Or visit the admin UI
open http://localhost:9070
```

**Manually register Restate worker:**

```bash
curl -X POST http://localhost:9070/deployments \
  -H "Content-Type: application/json" \
  -d '{"uri": "http://host.docker.internal:9080"}'
```

**Invoke a workflow:**

```bash
curl -X POST http://localhost:8080/bookmarkEnrichment/enrich \
  -H "Content-Type: application/json" \
  -d '{"bookmarkId": "123", "userId": "user-1"}'
```

## Management Scripts

### start.sh

Starts all infrastructure services and runs database migrations.

```bash
./start.sh              # Normal start
./start.sh --clean      # Clean start (removes existing data)
```

### stop.sh

Stops all infrastructure services while preserving data.

```bash
./stop.sh               # Stop services
./stop.sh --remove      # Stop and remove containers (keep volumes)
```

### clean.sh

Completely removes all services and data for a fresh start.

```bash
./clean.sh              # Clean with confirmation
./clean.sh --force      # Clean without confirmation
```

**Warning**: This deletes all database data and Restate state!

### status.sh

Displays the current status of all infrastructure services.

```bash
./status.sh             # Show service status
./status.sh --verbose   # Show detailed status with logs
./status.sh --json      # Output status in JSON format
```

## Port Reference

| Service         | Port | Purpose                         |
| --------------- | ---- | ------------------------------- |
| Web Application | 3001 | Frontend (runs locally)         |
| API Server      | 3000 | Backend API (runs locally)      |
| Restate Worker  | 9080 | Workflow service (runs locally) |
| PostgreSQL      | 5432 | Database (Docker)               |
| Restate Ingress | 8080 | Workflow invocations (Docker)   |
| Restate Admin   | 9070 | Admin UI and API (Docker)       |

## Environment Variables

### Required Variables

These are set by default in `.env.development.example`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bookmarks_dev

# Restate
RESTATE_INGRESS_URL=http://localhost:8080
RESTATE_ADMIN_URL=http://localhost:9070
RESTATE_SERVICE_PORT=9080

# API Server
BETTER_AUTH_SECRET=dev-secret-change-in-production-minimum-32-chars
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
```

### Optional Variables

Configure these for additional features:

**OAuth Providers:**

```bash
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

**Email Service (Resend):**

```bash
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=onboarding@resend.dev
```

**AI Services:**

```bash
# AI Provider Selection (default: ollama)
AI_PROVIDER=ollama  # or "lmstudio"

# LM Studio Configuration (if using lmstudio)
LM_STUDIO_API_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=llama-3.2-3b-instruct
LM_STUDIO_MAX_TOKENS=1000
LM_STUDIO_TEMPERATURE=0.7

# Ollama Configuration (if using ollama)
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_MAX_TOKENS=1000
OLLAMA_TEMPERATURE=0.7

# AI Provider Validation
AI_PROVIDER_VALIDATE_ON_STARTUP=true
AI_PROVIDER_STRICT_MODE=false
```

## Troubleshooting

### Services Won't Start

**Check Docker is running:**

```bash
docker info
```

**Check for port conflicts:**

```bash
# macOS/Linux
lsof -i :5432
lsof -i :8080
lsof -i :9070

# Kill conflicting process
kill -9 <PID>
```

**View service logs:**

```bash
cd deployment/dev
docker-compose logs postgres
docker-compose logs restate
```

### Database Connection Errors

**Test database connectivity:**

```bash
docker exec bookmarks-dev-postgres psql -U postgres -d bookmarks_dev -c "SELECT 1;"
```

**Check database is healthy:**

```bash
cd deployment/dev
./status.sh
```

**Reset database:**

```bash
cd deployment/dev
./clean.sh
./start.sh
```

### Restate Connection Errors

**Check Restate is healthy:**

```bash
curl http://localhost:9070/health
```

**View Restate logs:**

```bash
cd deployment/dev
docker-compose logs -f restate
```

**Restart Restate:**

```bash
cd deployment/dev
docker-compose restart restate
```

### Application Won't Connect to Infrastructure

**Verify services are running:**

```bash
cd deployment/dev
./status.sh
```

**Check environment variables:**

```bash
# In apps/server or apps/web
cat .env
```

**Ensure correct URLs:**

- Database: `postgresql://postgres:postgres@localhost:5432/bookmarks_dev`
- Restate Ingress: `http://localhost:8080`
- Restate Admin: `http://localhost:9070`

### Hot Reload Not Working

**For web application:**

```bash
# Clear Vite cache
cd apps/web
rm -rf node_modules/.vite
bun run dev
```

**For API server:**

```bash
# Restart the server
cd apps/server
# Ctrl+C to stop
bun run dev
```

### Restate Worker Not Registering

**Check worker is running:**

```bash
# Should see output indicating server is listening
cd packages/restate
bun run dev
```

**Manually register worker:**

```bash
curl -X POST http://localhost:9070/deployments \
  -H "Content-Type: application/json" \
  -d '{"uri": "http://host.docker.internal:9080"}'
```

**Check registration:**

```bash
curl http://localhost:9070/deployments
```

### Database Migrations Fail

**Check database is accessible:**

```bash
cd deployment/dev
./status.sh
```

**Run migrations manually:**

```bash
cd packages/db
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookmarks_dev"
bun run prisma migrate deploy
```

**Reset migrations (development only):**

```bash
cd packages/db
bun run prisma migrate reset
```

## Common Issues and Solutions

### Issue: "Port already in use"

**Solution**: Find and kill the process using the port:

```bash
# macOS/Linux
lsof -i :5432  # or :8080, :9070, etc.
kill -9 <PID>

# Or use different ports in .env.development
```

### Issue: "Cannot connect to Docker daemon"

**Solution**: Start Docker Desktop or Docker service:

```bash
# macOS: Open Docker Desktop application
# Linux: sudo systemctl start docker
```

### Issue: "Database does not exist"

**Solution**: Recreate the database:

```bash
cd deployment/dev
./clean.sh
./start.sh
```

### Issue: "Restate workflows not found"

**Solution**: Ensure Restate worker is running and registered:

```bash
# Start worker
cd packages/restate
bun run dev

# Check registration
curl http://localhost:9070/deployments
```

### Issue: "CORS errors in browser"

**Solution**: Check CORS_ORIGIN in environment:

```bash
# In apps/server/.env
CORS_ORIGIN=http://localhost:3001
```

## Performance Tips

### Speed Up Docker on macOS

1. **Increase Docker resources**:

   - Docker Desktop → Settings → Resources
   - Increase CPUs to 4+
   - Increase Memory to 8GB+

2. **Use Docker volumes instead of bind mounts** (already configured)

3. **Enable VirtioFS** (Docker Desktop 4.6+):
   - Docker Desktop → Settings → General
   - Enable "VirtioFS"

### Speed Up Hot Reload

1. **Use Bun instead of Node.js** (faster startup and hot reload)

2. **Exclude node_modules from file watchers**:

   - Already configured in Vite and TypeScript configs

3. **Use SSD for project directory**

## Best Practices

### Development Workflow

1. **Keep infrastructure running** - Start once, use all day
2. **Use hot reload** - Don't restart services unnecessarily
3. **Check status regularly** - Use `./status.sh` to verify health
4. **Clean up periodically** - Use `./clean.sh` weekly for fresh start

### Database Management

1. **Use migrations** - Never modify schema directly
2. **Backup before experiments** - Use `./clean.sh` to reset
3. **Test migrations** - Run `prisma migrate dev` before committing

### Restate Workflows

1. **Check registration** - Verify workflows are registered after changes
2. **Monitor admin UI** - Use http://localhost:9070 to debug workflows
3. **Test locally first** - Invoke workflows via curl before UI testing

## Additional Resources

- [Main Deployment README](../README.md)
- [Production Deployment Guide](../prod/README.md)
- [Restate Documentation](https://docs.restate.dev/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Documentation](https://www.prisma.io/docs/)

## Getting Help

1. **Check service status**: `./status.sh --verbose`
2. **View logs**: `docker-compose logs -f <service>`
3. **Check this troubleshooting guide**
4. **Review Restate admin UI**: http://localhost:9070
5. **Open an issue** in the project repository

## Next Steps

Once your development environment is running:

1. **Explore the codebase** - Start with `apps/web` and `apps/server`
2. **Make changes** - Edit code and see hot reload in action
3. **Test workflows** - Create bookmarks and watch Restate process them
4. **Read the docs** - Check out the main README and user guide
5. **Contribute** - Follow the contribution guidelines

Happy coding! 🚀
