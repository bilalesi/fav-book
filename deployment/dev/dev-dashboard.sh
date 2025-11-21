#!/bin/bash

# dev-dashboard.sh
# Starts the development environment using PM2.

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_SCRIPT="$PROJECT_ROOT/deployment/dev/dev.sh"

# Ensure ~/.local/bin is in PATH for dotenvx
export PATH="$HOME/.local/bin:$PATH"

# Check for required tools
if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}Error: pm2 is not installed.${NC}"
    echo -e "Install it with: ${YELLOW}npm install -g pm2${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Initializing Development Dashboard...${NC}"

# 1. Run Infrastructure and Migrations using existing dev.sh
echo -e "${BLUE}[1/3] Setting up infrastructure...${NC}"
"$DEV_SCRIPT" --all

# 2. Start Services with PM2
echo -e "${BLUE}[2/3] Starting services with PM2...${NC}"
pm2 start ecosystem.config.cjs

# 3. Register Restate Worker (needs worker to be up)
echo -e "${BLUE}Waiting for Restate worker to be ready...${NC}"
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s -f http://localhost:9080 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Worker is ready${NC}"
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

echo -e "${BLUE}Registering Restate worker...${NC}"
cd "$PROJECT_ROOT/apps/workflow"
./register-worker.sh || echo -e "${YELLOW}⚠ Worker registration failed (check logs)${NC}"
cd "$PROJECT_ROOT"

# 4. Launch PM2 Dashboard
echo -e "${BLUE}[3/3] Launching PM2 Dashboard...${NC}"

# Display instructions
echo -e "${GREEN}Services started!${NC}"
echo -e "${YELLOW}Opening PM2 Monitor...${NC}"
echo -e "Press ${BOLD}q${NC} to exit the monitor (services will keep running)."
echo -e "To stop services: ${BOLD}pm2 stop all${NC}"

# Launch PM2 monitor
pm2 monit
