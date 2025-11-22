#!/usr/bin/env bash

# =============================================================================
# DEVELOPMENT ENVIRONMENT STOP SCRIPT
# =============================================================================
# This script gracefully stops all development infrastructure services
# while preserving data volumes for the next startup.
#
# Usage:
#   ./stop.sh              # Stop all services (preserve data)
#   ./stop.sh --remove     # Stop and remove containers (preserve data)
#
# To remove data volumes as well, use ./clean.sh instead
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

REMOVE_CONTAINERS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --remove)
            REMOVE_CONTAINERS=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --remove    Stop and remove containers (preserve volumes)"
            echo "  -h, --help  Show this help message"
            echo ""
            echo "Note: To remove data volumes as well, use ./clean.sh"
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
# Stop Services
# =============================================================================

print_header "Stopping Development Infrastructure"

cd "$SCRIPT_DIR"

# Check if services are running
if ! docker-compose ps | grep -q "Up"; then
    log_warning "No services are currently running"
    exit 0
fi

log_info "Stopping infrastructure services..."

if [ "$REMOVE_CONTAINERS" = true ]; then
    # Stop and remove containers (but keep volumes)
    docker-compose down
    log_success "Services stopped and containers removed (volumes preserved)"
    log_success "Caddy proxy stopped"
else
    # Just stop containers
    docker-compose stop
    log_success "Services stopped (containers and volumes preserved)"
    log_success "Caddy proxy stopped"
fi

# =============================================================================
# Display Status
# =============================================================================

print_header "Services Stopped"

echo ""
log_success "Development infrastructure has been stopped"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  To start services again:"
echo "    ./start.sh"
echo ""
echo "  To clean and reset environment:"
echo "    ./clean.sh"
echo ""
echo "  To check service status:"
echo "    ./status.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
