#!/bin/bash

# Development startup script using dotenvx
# This script orchestrates the development environment setup
#
# Usage:
#   ./dev.sh                    # Start services only (assumes infra is running)
#   ./dev.sh --all              # Full setup: infra → migrate → setup restate → services
#   ./dev.sh --all --db         # Same as --all (--db is included)
#   ./dev.sh --db               # Run migrations only (checks infra is up)
#   ./dev.sh --services         # Start services only (explicit, same as no args)

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Get the project root directory (two levels up from deployment/dev)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEV_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments and determine execution plan
START_INFRA=false
RUN_DB_MIGRATIONS=false
START_SERVICES=false

# If no arguments, default to starting services only
if [ $# -eq 0 ]; then
    START_SERVICES=true
fi

for arg in "$@"; do
    case $arg in
        --all)
            START_INFRA=true
            RUN_DB_MIGRATIONS=true
            START_SERVICES=true
            ;;
        --db)
            RUN_DB_MIGRATIONS=true
            ;;
        --services)
            START_SERVICES=true
            ;;
        --help|-h)
            echo -e "${BOLD}Development Environment Manager${NC}"
            echo ""
            echo -e "${CYAN}Usage:${NC} ./dev.sh [OPTIONS]"
            echo ""
            echo -e "${CYAN}Options:${NC}"
            echo -e "  ${GREEN}--all${NC}         Complete setup: start infra → migrate DB → setup Restate → run services"
            echo -e "  ${GREEN}--db${NC}          Run database migrations only (ensures infra is running)"
            echo -e "  ${GREEN}--services${NC}    Start application services only (assumes infra is ready)"
            echo -e "  ${GREEN}--help, -h${NC}    Show this help message"
            echo ""
            echo -e "${CYAN}Examples:${NC}"
            echo -e "  ${YELLOW}./dev.sh${NC}                  # Start services (quickest, assumes infra ready)"
            echo -e "  ${YELLOW}./dev.sh --all${NC}            # Full setup from scratch"
            echo -e "  ${YELLOW}./dev.sh --db${NC}             # Run migrations only"
            echo -e "  ${YELLOW}./dev.sh --services${NC}       # Explicit service start"
            echo ""
            echo -e "${CYAN}Execution Order:${NC}"
            echo -e "  1. ${BLUE}Infrastructure${NC}  (PostgreSQL, Restate) - Docker containers"
            echo -e "  2. ${BLUE}Database${NC}        (Migrations, Prisma generation)"
            echo -e "  3. ${BLUE}Restate Setup${NC}   (Worker registration)"
            echo -e "  4. ${BLUE}Services${NC}        (Web, API, Restate worker)"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $arg${NC}"
            echo -e "Use ${YELLOW}--help${NC} for usage information"
            exit 1
            ;;
    esac
done

# Print execution plan
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}🚀 Development Environment Manager${NC}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}Execution Plan:${NC}"
[ "$START_INFRA" = true ] && echo -e "  ${GREEN}✓${NC} Start infrastructure (Docker)"
[ "$RUN_DB_MIGRATIONS" = true ] && echo -e "  ${GREEN}✓${NC} Run database migrations"
[ "$START_SERVICES" = true ] && echo -e "  ${GREEN}✓${NC} Start application services"
echo ""

# ============================================================================
# STEP 1: Ensure dependencies are installed
# ============================================================================
echo -e "${BLUE}📦 Checking dependencies...${NC}"
if ! command -v dotenvx &> /dev/null; then
    echo -e "${YELLOW}Installing dotenvx to ~/.local/bin...${NC}"
    mkdir -p ~/.local/bin
    curl -sfS "https://dotenvx.sh?directory=$HOME/.local/bin" | sh
    export PATH="$HOME/.local/bin:$PATH"
    echo -e "${GREEN}✓ dotenvx installed${NC}"
    echo -e "${YELLOW}💡 Add ~/.local/bin to your PATH permanently:${NC}"
    echo -e "${YELLOW}   export PATH=\"\$HOME/.local/bin:\$PATH\"${NC}"
fi
echo -e "${GREEN}✓ Dependencies ready${NC}\n"

# ============================================================================
# STEP 2: Start or verify infrastructure
# ============================================================================
if [ "$START_INFRA" = true ]; then
    echo -e "${BOLD}${BLUE}[1/4] Starting Infrastructure...${NC}"
    cd "$DEV_DIR"
    docker-compose up -d
    echo -e "${GREEN}✓ Docker services started${NC}"
    
    echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
    sleep 5
    echo -e "${GREEN}✓ Services are healthy${NC}\n"
elif [ "$RUN_DB_MIGRATIONS" = true ] || [ "$START_SERVICES" = true ]; then
    # Verify infrastructure is running if we need it
    echo -e "${BLUE}🔍 Verifying infrastructure...${NC}"
    cd "$DEV_DIR"
    if ! docker-compose ps | grep -q "Up"; then
        echo -e "${RED}❌ Infrastructure is not running${NC}"
        echo -e "${YELLOW}💡 Start infrastructure first:${NC}"
        echo -e "   ${CYAN}./dev.sh --all${NC}     (full setup)"
        echo -e "   ${CYAN}./start.sh${NC}         (infra only)"
        exit 1
    fi
    echo -e "${GREEN}✓ Infrastructure is running${NC}\n"
