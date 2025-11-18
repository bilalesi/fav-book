# Restate Infrastructure Management

This document describes how to manage the Restate server infrastructure for local development and testing.

## Overview

The `manage-restate.sh` script provides a simple interface for managing the Restate server lifecycle. It handles:

- Starting and stopping the Restate server
- Health check verification
- Docker volume management for persistent state
- Container lifecycle management

## Prerequisites

- Docker must be installed and running
- Ports 8080 (ingress) and 9070 (admin) must be available

## Quick Start

```bash
# Start Restate server
./scripts/manage-restate.sh start

# Check status
./scripts/manage-restate.sh status

# Stop Restate server
./scripts/manage-restate.sh stop
```

## Commands

### Start

Starts the Restate server. If the container doesn't exist, it will be created.

```bash
./scripts/manage-restate.sh start
```

The script will:

1. Check if Docker is running
2. Create or start the Restate container
3. Expose ingress endpoint on port 8080
4. Expose admin API on port 9070
5. Create a persistent volume for state storage
6. Verify health by polling the health endpoint
7. Report success or failure

**Output:**

```
[INFO] Creating and starting new Restate container...
[INFO] Restate server started
[INFO] Ingress endpoint: http://localhost:8080
[INFO] Admin API: http://localhost:9070
[INFO] Checking Restate health...
[INFO] Restate is healthy and accepting connections
[INFO] Restate is ready to accept workflow invocations
```

### Stop

Gracefully stops the Restate server.

```bash
./scripts/manage-restate.sh stop
```

The container is stopped but not removed, so state is preserved.

### Restart

Stops and then starts the Restate server.

```bash
./scripts/manage-restate.sh restart
```

Useful after configuration changes or when troubleshooting issues.

### Status

Shows the current status of the Restate server.

```bash
./scripts/manage-restate.sh status
```

**Output when running:**

```
[INFO] Restate container is running
NAMES     STATUS              PORTS
restate   Up 2 minutes        0.0.0.0:8080->8080/tcp, 0.0.0.0:9070->9070/tcp

[INFO] Health check: PASSED
```

### Health

Performs a health check on the running Restate server.

```bash
./scripts/manage-restate.sh health
```

Polls the health endpoint up to 30 times with 2-second intervals. Returns success (exit code 0) if healthy, failure (exit code 1) otherwise.

### Logs

Shows the Restate server logs in follow mode.

```bash
./scripts/manage-restate.sh logs
```

Press Ctrl+C to exit log viewing.

### Clean

Removes the Restate container and all persistent data.

```bash
./scripts/manage-restate.sh clean
```

**Warning:** This will delete all workflow state and history. You will be prompted for confirmation.

## Configuration

The script uses the following default configuration:

| Setting        | Value                       | Description                  |
| -------------- | --------------------------- | ---------------------------- |
| Container Name | `restate`                   | Docker container name        |
| Image          | `restatedev/restate:latest` | Docker image                 |
| Ingress Port   | `8080`                      | Workflow invocation endpoint |
| Admin Port     | `9070`                      | Admin API and health checks  |
| Volume         | `restate-data`              | Persistent storage volume    |

To customize these values, edit the configuration section at the top of `manage-restate.sh`.

## Endpoints

Once started, Restate exposes two endpoints:

### Ingress Endpoint (Port 8080)

Used for workflow invocations from your application:

```bash
curl http://localhost:8080
```

### Admin API (Port 9070)

Used for administration and health checks:

```bash
# Health check
curl http://localhost:9070/health

# Admin UI (if available)
open http://localhost:9070
```

## Persistent State

Workflow state is stored in a Docker volume named `restate-data`. This ensures:

- State survives container restarts
- Workflows can resume after failures
- History is preserved across deployments

To inspect the volume:

```bash
docker volume inspect restate-data
```

## Troubleshooting

### Docker Not Running

**Error:** `Docker is not running. Please start Docker and try again.`

**Solution:** Start Docker Desktop or the Docker daemon.

### Port Already in Use

**Error:** Container fails to start due to port conflict.

**Solution:**

1. Check what's using the ports:
   ```bash
   lsof -i :8080
   lsof -i :9070
   ```
2. Stop the conflicting service or change Restate ports in the script

### Health Check Fails

**Error:** `Restate health check failed after 30 attempts`

**Solution:**

1. Check container logs:
   ```bash
   ./scripts/manage-restate.sh logs
   ```
2. Verify the container is running:
   ```bash
   docker ps | grep restate
   ```
3. Try restarting:
   ```bash
   ./scripts/manage-restate.sh restart
   ```

### Container Won't Stop

**Solution:**

```bash
# Force stop
docker stop -t 0 restate

# Or force remove
docker rm -f restate
```

## Integration with Development Workflow

### Starting Development Environment

```bash
# 1. Start Restate
./scripts/manage-restate.sh start

# 2. Start your application
cd fav-book
bun run dev
```

### Stopping Development Environment

```bash
# 1. Stop your application (Ctrl+C)

# 2. Stop Restate
./scripts/manage-restate.sh stop
```

### Resetting State for Testing

```bash
# Clean everything and start fresh
./scripts/manage-restate.sh clean
./scripts/manage-restate.sh start
```

## CI/CD Integration

The script can be used in CI/CD pipelines:

```bash
# Start Restate for integration tests
./scripts/manage-restate.sh start || exit 1

# Run tests
bun test

# Cleanup
./scripts/manage-restate.sh stop
```

## Next Steps

After starting Restate:

1. Deploy your workflow services to Restate
2. Configure your application to use `RESTATE_INGRESS_URL=http://localhost:8080`
3. Trigger workflows from your application
4. Monitor execution via logs or admin API

For more information on implementing workflows, see the [Restate Workflow Migration Design Document](../.kiro/specs/restate-workflow-migration/design.md).
