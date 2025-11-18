#!/usr/bin/env bash

# =============================================================================
# DEVELOPMENT ENVIRONMENT CLEAN SCRIPT
# =============================================================================
# This script stops all services and removes all data (containers and volumes)
# providing a completely fresh start for the development environment.
#
# Usage:
#   ./clean.sh              # Clean environment (with confirmation)
#   ./clean.sh --force      # Clean without confirmation
#
# WARNING: This will delete all database data and Restate state!
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

# =============================================================================
# Parse Arguments
# =============================================================================

FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --force|-f)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --force, -f  Clean without confirmation"
            echo "  -h, --help   Show this help message"
            echo ""
            echo "WARNING: This will delete all database data and Restate state!"
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
# Confirmation
# =============================================================================

print_header "Clean Development Environment"

if [ "$FORCE" = false ]; then
    echo ""
    log_warning "This will:"
    echo "  • Stop all infrastructure services"
    echo "  • Remove all containers"
    echo "  • Delete all database data"
    echo "  • Delete all Restate state"
    echo ""
    log_error "This action cannot be undone!"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Clean cancelled"
        exit 0
    fi
fi

# =============================================================================
# Clean Environment
# =============================================================================

print_header "Cleaning Environment"

cd "$SCRIPT_DIR"

log_info "Stopping services..."
docker-compose down -v 2>/dev/null || true
log_success "Services stopped"

log_info "Removing containers..."
docker-compose rm -f 2>/dev/null || true
log_success "Containers removed"

log_info "Removing volumes..."
docker volume rm bookmarks-dev-postgres-data 2>/dev/null || true
docker volume rm bookmarks-dev-restate-data 2>/dev/null || true
log_success "Volumes removed"

log_info "Removing network..."
docker network rm bookmarks-dev-network 2>/dev/null || true
log_success "Network removed"

# =============================================================================
# Display Status
# =============================================================================

print_header "Environment Cleaned"

echo ""
log_success "Development environment has been completely cleaned"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  To start fresh environment:"
echo "    ./start.sh"
echo ""
echo "  Or for a clean start with new volumes:"
echo "    ./start.sh --clean"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
