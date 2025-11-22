# Development Environment Setup

This guide covers setting up and using the local development environment for the Social Bookmarks application with Restate workflow orchestration.

## Overview

The development environment runs infrastructure services (PostgreSQL, Restate) in Docker containers while keeping application services (web, server) running locally for fast iteration and debugging.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Developer's Browser/Tools                           │
│                                                                           │
│  http://favy.localhost          http://server.favy.localhost             │
│  http://web.favy.localhost      http://restate.favy.localhost            │
│                                                                           │
│  ✨ .localhost domains work automatically - no DNS setup needed!         │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Caddy Reverse Proxy                                 │
│                      (Docker Container)                                  │
│                         Port: 80, 443                                    │
│                                                                           │
│  Routing Rules:                                                          │
│  • favy.localhost, web.favy.localhost → localhost:3001 (Web App)        │
│  • server.favy.localhost              → localhost:3000 (API Server)     │
│  • restate.favy.localhost             → localhost:9070 (Restate Admin)  │
│  • restate.favy.localhost/ingress     → localhost:8080 (Restate API)    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Web App    │    │  API Server  │    │   Restate    │
│ localhost:   │    │ localhost:   │    │ localhost:   │
│    3001      │    │    3000      │    │ 9070 / 8080  │
│              │    │              │    │              │
│ (Local/PM2)  │    │ (Local/PM2)  │    │  (Docker)    │
└──────────────┘    └──────────────┘    └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                             ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  Port: 5432  │
                    │   (Docker)   │
                    └──────────────┘
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

#### Using Caddy Proxy (Recommended - Works Immediately!)

Caddy uses `.localhost` domains which automatically resolve in all modern browsers - **no DNS configuration needed!**

- **Web Application**: http://favy.localhost or http://web.favy.localhost
- **API Server**: http://server.favy.localhost
- **Restate Admin UI**: http://restate.favy.localhost
- **Restate Ingress**: http://restate.favy.localhost/ingress

✨ **Just works!** Chrome, Firefox, Safari, and Edge automatically resolve `*.localhost` to `127.0.0.1`

#### Direct Port Access (Alternative)

You can also access services directly via ports if preferred:

- **Web Application**: http://localhost:3001
- **API Server**: http://localhost:3000
- **Restate Admin UI**: http://localhost:9070
- **Restate Ingress**: http://localhost:8080
- **PostgreSQL**: localhost:5432 (user: postgres, password: postgres, database: bookmarks_dev)

## Caddy Proxy Integration

The development environment includes Caddy as a reverse proxy, providing clean, memorable URLs for accessing services. Caddy runs in Docker and proxies requests to your local services (web, server) running on the host machine.

### How It Works

```
Browser → Caddy (Docker:80) → host.docker.internal:3001 (Your local web app)
                            → host.docker.internal:3000 (Your local API server)
                            → host.docker.internal:9070 (Restate in Docker)
```

Caddy uses `host.docker.internal` to reach services running on your host machine. This is already configured - no changes needed!

### Benefits

- **Zero Configuration**: Uses `.localhost` domains that work automatically in all modern browsers
- **Clean URLs**: Access services via `http://favy.localhost` instead of `http://localhost:3001`
- **Production-like**: Subdomain routing matches production architecture
- **No Port Juggling**: Forget about port numbers during development
- **No DNS Setup**: `.localhost` domains automatically resolve to `127.0.0.1` in Chrome, Firefox, Safari, and Edge
- **WebSocket Support**: Built-in WebSocket proxying for Restate admin UI

### Why .localhost Domains?

Modern browsers (since 2018) automatically resolve `*.localhost` to `127.0.0.1` without any configuration. This means:

- ✅ No DNS configuration needed
- ✅ No hosts file editing
- ✅ No dnsmasq installation
- ✅ Works immediately after starting Caddy
- ✅ Works on macOS, Linux, and Windows
- ✅ Works in all modern browsers

**Supported browsers:**

- Chrome/Chromium 64+ (2018)
- Firefox 60+ (2018)
- Safari 11.1+ (2018)
- Edge 79+ (2020)

### Using the Proxy

Caddy works immediately after starting - just use `.localhost` domains!

**Web Application:**

```bash
# Open in browser
open http://favy.localhost
# or
open http://web.favy.localhost
```

**API Server:**

```bash
# Test API endpoints
curl http://server.favy.localhost/api/health
curl http://server.favy.localhost/api/bookmarks

# POST requests work too
curl -X POST http://server.favy.localhost/api/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "title": "Example"}'
```

**Restate Admin UI:**

```bash
# Open admin interface
open http://restate.favy.localhost

# Access specific pages
open http://restate.favy.localhost/deployments
open http://restate.favy.localhost/invocations
```

**Restate Ingress:**

```bash
# Invoke workflows via ingress
curl -X POST http://restate.favy.localhost/ingress/bookmarkEnrichment/enrich \
  -H "Content-Type: application/json" \
  -d '{"bookmarkId": "123", "userId": "user-1"}'
```

### Proxy Configuration

The Caddy configuration is located at `deployment/dev/Caddyfile`. It includes:

- `.localhost` domain routing (works automatically in all modern browsers!)
- `host.docker.internal` to reach services on your host machine (web, server run locally, not in Docker!)
- Custom error messages when services are unavailable
- WebSocket upgrade support (automatic)
- Request/response header preservation

**Example routing rule:**