fi

# ============================================================================
# STEP 3: Run database migrations
# ============================================================================
if [ "$RUN_DB_MIGRATIONS" = true ]; then
    echo -e "${BOLD}${BLUE}[2/4] Running Database Migrations...${NC}"
    cd "$PROJECT_ROOT"
    
    # Load environment variables from .env.server
    export $(dotenvx run --env-file=deployment/dev/.env.server -- env | grep DATABASE_URL)
    
    # Generate Prisma client
    echo -e "${BLUE}  → Generating Prisma client...${NC}"
    cd packages/db
    bun run db:generate
    
    # Run migrations
    echo -e "${BLUE}  → Running migrations...${NC}"
    bun run db:migrate
    bun run db:seed

    
    echo -e "${GREEN}✓ Database migrations completed${NC}\n"
    cd "$PROJECT_ROOT"
    
    # If only --db was specified, exit here
    if [ "$START_SERVICES" = false ]; then
        echo -e "${GREEN}${BOLD}✅ Database migrations completed successfully!${NC}"
        exit 0
    fi
fi

# ============================================================================
# STEP 4: Start application services
# ============================================================================
if [ "$START_SERVICES" = true ]; then
    STEP_NUM="[3/4]"
    [ "$START_INFRA" = true ] && STEP_NUM="[3/4]"
    [ "$RUN_DB_MIGRATIONS" = false ] && STEP_NUM="[1/1]"
    
    echo -e "${BOLD}${BLUE}${STEP_NUM} Starting Application Services...${NC}"
    
    # Function to cleanup on exit
    cleanup() {
        echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
        kill $(jobs -p) 2>/dev/null || true
        echo -e "${GREEN}✓ Services stopped${NC}"
        exit 0
    }
    
    trap cleanup SIGINT SIGTERM
    
    cd "$PROJECT_ROOT"
    
    # Start Restate worker
    echo -e "${BLUE}  → Starting Restate worker (port 9080)...${NC}"
    dotenvx run --env-file=deployment/dev/.env.server -- bun run --cwd apps/workflow dev &
    RESTATE_PID=$!
    
    # Wait for Restate worker to be ready
    echo -e "${BLUE}  → Waiting for worker to be ready...${NC}"
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
    
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo -e "${YELLOW}⚠ Worker took too long to start, continuing anyway${NC}"
    fi
    
    # Give it an extra moment to fully initialize
    sleep 2
    
    # Register Restate worker with Restate server
    if [ "$START_INFRA" = true ] || [ "$RUN_DB_MIGRATIONS" = true ]; then
        echo -e "${BOLD}${BLUE}[4/4] Setting up Restate...${NC}"
    fi
    echo -e "${BLUE}  → Registering Restate worker...${NC}"
    cd "$PROJECT_ROOT/apps/workflow"
    if ./register-worker.sh; then
        echo -e "${GREEN}✓ Restate worker registered${NC}"
    else
        echo -e "${YELLOW}⚠ Worker registration failed (will retry later)${NC}"
    fi
    cd "$PROJECT_ROOT"
    echo ""
    
    # Start API server
    echo -e "${BLUE}  → Starting API server (port 3000)...${NC}"
    dotenvx run --env-file=deployment/dev/.env.server -- bun run --cwd apps/server dev:hot &
    SERVER_PID=$!
    sleep 2
    
    # Start web app
    echo -e "${BLUE}  → Starting web app (port 3001)...${NC}"
    dotenvx run --env-file=deployment/dev/.env.web -- bun run --cwd apps/web dev &
    WEB_PID=$!
    
    echo -e "${GREEN}✓ All services started${NC}\n"
    
    # Display service information
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${GREEN}✅ Development Environment Ready!${NC}"
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
    
    echo -e "${CYAN}Application Services:${NC}"
    echo -e "  ${BLUE}📱 Web App:${NC}         http://localhost:3001"
    echo -e "  ${BLUE}🔌 API Server:${NC}      http://localhost:3000"
    echo -e "  ${BLUE}⚡ Restate Worker:${NC}  http://localhost:9080"
    echo ""
    echo -e "${CYAN}Infrastructure:${NC}"
    echo -e "  ${BLUE}🗄️  Database:${NC}       postgresql://postgres:postgres@localhost:5432/bookmarks_dev"
    echo -e "  ${BLUE}📊 Restate Admin:${NC}   http://localhost:9070"
    echo -e "  ${BLUE}🔄 Restate Runtime:${NC} http://localhost:8080"
    echo ""
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${NC}\n"
    
    # Wait for all background processes
    wait
fi

# If we got here without starting services, we're done
echo -e "${GREEN}${BOLD}✅ Setup completed successfully!${NC}"
