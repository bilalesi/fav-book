#!/usr/bin/env bash

# =============================================================================
# DEVELOPMENT ENVIRONMENT STARTUP SCRIPT
# =============================================================================
# This script starts the development infrastructure services (PostgreSQL, Restate)
# and prepares the environment for local application development.
#
# Usage:
#   ./start.sh              # Start all infrastructure services
#   ./start.sh --clean      # Clean start (remove existing volumes)
#
# Requirements:
#   - Docker and Docker Compose installed
#   - .env.development file configured (optional, has defaults)
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  $1"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
}

# Check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Wait for a service to be healthy
wait_for_service() {
    local service_name=$1
    local max_attempts=${2:-30}
    local attempt=0
    
    log_info "Waiting for $service_name to be healthy..."
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep "$service_name" | grep -q "healthy"; then
            log_success "$service_name is healthy"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    echo ""
    log_error "$service_name failed to become healthy after $((max_attempts * 2)) seconds"
    return 1
}

# =============================================================================
# Preflight Checks
# =============================================================================

print_header "Development Environment Startup"

log_info "Running preflight checks..."

# Check Docker
if ! command_exists docker; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi
log_success "Docker is installed"

# Check Docker Compose
if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
log_success "Docker Compose is installed"

# Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi
log_success "Docker daemon is running"

# =============================================================================
# Parse Arguments
# =============================================================================

CLEAN_START=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --clean)
            CLEAN_START=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --clean     Clean start (remove existing volumes)"
            echo "  -h, --help  Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# =============================================================================
# Clean Start (if requested)
# =============================================================================

if [ "$CLEAN_START" = true ]; then
    print_header "Clean Start - Removing Existing Data"
    
    log_warning "This will remove all existing data (database, Restate state)"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Stopping services and removing volumes..."
        cd "$SCRIPT_DIR"
        docker-compose down -v
        log_success "Clean start completed"
    else
        log_info "Clean start cancelled"
        exit 0
    fi
fi

# =============================================================================
# Start Infrastructure Services
# =============================================================================

print_header "Starting Infrastructure Services"

cd "$SCRIPT_DIR"

log_info "Starting Docker Compose services..."
docker-compose up -d

if [ $? -ne 0 ]; then
    log_error "Failed to start services"
    exit 1
fi

log_success "Services started"

# =============================================================================
# Wait for Services to be Healthy
# =============================================================================

print_header "Waiting for Services to be Ready"

# Wait for PostgreSQL
if ! wait_for_service "postgres" 30; then
    log_error "PostgreSQL failed to start"
    log_info "Showing PostgreSQL logs:"
    docker-compose logs postgres
    exit 1
fi

# Wait for Restate
if ! wait_for_service "restate" 30; then
    log_error "Restate failed to start"
    log_info "Showing Restate logs:"
    docker-compose logs restate
    exit 1
fi

# =============================================================================
# Run Database Migrations
# =============================================================================

print_header "Running Database Migrations"

log_info "Checking for database migrations..."

# Check if Prisma is available
if [ -d "$PROJECT_ROOT/packages/db" ]; then
    cd "$PROJECT_ROOT/packages/db"
    
    # Check if migrations exist
    if [ -d "prisma/schema" ]; then
        log_info "Running Prisma migrations..."
        
        # Set DATABASE_URL for migrations
        export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookmarks_dev"
        
        # Run migrations using bun (or npm/yarn if bun not available)
        if command_exists bun; then
            bun run prisma migrate deploy
        elif command_exists npm; then
            npm run db:push
        else
            log_warning "Neither bun nor npm found. Please run migrations manually:"
            log_warning "  cd packages/db && bun run prisma migrate deploy"
        fi
        
        if [ $? -eq 0 ]; then
            log_success "Database migrations completed"
        else
            log_warning "Database migrations failed or not needed"
            log_info "You may need to run migrations manually"
        fi
    else
        log_info "No migrations found, skipping"
    fi
else
    log_warning "Database package not found, skipping migrations"
fi

# =============================================================================
# Display Connection Information
# =============================================================================

print_header "Development Environment Ready"

echo ""
log_success "Infrastructure services are running!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SERVICE INFORMATION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📦 PostgreSQL"
echo "     Host:     localhost"
echo "     Port:     5432"
echo "     Database: bookmarks_dev"
echo "     User:     postgres"
echo "     Password: postgres"
echo "     URL:      postgresql://postgres:postgres@localhost:5432/bookmarks_dev"
echo ""
echo "  🔄 Restate Server"
echo "     Ingress:  http://localhost:8080"
echo "     Admin:    http://localhost:9070"
echo "     Status:   http://localhost:9070/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Start the API server (in a new terminal):"
echo "     cd apps/server && bun run dev"
echo ""
echo "  2. Start the web application (in another terminal):"
echo "     cd apps/web && bun run dev"
echo ""
echo "  3. Start the Restate worker (in another terminal):"
echo "     cd packages/restate && bun run dev"
echo ""
echo "  4. Access the application:"
echo "     Web:    http://localhost:3001"
echo "     API:    http://localhost:3000"
echo "     Restate: http://localhost:9070"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  USEFUL COMMANDS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  View logs:        docker-compose logs -f [service]"
echo "  Check status:     ./status.sh"
echo "  Stop services:    ./stop.sh"
echo "  Clean restart:    ./clean.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Return to original directory
cd "$PROJECT_ROOT"
