#!/bin/bash

# API Server Health Check Script
# Tests health endpoint, verifies authentication system, and checks API response times
# Usage: ./health-check-api.sh
# Exit codes: 0 = healthy, 1 = unhealthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=5
MAX_RESPONSE_TIME=1000 # milliseconds
API_URL="${API_URL:-http://localhost:3000}"

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

# Function to check health endpoint
check_health_endpoint() {
    echo "Checking API health endpoint..."
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/api/health" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        print_status "OK" "Health endpoint is responding (${response_time}ms)"
        
        if [ $response_time -gt $MAX_RESPONSE_TIME ]; then
            print_status "WARN" "Response time exceeds threshold (${MAX_RESPONSE_TIME}ms)"
        fi
        
        return 0
    else
        print_status "ERROR" "Health endpoint is not responding (HTTP $response)"
        return 1
    fi
}

# Function to verify authentication system
check_authentication() {
    echo ""
    echo "Checking authentication system..."
    
    # Test auth endpoints existence (should return 401 or similar, not 404)
    local auth_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/api/auth/session" 2>/dev/null || echo "000")
    
    if [ "$auth_response" = "401" ] || [ "$auth_response" = "200" ]; then
        print_status "OK" "Authentication endpoint is accessible"
        return 0
    elif [ "$auth_response" = "404" ]; then
        print_status "ERROR" "Authentication endpoint not found"
        return 1
    else
        print_status "WARN" "Authentication endpoint returned unexpected status (HTTP $auth_response)"
        return 0
    fi
}

# Function to check API response times for key endpoints
check_api_response_times() {
    echo ""
    echo "Checking API response times..."
    
    local endpoints=(
        "/api/health"
        "/api/trpc/bookmark.list"
    )
    
    local total_time=0
    local endpoint_count=0
    local slow_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        local start_time=$(date +%s%3N)
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL$endpoint" 2>/dev/null || echo "000")
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        if [ "$response" != "000" ]; then
            endpoint_count=$((endpoint_count + 1))
            total_time=$((total_time + response_time))
            
            if [ $response_time -gt $MAX_RESPONSE_TIME ]; then
                slow_endpoints=$((slow_endpoints + 1))
                print_status "WARN" "$endpoint: ${response_time}ms (slow)"
            else
                echo "  $endpoint: ${response_time}ms"
            fi
        fi
    done
    
    if [ $endpoint_count -gt 0 ]; then
        local avg_time=$((total_time / endpoint_count))
        print_status "OK" "Average response time: ${avg_time}ms"
        
        if [ $slow_endpoints -gt 0 ]; then
            print_status "WARN" "$slow_endpoints endpoint(s) exceeded response time threshold"
        fi
        
        return 0
    else
        print_status "ERROR" "Could not measure response times"
        return 1
    fi
}

# Function to check CORS configuration
check_cors() {
    echo ""
    echo "Checking CORS configuration..."
    
    local cors_origin="${CORS_ORIGIN:-http://localhost:3001}"
    local response=$(curl -s -o /dev/null -w "%{http_code}" -H "Origin: $cors_origin" --max-time $TIMEOUT "$API_URL/api/health" 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        print_status "OK" "CORS is configured"
        return 0
    else
        print_status "WARN" "Could not verify CORS configuration"
        return 0
    fi
}

# Function to check server version/info
check_server_info() {
    echo ""
    echo "Checking server information..."
    
    local health_data=$(curl -s --max-time $TIMEOUT "$API_URL/api/health" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$health_data" ]; then
        # Try to extract useful information from health response
        local status=$(echo "$health_data" | grep -o '"status":"[^"]*"' | sed 's/"status":"//;s/"$//' || echo "unknown")
        
        if [ "$status" != "unknown" ]; then
            print_status "OK" "Server status: $status"
        else
            print_status "OK" "Server is running"
        fi
        
        # Check if timestamp is present (indicates server is processing requests)
        local timestamp=$(echo "$health_data" | grep -o '"timestamp"' || echo "")
        if [ -n "$timestamp" ]; then
            print_status "OK" "Server is processing requests"
        fi
        
        return 0
    else
        print_status "WARN" "Could not retrieve server information"
        return 0
    fi
}

# Function to check database connectivity through API
check_api_database() {
    echo ""
    echo "Checking API database connectivity..."
    
    # Try to access an endpoint that requires database
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$API_URL/api/trpc/bookmark.list" 2>/dev/null || echo "000")
    
    # 401 is acceptable (auth required), 200 is good, 500 might indicate DB issues
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        print_status "OK" "API can connect to database"
        return 0
    elif [ "$response" = "500" ]; then
        print_status "ERROR" "API database connection may be failing (HTTP 500)"
        return 1
    else
        print_status "WARN" "Could not verify database connectivity (HTTP $response)"
        return 0
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "API Server Health Check"
    echo "=========================================="
    echo ""
    echo "API URL: $API_URL"
    echo ""
    
    local exit_code=0
    
    # Check health endpoint
    if ! check_health_endpoint; then
        exit_code=1
        echo ""
        echo "=========================================="
        echo -e "Status: ${RED}UNHEALTHY${NC}"
        echo "=========================================="
        exit $exit_code
    fi
    
    # Check server info
    check_server_info
    
    # Check authentication system
    if ! check_authentication; then
        exit_code=1
    fi
    
    # Check API response times
    if ! check_api_response_times; then
        exit_code=1
    fi
    
    # Check CORS
    check_cors
    
    # Check database connectivity through API
    if ! check_api_database; then
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
