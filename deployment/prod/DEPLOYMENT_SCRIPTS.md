# Production Deployment Scripts

This directory contains all scripts needed for production deployment, rollback, and monitoring.

## Main Scripts

### deploy.sh

Main deployment orchestrator that handles the complete deployment workflow.

**Usage:**

```bash
./deploy.sh [OPTIONS]
```

**Options:**

- `--skip-migrations` - Skip database migration execution
- `--skip-health-check` - Skip health check verification
- `--skip-registration` - Skip Restate workflow registration
- `--env-file FILE` - Use custom environment file (default: .env.production)
- `--help` - Show help message

**What it does:**

1. Validates environment variables
2. Runs database migrations
3. Starts all services via Docker Compose
4. Verifies health checks
5. Registers Restate workflows
6. Sends notifications (if configured)

**Exit codes:**

- `0` - Success
- `1` - Validation failed
- `2` - Migration failed
- `3` - Service startup failed
- `4` - Health check failed
- `5` - Registration failed

**Example:**

```bash
# Full deployment
./deploy.sh

# Skip migrations (already applied)
./deploy.sh --skip-migrations

# Use custom env file
./deploy.sh --env-file .env.staging
```

---

### rollback.sh

Rolls back to a previous deployment version.

**Usage:**

```bash
./rollback.sh [OPTIONS]
```

**Options:**

- `--version VERSION` - Rollback to specific version (default: previous)
- `--skip-health-check` - Skip health check verification
- `--force` - Force rollback without confirmation
- `--help` - Show help message

**What it does:**

1. Identifies previous deployment version
2. Stops current services
3. Restores previous Docker images
4. Starts services with previous version
5. Verifies health checks
6. Sends notifications (if configured)

**Exit codes:**

- `0` - Success
- `1` - Rollback failed
- `2` - No previous version found
- `3` - Health check failed

**Example:**

```bash
# Rollback to previous version
./rollback.sh

# Rollback to specific version
./rollback.sh --version v1.2.3

# Force rollback without confirmation
./rollback.sh --force
```

---

### deployment-status.sh

Displays current deployment status and history.

**Usage:**

```bash
./deployment-status.sh [OPTIONS]
```

**Options:**

- `--json` - Output in JSON format
- `--history` - Show deployment history
- `--watch` - Continuously monitor status (updates every 10s)
- `--help` - Show help message

**Example:**

```bash
# Show current status
./deployment-status.sh

# Show deployment history
./deployment-status.sh --history

# Watch status continuously
./deployment-status.sh --watch

# Get JSON output for monitoring tools
./deployment-status.sh --json
```

---

### notify.sh

Sends notifications for deployment events.

**Usage:**

```bash
./notify.sh [OPTIONS] MESSAGE
```

**Options:**

- `--type TYPE` - Notification type: success, error, warning, info (default: info)
- `--title TITLE` - Notification title (default: "Deployment Notification")
- `--channel CHAN` - Notification channel: slack, discord, email, webhook (default: all configured)
- `--help` - Show help message

**Environment Variables:**

- `SLACK_WEBHOOK_URL` - Slack webhook URL
- `DISCORD_WEBHOOK_URL` - Discord webhook URL
- `NOTIFICATION_EMAIL` - Email address for notifications
- `CUSTOM_WEBHOOK_URL` - Custom webhook URL

**Example:**

```bash
# Send success notification
./notify.sh --type success "Deployment completed"

# Send to specific channel
./notify.sh --channel slack --type error "Deployment failed"

# Custom title
./notify.sh --title "Production Alert" --type warning "High memory usage detected"
```

---

## Build Scripts

### build-all.sh

Builds all services (web, server, restate-worker).

**Usage:**

```bash
./build-all.sh [OPTIONS]
```

**Options:**

- `--sequential` - Build services sequentially (default: parallel where possible)
- `--skip-web` - Skip building web application
- `--skip-server` - Skip building API server
- `--skip-restate` - Skip building Restate worker
- `--help` - Show help message

**Example:**

```bash
# Build all services
./build-all.sh

# Build only server and restate
./build-all.sh --skip-web

# Build sequentially
./build-all.sh --sequential
```

---

### build-web.sh

Builds the web application.

**Usage:**

```bash
./build-web.sh
```

---

### build-server.sh

Builds the API server.

**Usage:**

```bash
./build-server.sh
```

---

### build-restate-worker.sh

Builds the Restate worker.

**Usage:**

```bash
./build-restate-worker.sh
```

---

## Health Check Scripts

### health-check.sh

Runs all health checks and aggregates results.

**Usage:**

```bash
./health-check.sh [--json]
```

**Example:**

```bash
# Human-readable output
./health-check.sh

# JSON output for monitoring
./health-check.sh --json
```