```caddyfile
favy.localhost {
    # host.docker.internal lets Caddy (in Docker) reach your local web app
    reverse_proxy host.docker.internal:3001
    handle_errors {
        respond "Web application is not running. Start it with: cd apps/web && bun run dev" 503
    }
}
```

**Key Points**:

- `.localhost` domains automatically resolve to `127.0.0.1` in all modern browsers - no DNS setup needed!
- Your web and server apps run on your host machine (not in Docker)
- Caddy runs in Docker and uses `host.docker.internal` to reach them
- Everything is already configured correctly!

### Verifying Proxy Status

Check if Caddy is running and accessible:

```bash
cd deployment/dev
./status.sh
```

The status script will show:

- Caddy container health
- URL accessibility tests
- Backend service status
- Any configuration issues

### Disabling the Proxy

If you prefer direct port access, you can:

1. **Stop Caddy only:**

   ```bash
   cd deployment/dev
   docker-compose stop caddy
   ```

2. **Use direct URLs** - All services remain accessible via `localhost:PORT`

3. **Remove from startup** - Comment out Caddy service in `docker-compose.yml`

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

| Service         | Port    | Proxy URL                             | Purpose                         |
| --------------- | ------- | ------------------------------------- | ------------------------------- |
| Caddy Proxy     | 80, 443 | -                                     | Reverse proxy (Docker)          |
| Web Application | 3001    | http://favy.localhost                 | Frontend (runs locally)         |
| API Server      | 3000    | http://server.favy.localhost          | Backend API (runs locally)      |
| Restate Worker  | 9080    | -                                     | Workflow service (runs locally) |
| PostgreSQL      | 5432    | -                                     | Database (Docker)               |
| Restate Ingress | 8080    | http://restate.favy.localhost/ingress | Workflow invocations (Docker)   |
| Restate Admin   | 9070    | http://restate.favy.localhost         | Admin UI and API (Docker)       |
| Caddy Admin API | 2019    | -                                     | Caddy management (Docker)       |

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

### Issue: "Cannot access http://favy or other .favy domains"

**Solution**: Configure DNS resolution for .favy domains:

1. **Check DNS configuration**:

   ```bash
   # Test if domain resolves
   ping -c 1 favy
   nslookup favy
   ```

2. **Configure DNS** - See [DNS Setup Guide](./DNS_SETUP.md) for your OS

3. **Fallback to hosts file**:

   ```bash
   # macOS/Linux
   sudo nano /etc/hosts

   # Add these lines:
   127.0.0.1 favy
   127.0.0.1 web.favy
   127.0.0.1 server.favy
   127.0.0.1 restate.favy
   ```

4. **Verify Caddy is running**:

   ```bash
   cd deployment/dev
   ./status.sh
   ```

### Issue: "Proxy returns 502 Bad Gateway"

**Solution**: Backend service is not running:

1. **Check which service is down**:

   ```bash
   cd deployment/dev
   ./status.sh
   ```

2. **Start the missing service**:

   ```bash
   # For web app
   cd apps/web && bun run dev

   # For API server
   cd apps/server && bun run dev

   # For infrastructure
   cd deployment/dev && ./start.sh
   ```

3. **Check error message** - Caddy provides helpful error messages indicating which service to start

### Issue: "Proxy returns 503 Service Unavailable"

**Solution**: Same as 502 - backend service is not running. Follow the steps above.

### Issue: "Port 80 already in use"

**Solution**: Another service is using port 80:

1. **Find the conflicting process**:

   ```bash
   # macOS/Linux
   sudo lsof -i :80

   # Kill the process
   sudo kill -9 <PID>
   ```

2. **Or disable Caddy**:

   ```bash
   cd deployment/dev
   docker-compose stop caddy

   # Use direct port access instead
   ```

3. **Or change Caddy ports** - Edit `docker-compose.yml` to use different ports

### Issue: "Caddy container won't start"

**Solution**: Check Caddy configuration and logs:

1. **Validate Caddyfile syntax**:

   ```bash
   cd deployment/dev
   docker run --rm -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile caddy:2-alpine caddy validate --config /etc/caddy/Caddyfile
   ```

2. **Check Caddy logs**:

   ```bash
   cd deployment/dev
   docker-compose logs caddy
   ```

3. **Restart Caddy**:

   ```bash
   cd deployment/dev
   docker-compose restart caddy
   ```

### Issue: "WebSocket connections fail through proxy"

**Solution**: Caddy automatically handles WebSocket upgrades, but verify:

1. **Check Restate is accessible**:

   ```bash
   curl http://restate.favy/health
   ```

2. **Test direct connection**:

   ```bash
   # If direct works but proxy doesn't
   curl http://localhost:9070/health
   ```

3. **Check Caddy logs** for WebSocket upgrade errors:

   ```bash
   docker-compose logs caddy | grep -i websocket
   ```

### Issue: "Proxy works but requests are slow"

**Solution**: This is usually not a proxy issue, but you can verify:

1. **Compare response times**:

   ```bash
   # Through proxy
   time curl http://server.favy/api/health

   # Direct
   time curl http://localhost:3000/api/health
   ```

2. **Check Caddy resource usage**:

   ```bash
   docker stats bookmarks-dev-caddy
   ```

3. **Review Caddy access logs** for slow requests:

   ```bash
   docker-compose logs caddy | grep -E "[0-9]{3,}ms"
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
