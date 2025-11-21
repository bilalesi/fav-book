#!/bin/bash

# Register Restate worker with Restate server
# This script can be run manually or automatically during startup

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
RESTATE_ADMIN_URL="${RESTATE_ADMIN_ENDPOINT:-http://localhost:9070}"

# Determine the correct worker URL based on environment
if [ -n "$RESTATE_WORKER_URL" ]; then
    # Use explicitly set URL
    WORKER_URL="$RESTATE_WORKER_URL"
else
    # On macOS, Docker containers must use host.docker.internal to reach the host
    # On Linux, use the gateway IP from the Docker network
    if [[ "$OSTYPE" == "darwin"* ]]; then
        WORKER_URL="http://host.docker.internal:9080"
    else
        # Get the gateway IP from the Docker network (Linux)
        GATEWAY_IP=$(docker network inspect bookmarks-dev-network 2>/dev/null | grep -o '"Gateway": "[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -n "$GATEWAY_IP" ]; then
            WORKER_URL="http://${GATEWAY_IP}:9080"
        else
            # Fallback to host.docker.internal
            WORKER_URL="http://host.docker.internal:9080"
        fi
    fi
fi

echo -e "${BLUE}📝 Registering Restate worker...${NC}"
echo -e "   Admin URL: $RESTATE_ADMIN_URL"
echo -e "   Worker URL: $WORKER_URL"

# Check if Restate admin is reachable
if ! curl -s -f "$RESTATE_ADMIN_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Restate admin is not reachable at $RESTATE_ADMIN_URL${NC}"
    echo -e "${YELLOW}💡 Make sure Restate is running:${NC}"
    echo -e "   cd deployment/dev && docker-compose up -d"
    exit 1
fi

# Check if worker is reachable (optional check, don't fail if not)
if curl -s -f "http://localhost:9080" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Worker is reachable${NC}"
else
    echo -e "${YELLOW}⚠ Worker may not be running yet at localhost:9080${NC}"
fi

# Register the worker
HTTP_CODE=$(curl -s -w "%{http_code}" -o /tmp/restate_register_response.txt -X POST "$RESTATE_ADMIN_URL/deployments" \
    -H "Content-Type: application/json" \
    -d "{\"uri\": \"$WORKER_URL\"}")

BODY=$(cat /tmp/restate_register_response.txt 2>/dev/null || echo "")

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Worker registered successfully${NC}"
    
    # Show registered services
    echo -e "\n${BLUE}Registered services:${NC}"
    curl -s "$RESTATE_ADMIN_URL/services" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  - /'
    
elif [ "$HTTP_CODE" -eq 409 ]; then
    echo -e "${YELLOW}⚠ Worker already registered${NC}"
    
    # Show registered services anyway
    echo -e "\n${BLUE}Registered services:${NC}"
    curl -s "$RESTATE_ADMIN_URL/services" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/  - /'
else
    echo -e "${RED}❌ Failed to register worker (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
    rm -f /tmp/restate_register_response.txt
    exit 1
fi

# Cleanup
rm -f /tmp/restate_register_response.txt
