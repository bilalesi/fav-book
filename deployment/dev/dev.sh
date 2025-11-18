#!/bin/bash

# Development startup script using dotenvx
# This script starts both web and server services with their respective env files
#
# Usage:
#   ./dev.sh              # Start web and server only (assumes Docker is running)
#   ./dev.sh --all        # Start Docker services, then web and server
#   ./dev.sh --db         # Run database migrations/generation

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the project root directory (two levels up from deployment/dev)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
START_DOCKER=false
RUN_DB_MIGRATIONS=false

for arg in "$@"; do
    case $arg in
        --all)
            START_DOCKER=true
            shift
            ;;
        --db)
            RUN_DB_MIGRATIONS=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./dev.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --all     Start Docker services (PostgreSQL, Restate) before starting app servers"
            echo "  --db      Run database migrations and generate Prisma client"
            echo "  --help    Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./dev.sh              # Start web and server (Docker must be running)"
            echo "  ./dev.sh --all        # Start everything including Docker"
            echo "  ./dev.sh --db         # Run database migrations"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Starting development environment...${NC}\n"

# Ensure dotenvx is installed
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! command -v dotenvx &> /dev/null; then
    echo -e "${YELLOW}Installing dotenvx to ~/.local/bin...${NC}"
    mkdir -p ~/.local/bin
    curl -sfS "https://dotenvx.sh?directory=$HOME/.local/bin" | sh
    export PATH="$HOME/.local/bin:$PATH"
    echo -e "${GREEN}✓ dotenvx installed${NC}"
    echo -e "${YELLOW}Note: Add ~/.local/bin to your PATH permanently by adding this to your ~/.zshrc:${NC}"
    echo -e "${YELLOW}  export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
fi
echo -e "${GREEN}✓ Dependencies ready${NC}\n"

# Handle --db flag: Run database migrations
if [ "$RUN_DB_MIGRATIONS" = true ]; then
    echo -e "${BLUE}🗄️  Running database migrations...${NC}"
    cd "$PROJECT_ROOT"
    
    # Load environment variables from .env.server
    export $(dotenvx run --env-file=deployment/dev/.env.server -- env | grep DATABASE_URL)
    
    # Generate Prisma client
    echo -e "${BLUE}Generating Prisma client...${NC}"
    cd packages/db
    bun run prisma generate
    
    # Run migrations
    echo -e "${BLUE}Running migrations...${NC}"
    bun run prisma migrate dev
    
    echo -e "${GREEN}✓ Database migrations completed${NC}\n"
    exit 0
fi

# Handle --all flag or check if Docker services are running
if [ "$START_DOCKER" = true ]; then
    echo -e "${BLUE}📦 Starting Docker services...${NC}"
    cd "$DEV_DIR"
    docker-compose up -d
    echo -e "${GREEN}✓ Docker services started${NC}\n"
    
    # Wait for services to be healthy
    echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
    sleep 5
else
    echo -e "${BLUE}📦 Checking Docker services...${NC}"
    cd "$DEV_DIR"
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}❌ Docker services are not running${NC}"
        echo -e "${YELLOW}Run with --all flag to start Docker services automatically${NC}"
        echo -e "${YELLOW}Or start them manually: cd deployment/dev && ./start.sh${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Docker services already running${NC}\n"
fi

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Restate worker with .env.server
echo -e "${BLUE}⚡ Starting Restate worker (port 9080)...${NC}"
cd "$PROJECT_ROOT"
dotenvx run --env-file=deployment/dev/.env.server -- bun run --cwd packages/restate dev &
RESTATE_PID=$!

# Wait for Restate worker to start
sleep 3

# Register Restate worker with Restate server
cd "$PROJECT_ROOT/packages/restate"
./register-worker.sh || echo -e "${YELLOW}Note: Worker registration failed, will retry later${NC}"
echo ""
cd "$PROJECT_ROOT"

# Start server with .env.server
echo -e "${BLUE}🔧 Starting API server (port 3000)...${NC}"
cd "$PROJECT_ROOT"
dotenvx run --env-file=deployment/dev/.env.server -- bun run --cwd apps/server dev &
SERVER_PID=$!

# Wait a bit for server to start
sleep 2

# Start web with .env.web
echo -e "${BLUE}🌐 Starting web app (port 3001)...${NC}"
cd "$PROJECT_ROOT"
dotenvx run --env-file=deployment/dev/.env.web -- bun run --cwd apps/web dev &
WEB_PID=$!

echo -e "\n${GREEN}✅ Development environment started!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📱 Web:${NC}           http://localhost:3001"
echo -e "${BLUE}🔌 API:${NC}           http://localhost:3000"
echo -e "${BLUE}⚡ Restate Worker:${NC} http://localhost:9080"
echo -e "${BLUE}🗄️  Database:${NC}      postgresql://postgres:postgres@localhost:5432/bookmarks_dev"
echo -e "${BLUE}📊 Restate Admin:${NC}  http://localhost:9070"
echo -e "${BLUE}🔄 Restate Runtime:${NC} http://localhost:8080"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}\n"

# Wait for all background processes
wait
