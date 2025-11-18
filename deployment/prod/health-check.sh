#!/bin/bash

# Unified Health Check Script
# Runs all health checks and aggregates results
# Usage: ./health-check.sh [--json]
# Exit codes: 0 = all healthy, 1 = one or more unhealthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JSON_OUTPUT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--json]"
            exit 1
            ;;
    esac
done

# Function to print section header
print_header() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo ""
        echo -e "${BLUE}========================================${NC}"
        echo -e "${BLUE}$1${NC}"
        echo -e "${BLUE}========================================${NC}"
    fi
}

# Function to run a health check script
run_health_check() {
    local check_name=$1
    local check_script=$2
    local check_status="unknown"
    local check_output=""
    
    if [ "$JSON_OUTPUT" = false ]; then
        print_header "$check_name"
    fi
    
    # Run the health check and capture output
    if [ -f "$check_script" ]; then
        if [ "$JSON_OUTPUT" = false ]; then
            # Run with output
            if "$check_script"; then
                check_status="healthy"
            else
                check_status="unhealthy"
            fi
        else
            # Run silently and capture output
            check_output=$("$check_script" 2>&1 || true)
            if [ $? -eq 0 ]; then
                check_status="healthy"
            else
                check_status="unhealthy"
            fi
        fi
    else
        if [ "$JSON_OUTPUT" = false ]; then
            echo -e "${RED}✗${NC} Health check script not found: $check_script"
        fi
        check_status="error"
    fi
    
    echo "$check_status"
}

# Function to determine overall status
determine_overall_status() {
    local db_status=$1
    local restate_status=$2
    local api_status=$3
    local web_status=$4
    
    # If any critical service is unhealthy, overall is unhealthy
    if [ "$db_status" = "unhealthy" ] || [ "$restate_status" = "unhealthy" ] || [ "$api_status" = "unhealthy" ]; then
        echo "unhealthy"
        return
    fi
    
    # If web is unhealthy but others are ok, overall is degraded
    if [ "$web_status" = "unhealthy" ]; then
        echo "degraded"
        return
    fi
    
    # If any service has error status, overall is degraded
    if [ "$db_status" = "error" ] || [ "$restate_status" = "error" ] || [ "$api_status" = "error" ] || [ "$web_status" = "error" ]; then
        echo "degraded"
        return
    fi
    
    # All services healthy
    echo "healthy"
}

# Function to output JSON report
output_json() {
    local overall=$1
    local db_status=$2
    local restate_status=$3
    local api_status=$4
    local web_status=$5
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat <<EOF
{
  "overall": "$overall",
  "timestamp": "$timestamp",
  "services": [
    {
      "service": "database",
      "status": "$db_status"
    },
    {
      "service": "restate",
      "status": "$restate_status"
    },
    {
      "service": "api",
      "status": "$api_status"
    },
    {
      "service": "web",
      "status": "$web_status"
    }
  ]
}
EOF
}

# Main execution
main() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo "=========================================="
        echo "System Health Check"
        echo "=========================================="
        echo ""
        echo "Running comprehensive health checks..."
    fi
    
    # Run all health checks
    local db_status=$(run_health_check "Database Health Check" "$SCRIPT_DIR/health-check-db.sh")
    local restate_status=$(run_health_check "Restate Health Check" "$SCRIPT_DIR/health-check-restate.sh")
    local api_status=$(run_health_check "API Server Health Check" "$SCRIPT_DIR/health-check-api.sh")
    local web_status=$(run_health_check "Web Application Health Check" "$SCRIPT_DIR/health-check-web.sh")
    
    # Determine overall status
    local overall_status=$(determine_overall_status "$db_status" "$restate_status" "$api_status" "$web_status")
    
    # Output results
    if [ "$JSON_OUTPUT" = true ]; then
        output_json "$overall_status" "$db_status" "$restate_status" "$api_status" "$web_status"
    else
        # Print summary
        print_header "Health Check Summary"
        echo ""
        
        # Database
        if [ "$db_status" = "healthy" ]; then
            echo -e "${GREEN}✓${NC} Database: HEALTHY"
        elif [ "$db_status" = "unhealthy" ]; then
            echo -e "${RED}✗${NC} Database: UNHEALTHY"
        else
            echo -e "${YELLOW}⚠${NC} Database: ERROR"
        fi
        
        # Restate
        if [ "$restate_status" = "healthy" ]; then
            echo -e "${GREEN}✓${NC} Restate: HEALTHY"
        elif [ "$restate_status" = "unhealthy" ]; then
            echo -e "${RED}✗${NC} Restate: UNHEALTHY"
        else
            echo -e "${YELLOW}⚠${NC} Restate: ERROR"
        fi
        
        # API
        if [ "$api_status" = "healthy" ]; then
            echo -e "${GREEN}✓${NC} API Server: HEALTHY"
        elif [ "$api_status" = "unhealthy" ]; then
            echo -e "${RED}✗${NC} API Server: UNHEALTHY"
        else
            echo -e "${YELLOW}⚠${NC} API Server: ERROR"
        fi
        
        # Web
        if [ "$web_status" = "healthy" ]; then
            echo -e "${GREEN}✓${NC} Web Application: HEALTHY"
        elif [ "$web_status" = "unhealthy" ]; then
            echo -e "${RED}✗${NC} Web Application: UNHEALTHY"
        else
            echo -e "${YELLOW}⚠${NC} Web Application: ERROR"
        fi
        
        echo ""
        echo "=========================================="
        
        # Overall status
        if [ "$overall_status" = "healthy" ]; then
            echo -e "Overall Status: ${GREEN}HEALTHY${NC}"
            echo "=========================================="
            exit 0
        elif [ "$overall_status" = "degraded" ]; then
            echo -e "Overall Status: ${YELLOW}DEGRADED${NC}"
            echo "=========================================="
            exit 1
        else
            echo -e "Overall Status: ${RED}UNHEALTHY${NC}"
            echo "=========================================="
            exit 1
        fi
    fi
    
    # Exit code based on overall status
    if [ "$overall_status" = "healthy" ]; then
        exit 0
    else
        exit 1
    fi
}

main "$@"
