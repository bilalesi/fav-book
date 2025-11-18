# Background Processing Infrastructure Setup

This document provides an overview of the background processing infrastructure for bookmark enrichment.

## Overview

The background processing pipeline enriches bookmarks with:

- AI-generated summaries using LM Studio
- Extracted keywords and tags
- Downloaded media content (videos, audio)
- Metadata extraction

## Architecture

The infrastructure consists of:

1. **Trigger.dev** - Workflow orchestration platform
2. **LM Studio** - Self-hosted LLM for AI summarization
3. **Cobalt API** - Media download service
4. **MinIO** - S3-compatible object storage
5. **PostgreSQL** - Database for Trigger.dev
6. **Redis** - Cache and queue for Trigger.dev

## Quick Start

### 1. Set Up Infrastructure

Navigate to the trigger directory and run the automated setup script:

```bash
cd apps/trigger
./start-infrastructure.sh
```

This follows the **official Trigger.dev documentation** and will start all required services automatically.

See [apps/trigger/QUICKSTART.md](./apps/trigger/QUICKSTART.md) for detailed instructions.

### 2. Set Up LM Studio

LM Studio runs separately on your machine:

1. Download LM Studio from https://lmstudio.ai
2. Install and launch the application
3. Download a model (recommended: `llama-3.2-3b-instruct`)
4. Enable "Local Server" in settings (default port: 1234)
5. Verify it's running: `curl http://localhost:1234/v1/models`

### 3. Configure Environment Variables

Add these to your main application's `.env` file:

```bash
# Trigger.dev
TRIGGER_API_KEY=tr_dev_xxxxxxxxxxxxx
TRIGGER_API_URL=http://localhost:8030
TRIGGER_PROJECT_ID=proj_xxxxxxxxxxxxx

# LM Studio
LM_STUDIO_API_URL=http://localhost:1234/v1
LM_STUDIO_MODEL=llama-3.2-3b-instruct
LM_STUDIO_MAX_TOKENS=1000
LM_STUDIO_TEMPERATURE=0.7

# Cobalt API
COBALT_API_URL=http://localhost:9002
COBALT_TIMEOUT=30000

# S3 Storage (MinIO)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=bookmark-media
S3_REGION=us-east-1

# Feature Flags
ENABLE_MEDIA_DOWNLOAD=true
ENABLE_AI_SUMMARIZATION=true
MAX_MEDIA_SIZE_MB=500
```

### 4. Verify Setup

Run the connectivity test:

```bash
cd apps/trigger
./test-connectivity.sh
```

All tests should pass.

## Service Access

After setup, services are available at:

| Service       | URL                   | Purpose                   |
| ------------- | --------------------- | ------------------------- |
| Trigger.dev   | http://localhost:8030 | Workflow management       |
| MinIO Console | http://localhost:9001 | Object storage management |
| Cobalt API    | http://localhost:9002 | Media download service    |
| LM Studio     | http://localhost:1234 | AI inference              |

## Development Workflow

### 1. Create Trigger.dev Tasks

Tasks are defined in `packages/trigger/src/tasks/`:

```typescript
import { task } from "@trigger.dev/sdk/v3";

export const enrichBookmark = task({
  id: "enrich-bookmark",
  run: async (payload) => {
    // Task implementation
  },
});
```

### 2. Deploy Tasks

```bash
npx trigger.dev@latest deploy
```

### 3. Trigger from Application

```typescript
import { enrichBookmark } from "@/trigger/tasks";

// Spawn workflow
await enrichBookmark.trigger({
  bookmarkId: "123",
  userId: "user-456",
});
```

## Monitoring

### View Workflow Executions

Access the Trigger.dev dashboard at http://localhost:8030 to:

- View workflow runs
- Check execution logs
- Monitor success/failure rates
- Debug failed workflows

### View Service Logs

```bash
cd apps/trigger

# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f webapp
docker-compose logs -f supervisor
```

### Check Service Health

```bash
cd apps/trigger
./test-connectivity.sh
```

## Maintenance

### Backup Database

```bash
cd apps/trigger
./maintenance.sh
# Select option 1: Backup Database
```

### Update Services

```bash
cd apps/trigger
./maintenance.sh
# Select option 5: Update Services
```

### Clean Up Resources

```bash
cd apps/trigger
./maintenance.sh
# Select option 4: Clean Up Docker Resources
```

## Troubleshooting

### Services Won't Start

```bash
# Check Docker is running
docker info

# Check for port conflicts
lsof -i :8030 :9000 :9001 :9002 :5000

# View logs
cd apps/trigger
docker-compose logs
```

### Worker Not Connecting

1. Check worker token is set in `apps/trigger/.env`
2. Get token from logs: `docker-compose logs webapp | grep TRIGGER_WORKER_TOKEN`
3. Add to `.env` and restart: `docker-compose restart supervisor`

### LM Studio Not Responding

1. Check LM Studio is running
2. Verify server is enabled in settings
3. Test connection: `curl http://localhost:1234/v1/models`
4. Check firewall settings

### Media Downloads Failing

1. Check Cobalt API is running: `curl http://localhost:9002/api/serverInfo`
2. View Cobalt logs: `docker-compose -f cobalt-compose.yml logs cobalt`
3. Restart Cobalt: `docker-compose -f cobalt-compose.yml restart cobalt`

### Storage Issues

1. Check MinIO is running: `curl http://localhost:9000/minio/health/live`
2. Access MinIO console: http://localhost:9001
3. Verify buckets exist: `packets` and `bookmark-media`
4. Check disk space: `docker system df`

## Scaling

### Add More Workers

To handle more concurrent workflows, add additional supervisor instances:

1. Edit `apps/trigger/docker-compose.yml`
2. Duplicate the `supervisor` service with a new name
3. Restart: `docker-compose up -d`

### Increase Resources

Edit `apps/trigger/docker-compose.yml` and add resource limits:

```yaml
supervisor:
  deploy:
    resources:
      limits:
        cpus: "8"
        memory: 16G
```

## Security Considerations

### Production Deployment

Before deploying to production:

1. **Change all default passwords** in `apps/trigger/.env`
2. **Enable HTTPS** using a reverse proxy
3. **Restrict network access** with firewall rules
4. **Set up email transport** for magic links
5. **Enable authentication** with GitHub OAuth or whitelisted emails
6. **Regular backups** of database and MinIO data

See [apps/trigger/README.md](./apps/trigger/README.md) for detailed security guidelines.

## Documentation

- [Quick Start Guide](./apps/trigger/QUICKSTART.md) - Get started in 5 minutes
- [Full Documentation](./apps/trigger/README.md) - Comprehensive guide
- [Maintenance Guide](./apps/trigger/README.md#maintenance) - Backup, restore, updates

## Support

For issues and questions:

- Check [apps/trigger/README.md](./apps/trigger/README.md) troubleshooting section
- View service logs: `docker-compose logs [service-name]`
- Run connectivity tests: `./test-connectivity.sh`
- Trigger.dev docs: https://trigger.dev/docs
- Cobalt docs: https://github.com/imputnet/cobalt

## Next Steps

Once infrastructure is set up:

1. Implement Trigger.dev integration package (Task 3 in implementation plan)
2. Create AI SDK integration (Task 4)
3. Implement media downloader (Task 5)
4. Set up storage service (Task 6)
5. Integrate with bookmark creation (Task 7)

See [.kiro/specs/background-processing-pipeline/tasks.md](./.kiro/specs/background-processing-pipeline/tasks.md) for the complete implementation plan.
