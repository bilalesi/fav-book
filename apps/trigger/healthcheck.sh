#!/bin/bash

# Simple health check script for CI/CD
# Returns 0 if all services are healthy, 1 otherwise

set -e

cd docker

# Check if services are running
if ! docker-compose -f webapp/docker-compose.yml ps | grep -q "Up"; then
    echo "ERROR: Services are not running"
    exit 1
fi

# Check PostgreSQL
if ! docker-compose -f webapp/docker-compose.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo "ERROR: PostgreSQL is not ready"
    exit 1
fi

# Check Redis
if ! docker-compose -f webapp/docker-compose.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo "ERROR: Redis is not ready"
    exit 1
fi

# Check MinIO
if ! curl -f -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
    echo "ERROR: MinIO is not ready"
    exit 1
fi

# Check Trigger.dev webapp
if ! curl -f -s http://localhost:8030/healthcheck > /dev/null 2>&1; then
    echo "ERROR: Trigger.dev webapp is not ready"
    exit 1
fi

# Check Cobalt API (if running)
cd ..
if docker-compose -f cobalt-compose.yml ps 2>/dev/null | grep -q "Up"; then
    if ! curl -f -s http://localhost:9002/api/serverInfo > /dev/null 2>&1; then
        echo "ERROR: Cobalt API is not ready"
        exit 1
    fi
fi

echo "All services are healthy"
exit 0
