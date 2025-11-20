#!/bin/bash
# Database migration script using Alembic

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔄 Running database migrations...${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠ DATABASE_URL not set, loading from .env${NC}"
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    else
        echo -e "${RED}❌ No .env file found${NC}"
        exit 1
    fi
fi

# Run migrations
uv run alembic upgrade head

echo -e "${GREEN}✓ Migrations completed${NC}"
