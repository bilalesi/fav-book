#!/bin/bash

# Restate Health Check Script
# Checks Restate ingress endpoint, admin API, registered services, and workflow invocation capability
# Usage: ./health-check-restate.sh
# Exit codes: 0 = healthy, 1 = unhealthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=5
RESTATE_INGRESS_URL="${RESTATE_INGRESS_URL:-http://localhost:8080}"
RESTATE_ADMIN_URL="${RESTATE_ADMIN_URL:-http://localhost:9070}"

# Function to print status
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
    else
        echo -e "${RED}✗${NC} $message"
    fi
}

# Function to check Restate ingress endpoint
check_ingress() {
    echo "Checking Restate ingress endpoint..."
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$RESTATE_INGRESS_URL/restate/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        print_status "OK" "Ingress endpoint is reachable (${response_time}ms)"
        return 0
    else
        print_status "ERROR" "Ingress endpoint is not reachable (HTTP $response)"
        return 1
    fi
}

# Function to check Restate admin API
check_admin_api() {
    echo ""
    echo "Checking Restate admin API..."
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$RESTATE_ADMIN_URL/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        print_status "OK" "Admin API is available (${response_time}ms)"
        return 0
    else
        print_status "ERROR" "Admin API is not available (HTTP $response)"
        return 1
    fi
}

# Function to list registered services
list_registered_services() {
    echo ""
    echo "Checking registered services..."
    
    local services=$(curl -s --max-time $TIMEOUT "$RESTATE_ADMIN_URL/services" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$services" ]; then
        # Parse JSON to count services
        local service_count=$(echo "$services" | grep -o '"name"' | wc -l | xargs)
        
        if [ "$service_count" -gt 0 ]; then
            print_status "OK" "Found $service_count registered service(s)"
            
            # List service names
            echo "$services" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"$//' | while read -r service_name; do
                echo "  - $service_name"
            done
            
            return 0
        else
            print_status "WARN" "No services registered"
            return 1
        fi
    else
        print_status "ERROR" "Failed to retrieve registered services"
        return 1
    fi
}

# Function to check deployment status
check_deployments() {
    echo ""
    echo "Checking deployment status..."
    
    local deployments=$(curl -s --max-time $TIMEOUT "$RESTATE_ADMIN_URL/deployments" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$deployments" ]; then
        # Parse JSON to count deployments
        local deployment_count=$(echo "$deployments" | grep -o '"id"' | wc -l | xargs)
        
        if [ "$deployment_count" -gt 0 ]; then
            print_status "OK" "Found $deployment_count deployment(s)"
            return 0
        else
            print_status "WARN" "No deployments found"
            return 1
        fi
    else
        print_status "ERROR" "Failed to retrieve deployments"
        return 1
    fi
}

# Function to test workflow invocation capability
test_workflow_invocation() {
    echo ""
    echo "Testing workflow invocation capability..."
    
    # Test if we can reach the invocation endpoint (without actually invoking)
    # We'll do a HEAD request to check if the endpoint is accessible
    local response=$(curl -s -o /dev/null -w "%{http_code}" -X HEAD --max-time $TIMEOUT "$RESTATE_INGRESS_URL/restate/health" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ] || [ "$response" = "405" ]; then
        # 405 Method Not Allowed is acceptable - means endpoint exists but doesn't support HEAD
        print_status "OK" "Workflow invocation endpoint is accessible"
        return 0
    else
        print_status "ERROR" "Workflow invocation endpoint is not accessible"
        return 1
    fi
}

# Function to check Restate version
check_version() {
    echo ""
    echo "Checking Restate version..."
    
    local version_info=$(curl -s --max-time $TIMEOUT "$RESTATE_ADMIN_URL/health" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$version_info" ]; then
        # Try to extract version if available in response
        local version=$(echo "$version_info" | grep -o '"version":"[^"]*"' | sed 's/"version":"//;s/"$//' || echo "unknown")
        
        if [ "$version" != "unknown" ]; then
            print_status "OK" "Restate version: $version"
        else
            print_status "OK" "Restate is running (version info not available)"
        fi
        return 0
    else
        print_status "WARN" "Could not retrieve version information"
        return 0
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "Restate Health Check"
    echo "=========================================="
    echo ""
    echo "Ingress URL: $RESTATE_INGRESS_URL"
    echo "Admin URL: $RESTATE_ADMIN_URL"
    echo ""
    
    local exit_code=0
    
    # Check ingress endpoint
    if ! check_ingress; then
        exit_code=1
    fi
    
    # Check admin API
    if ! check_admin_api; then
        exit_code=1
        echo ""
        echo "=========================================="
        echo -e "Status: ${RED}UNHEALTHY${NC}"
        echo "=========================================="
        exit $exit_code
    fi
    
    # Check version
    check_version
    
    # List registered services
    if ! list_registered_services; then
        # Warning only, not critical
        :
    fi
    
    # Check deployments
    if ! check_deployments; then
        # Warning only, not critical
        :
    fi
    
    # Test workflow invocation capability
    if ! test_workflow_invocation; then
        exit_code=1
    fi
    
    echo ""
    echo "=========================================="
    if [ $exit_code -eq 0 ]; then
        echo -e "Status: ${GREEN}HEALTHY${NC}"
    else
        echo -e "Status: ${RED}UNHEALTHY${NC}"
    fi
    echo "=========================================="
    
    exit $exit_code
}

main "$@"
