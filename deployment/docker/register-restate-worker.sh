#!/bin/sh
# Auto-registration script for Restate worker
# This script waits for the Restate worker to be ready and then registers it with the Restate server

set -e

# Configuration from environment variables
RESTATE_ADMIN_URL="${RESTATE_ADMIN_URL:-http://restate:9070}"
RESTATE_SERVICE_PORT="${RESTATE_SERVICE_PORT:-9080}"
WORKER_HOST="${WORKER_HOST:-restate-worker}"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "Restate Worker Auto-Registration Script"
echo "========================================"
echo "Admin URL: ${RESTATE_ADMIN_URL}"
echo "Worker URL: http://${WORKER_HOST}:${RESTATE_SERVICE_PORT}"
echo ""

# Wait for the worker to be ready
echo "Waiting for Restate worker to be ready..."
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
  if curl -f -s "http://localhost:${RESTATE_SERVICE_PORT}/health" > /dev/null 2>&1; then
    echo "✓ Restate worker is ready"
    break
  fi
  
  retry_count=$((retry_count + 1))
  if [ $retry_count -eq $MAX_RETRIES ]; then
    echo "✗ Failed to connect to Restate worker after ${MAX_RETRIES} attempts"
    exit 1
  fi
  
  echo "  Attempt ${retry_count}/${MAX_RETRIES}: Worker not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

# Wait for Restate admin API to be ready
echo ""
echo "Waiting for Restate admin API to be ready..."
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
  if curl -f -s "${RESTATE_ADMIN_URL}/health" > /dev/null 2>&1; then
    echo "✓ Restate admin API is ready"
    break
  fi
  
  retry_count=$((retry_count + 1))
  if [ $retry_count -eq $MAX_RETRIES ]; then
    echo "✗ Failed to connect to Restate admin API after ${MAX_RETRIES} attempts"
    exit 1
  fi
  
  echo "  Attempt ${retry_count}/${MAX_RETRIES}: Admin API not ready yet, retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

# Register the worker with Restate server
echo ""
echo "Registering Restate worker with Restate server..."
response=$(curl -s -w "\n%{http_code}" -X POST "${RESTATE_ADMIN_URL}/deployments" \
  -H "Content-Type: application/json" \
  -d "{\"uri\": \"http://${WORKER_HOST}:${RESTATE_SERVICE_PORT}\"}")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
  echo "✓ Successfully registered Restate worker"
  echo ""
  echo "Registered services:"
  echo "$body" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' | sed 's/^/  - /'
  echo ""
  echo "Registration complete!"
  exit 0
elif [ "$http_code" = "409" ]; then
  echo "✓ Restate worker already registered (this is normal)"
  exit 0
else
  echo "✗ Failed to register Restate worker"
  echo "HTTP Status: ${http_code}"
  echo "Response: ${body}"
  exit 1
fi
