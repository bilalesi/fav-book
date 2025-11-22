#!/usr/bin/env bash

# =============================================================================
# DEVELOPMENT ENVIRONMENT STATUS SCRIPT
# =============================================================================
# This script displays the current status of all development infrastructure
# services including health checks and basic diagnostics.
#
# Usage:
#   ./status.sh              # Show service status
#   ./status.sh --verbose    # Show detailed status with logs
#   ./status.sh --json       # Output status in JSON format
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

# Check if a service is running
is_service_running() {
    local service_name=$1
    docker-compose ps | grep "$service_name" | grep -q "Up"
}

# Check if a service is healthy
is_service_healthy() {
    local service_name=$1
    docker-compose ps | grep "$service_name" | grep -q "healthy"
}

# Get service status
get_service_status() {
    local service_name=$1
    
    if ! is_service_running "$service_name"; then
        echo "stopped"
    elif is_service_healthy "$service_name"; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# Display service status with color
display_service_status() {
    local service_name=$1
    local display_name=$2
    local status=$(get_service_status "$service_name")
    
    printf "  %-20s " "$display_name:"
    
    case $status in
        healthy)
            echo -e "${GREEN}● Running (Healthy)${NC}"
            ;;
        unhealthy)
            echo -e "${YELLOW}● Running (Unhealthy)${NC}"
            ;;
        stopped)
            echo -e "${RED}○ Stopped${NC}"
            ;;
    esac
}

# Test database connection
test_database() {
    docker exec bookmarks-dev-postgres psql -U postgres -d bookmarks_dev -c "SELECT 1;" >/dev/null 2>&1
}

# Test Restate connection
test_restate() {
    curl -sf http://localhost:9070/health >/dev/null 2>&1
}

# Test Caddy connection
test_caddy() {
    curl -sf http://localhost:2019/config/ >/dev/null 2>&1
}

# Test proxy URL accessibility
test_proxy_url() {
    local url=$1
    curl -sf --max-time 2 "$url" >/dev/null 2>&1
}

# Check if backend service is reachable
check_backend_service() {
    local port=$1
    curl -sf --max-time 2 "http://localhost:$port" >/dev/null 2>&1
}

# =============================================================================
# Parse Arguments
# =============================================================================

VERBOSE=false
JSON_OUTPUT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --verbose, -v  Show detailed status with logs"
            echo "  --json         Output status in JSON format"
            echo "  -h, --help     Show this help message"
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
# Check Services
# =============================================================================

cd "$SCRIPT_DIR"

if [ "$JSON_OUTPUT" = true ]; then
    # JSON output for programmatic use
    postgres_status=$(get_service_status "postgres")
    restate_status=$(get_service_status "restate")
    caddy_status=$(get_service_status "caddy")
    
    cat <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "services": {
    "postgres": {
      "status": "$postgres_status",
      "container": "bookmarks-dev-postgres",
      "port": 5432
    },
    "restate": {
      "status": "$restate_status",
      "container": "bookmarks-dev-restate",
      "ingress_port": 8080,
      "admin_port": 9070
    },
    "caddy": {
      "status": "$caddy_status",
      "container": "bookmarks-dev-caddy",
      "http_port": 80,
      "https_port": 443,
      "admin_port": 2019
    }
  }
}
EOF
    exit 0
fi

# =============================================================================
# Display Status
# =============================================================================

print_header "Development Infrastructure Status"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  SERVICE STATUS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

display_service_status "postgres" "PostgreSQL"
display_service_status "restate" "Restate Server"
display_service_status "caddy" "Caddy Proxy"

echo ""

# =============================================================================
# Health Checks
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  HEALTH CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# PostgreSQL health check
printf "  %-20s " "Database Connection:"
if is_service_running "postgres" && test_database; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Restate health check
printf "  %-20s " "Restate API:"
if is_service_running "restate" && test_restate; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Caddy health check
printf "  %-20s " "Caddy Admin API:"
if is_service_running "caddy" && test_caddy; then
    echo -e "${GREEN}✓ OK${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo ""

# =============================================================================
# Proxy URL Accessibility Tests
# =============================================================================

