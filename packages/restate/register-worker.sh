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
WORKER_URL="${RESTATE_WORKER_URL:-http://host.docker.internal:9080}"

echo -e "${BLUE}📝 Registering Restate worker...${NC}"
echo -e "   Admin URL: $RESTATE_ADMIN_URL"
echo -e "   Worker URL: $WORKER_URL"

# Check if Restate admin is reachable
if ! curl -s -f "$RESTATE_ADMIN_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Restate admin is not reachable at $RESTATE_ADMIN_URL${NC}"
    echo -e "${YELLOW}Make sure Restate is running (docker-compose up -d)${NC}"
    exit 1
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