---

### health-check-db.sh

Checks PostgreSQL database health.

**Usage:**

```bash
./health-check-db.sh
```

---

### health-check-restate.sh

Checks Restate server health.

**Usage:**

```bash
./health-check-restate.sh
```

---

### health-check-api.sh

Checks API server health.

**Usage:**

```bash
./health-check-api.sh
```

---

### health-check-web.sh

Checks web application health.

**Usage:**

```bash
./health-check-web.sh
```

---

## Deployment Workflow

### Initial Deployment

1. **Prepare environment:**

   ```bash
   cp ../env.production.example .env.production
   # Edit .env.production with your values
   ```

2. **Build all services:**

   ```bash
   ./build-all.sh
   ```

3. **Deploy:**

   ```bash
   ./deploy.sh
   ```

4. **Verify:**
   ```bash
   ./health-check.sh
   ./deployment-status.sh
   ```

### Update Deployment

1. **Build updated services:**

   ```bash
   ./build-all.sh
   ```

2. **Deploy:**

   ```bash
   ./deploy.sh
   ```

3. **If issues occur, rollback:**
   ```bash
   ./rollback.sh
   ```

### Monitoring

**Check deployment status:**

```bash
./deployment-status.sh
```

**Watch status continuously:**

```bash
./deployment-status.sh --watch
```

**View logs:**

```bash
docker-compose logs -f
docker-compose logs -f server
docker-compose logs -f restate-worker
```

**Check health:**

```bash
./health-check.sh
```

---

## Notification Setup

To enable deployment notifications, set environment variables:

**Slack:**

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**Discord:**

```bash
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/YOUR/WEBHOOK/URL"
```

**Email:**

```bash
export NOTIFICATION_EMAIL="ops@yourdomain.com"
```

**Custom Webhook:**

```bash
export CUSTOM_WEBHOOK_URL="https://your-monitoring-system.com/webhook"
```

Add these to your `.env.production` file or set them in your CI/CD pipeline.

---

## Troubleshooting

### Deployment fails at validation

**Issue:** Missing or invalid environment variables

**Solution:**

1. Check `.env.production` file exists
2. Verify all required variables are set
3. Ensure no placeholder values remain (CHANGE_THIS, REPLACE_WITH, etc.)

### Deployment fails at migration

**Issue:** Database migration errors

**Solution:**

1. Check database connectivity: `./health-check-db.sh`
2. Verify DATABASE_URL is correct
3. Check migration logs in `deployment.log`
4. Manually run migrations: `cd ../../packages/db && npx prisma migrate deploy`

### Services fail to start

**Issue:** Docker Compose errors

**Solution:**

1. Check Docker daemon is running
2. Verify Docker Compose file: `docker-compose config`
3. Check for port conflicts: `lsof -i :3000,3001,5432,8080,9070,9080`
4. View service logs: `docker-compose logs`

### Health checks fail

**Issue:** Services not responding

**Solution:**

1. Check service status: `docker-compose ps`
2. View service logs: `docker-compose logs [service-name]`
3. Verify network connectivity: `docker network inspect bookmarks-prod-network`
4. Check resource usage: `docker stats`

### Rollback fails

**Issue:** Previous version not found

**Solution:**

1. Check version history: `./deployment-status.sh --history`
2. Verify Docker images exist: `docker images | grep bookmarks`
3. If no previous version, redeploy from known good state

---

## Files Generated

The deployment scripts create and maintain these files:

- `.deployment-versions` - Version tracking for rollback
- `deployment.log` - Deployment event log
- `rollback.log` - Rollback event log

These files are automatically managed by the scripts and should not be manually edited.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build services
        run: cd deployment/prod && ./build-all.sh

      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          BETTER_AUTH_SECRET: ${{ secrets.BETTER_AUTH_SECRET }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: cd deployment/prod && ./deploy.sh

      - name: Verify deployment
        run: cd deployment/prod && ./health-check.sh

      - name: Rollback on failure
        if: failure()
        run: cd deployment/prod && ./rollback.sh --force
```

---

## Best Practices

1. **Always test in staging first** - Never deploy directly to production without testing
2. **Use version tags** - Tag Docker images with version numbers for easy rollback
3. **Monitor deployments** - Set up notifications to track deployment status
4. **Keep backups** - Regularly backup database and configuration
5. **Document changes** - Keep deployment notes for each version
6. **Test rollback** - Periodically test rollback procedure in staging
7. **Review logs** - Check deployment logs after each deployment
8. **Health checks** - Always verify health checks pass before considering deployment complete

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review deployment logs: `cat deployment.log`
3. Check service logs: `docker-compose logs`
4. Refer to main documentation: `../README.md`
