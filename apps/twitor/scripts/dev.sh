#!/bin/bash
# Development server startup script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Twitor development server...${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Run migrations first
echo -e "${BLUE}📦 Running migrations...${NC}"
./scripts/migrate.sh

# Start the server
echo -e "${GREEN}✓ Starting server on ${TWITOR_HOST:-0.0.0.0}:${TWITOR_PORT:-8001}${NC}"
uv run uvicorn src.main:app --reload --port ${TWITOR_PORT:-8001} --host ${TWITOR_HOST:-0.0.0.0}