if is_service_running "caddy"; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  PROXY URL TESTS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Check if DNS is configured
    if ping -c 1 -W 1 favy >/dev/null 2>&1; then
        # Test proxy URLs
        printf "  %-20s " "http://favy:"
        if test_proxy_url "http://favy"; then
            echo -e "${GREEN}✓ Accessible${NC}"
        else
            echo -e "${YELLOW}⚠ Unreachable${NC} (backend may be down)"
        fi
        
        printf "  %-20s " "http://server.favy:"
        if test_proxy_url "http://server.favy"; then
            echo -e "${GREEN}✓ Accessible${NC}"
        else
            echo -e "${YELLOW}⚠ Unreachable${NC} (backend may be down)"
        fi
        
        printf "  %-20s " "http://restate.favy:"
        if test_proxy_url "http://restate.favy"; then
            echo -e "${GREEN}✓ Accessible${NC}"
        else
            echo -e "${YELLOW}⚠ Unreachable${NC} (backend may be down)"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} DNS not configured for .favy domains"
        echo "    Configure DNS to test proxy URLs"
        echo "    See: deployment/dev/DNS_SETUP.md"
    fi
    
    echo ""
    
    # Backend service status
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  BACKEND SERVICE STATUS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    printf "  %-20s " "Web App (3001):"
    if check_backend_service 3001; then
        echo -e "${GREEN}✓ Reachable${NC}"
    else
        echo -e "${RED}✗ Unreachable${NC}"
    fi
    
    printf "  %-20s " "API Server (3000):"
    if check_backend_service 3000; then
        echo -e "${GREEN}✓ Reachable${NC}"
    else
        echo -e "${RED}✗ Unreachable${NC}"
    fi
    
    printf "  %-20s " "Restate Admin (9070):"
    if check_backend_service 9070; then
        echo -e "${GREEN}✓ Reachable${NC}"
    else
        echo -e "${RED}✗ Unreachable${NC}"
    fi
    
    echo ""
fi

# =============================================================================
# Connection Information
# =============================================================================

if is_service_running "postgres" || is_service_running "restate" || is_service_running "caddy"; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  CONNECTION INFORMATION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if is_service_running "postgres"; then
        echo "  📦 PostgreSQL"
        echo "     URL: postgresql://postgres:postgres@localhost:5432/bookmarks_dev"
        echo ""
    fi
    
    if is_service_running "restate"; then
        echo "  🔄 Restate Server"
        echo "     Ingress: http://localhost:8080"
        echo "     Admin:   http://localhost:9070"
        echo ""
    fi
    
    if is_service_running "caddy"; then
        echo "  🌐 Caddy Proxy"
        echo "     Admin API: http://localhost:2019"
        if ping -c 1 -W 1 favy >/dev/null 2>&1; then
            echo "     Proxy URLs:"
            echo "       Web:     http://favy or http://web.favy"
            echo "       API:     http://server.favy"
            echo "       Restate: http://restate.favy"
        else
            echo "     Status: Running (DNS not configured)"
            echo "     See: deployment/dev/DNS_SETUP.md"
        fi
        echo ""
    fi
fi

# =============================================================================
# Verbose Output
# =============================================================================

if [ "$VERBOSE" = true ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  DETAILED INFORMATION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    log_info "Docker Compose Status:"
    docker-compose ps
    echo ""
    
    if is_service_running "postgres"; then
        log_info "PostgreSQL Logs (last 10 lines):"
        docker-compose logs --tail=10 postgres
        echo ""
    fi
    
    if is_service_running "restate"; then
        log_info "Restate Logs (last 10 lines):"
        docker-compose logs --tail=10 restate
        echo ""
    fi
fi

# =============================================================================
# Summary and Actions
# =============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AVAILABLE ACTIONS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! is_service_running "postgres" && ! is_service_running "restate" && ! is_service_running "caddy"; then
    echo "  Start services:       ./start.sh"
else
    echo "  View logs:            docker-compose logs -f [service]"
    echo "  View Caddy logs:      docker-compose logs -f caddy"
    echo "  Stop services:        ./stop.sh"
    echo "  Clean environment:    ./clean.sh"
    echo "  Restart services:     ./stop.sh && ./start.sh"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
