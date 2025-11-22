#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Crawler development server...${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi


# Start the server
echo -e "${GREEN}✓ Starting Restate Crawler Service on ${CRAWLER_SERVICE_HOST:-0.0.0.0}:${CRAWLER_SERVICE_PORT:-9081}${NC}"
uv run python -m src.main
