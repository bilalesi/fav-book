#!/bin/bash

# Web Application Health Check Script
# Verifies web server response, checks static asset serving, and tests routing functionality
# Usage: ./health-check-web.sh
# Exit codes: 0 = healthy, 1 = unhealthy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TIMEOUT=5
MAX_RESPONSE_TIME=2000 # milliseconds (web apps can be slower)
WEB_URL="${WEB_URL:-http://localhost:3001}"

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

# Function to check web server response
check_web_server() {
    echo "Checking web server response..."
    
    local start_time=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$WEB_URL/" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$response" = "200" ]; then
        print_status "OK" "Web server is responding (${response_time}ms)"
        
        if [ $response_time -gt $MAX_RESPONSE_TIME ]; then
            print_status "WARN" "Response time exceeds threshold (${MAX_RESPONSE_TIME}ms)"
        fi
        
        return 0
    else
        print_status "ERROR" "Web server is not responding (HTTP $response)"
        return 1
    fi
}

# Function to check if HTML content is served
check_html_content() {
    echo ""
    echo "Checking HTML content..."
    
    local content=$(curl -s --max-time $TIMEOUT "$WEB_URL/" 2>/dev/null)
    
    if [ -n "$content" ]; then
        # Check for basic HTML structure
        if echo "$content" | grep -q "<html" && echo "$content" | grep -q "</html>"; then
            print_status "OK" "Valid HTML content is being served"
            
            # Check for common elements
            if echo "$content" | grep -q "<head"; then
                print_status "OK" "HTML head section present"
            fi
            
            if echo "$content" | grep -q "<body"; then
                print_status "OK" "HTML body section present"
            fi
            
            # Check for app root element (common in SPAs)
            if echo "$content" | grep -q 'id="root"' || echo "$content" | grep -q 'id="app"'; then
                print_status "OK" "Application root element found"
            fi
            
            return 0
        else
            print_status "ERROR" "Invalid HTML content"
            return 1
        fi
    else
        print_status "ERROR" "No content received from web server"
        return 1
    fi
}

# Function to check static asset serving
check_static_assets() {
    echo ""
    echo "Checking static asset serving..."
    
    # Common static asset paths to check
    local assets=(
        "/assets/"
        "/favicon.ico"
    )
    
    local assets_ok=0
    local assets_checked=0
    
    for asset in "${assets[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$WEB_URL$asset" 2>/dev/null || echo "000")
        
        # 200 = asset exists, 404 = doesn't exist (but server is working), 403 = forbidden (but server is working)
        if [ "$response" = "200" ] || [ "$response" = "404" ] || [ "$response" = "403" ]; then
            assets_ok=$((assets_ok + 1))
        fi
        assets_checked=$((assets_checked + 1))
    done
    
    if [ $assets_ok -gt 0 ]; then
        print_status "OK" "Static asset serving is functional ($assets_ok/$assets_checked paths accessible)"
        return 0
    else
        print_status "WARN" "Could not verify static asset serving"
        return 0
    fi
}

# Function to test routing functionality
check_routing() {
    echo ""
    echo "Checking routing functionality..."
    
    # Test common routes (should return 200 for SPA)
    local routes=(
        "/"
        "/bookmarks"
    )
    
    local routes_ok=0
    local routes_checked=0
    
    for route in "${routes[@]}"; do
        local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$WEB_URL$route" 2>/dev/null || echo "000")
        
        routes_checked=$((routes_checked + 1))
        
        if [ "$response" = "200" ]; then
            routes_ok=$((routes_ok + 1))
            echo "  $route: OK"
        else
            echo "  $route: HTTP $response"
        fi
    done
    
    if [ $routes_ok -gt 0 ]; then
        print_status "OK" "Routing is functional ($routes_ok/$routes_checked routes accessible)"
        return 0
    else
        print_status "ERROR" "Routing may not be working correctly"
        return 1
    fi
}

# Function to check for JavaScript bundle
check_javascript_bundle() {
    echo ""
    echo "Checking JavaScript bundle..."
    
    local content=$(curl -s --max-time $TIMEOUT "$WEB_URL/" 2>/dev/null)
    
    if [ -n "$content" ]; then
        # Check for script tags
        if echo "$content" | grep -q "<script"; then
            print_status "OK" "JavaScript bundle is referenced"
            
            # Try to extract script src and verify it's accessible
            local script_src=$(echo "$content" | grep -o 'src="[^"]*\.js"' | head -1 | sed 's/src="//;s/"$//')
            
            if [ -n "$script_src" ]; then
                # Handle relative paths
                if [[ "$script_src" == /* ]]; then
                    local script_url="$WEB_URL$script_src"
                else
                    local script_url="$WEB_URL/$script_src"
                fi
                
                local script_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$script_url" 2>/dev/null || echo "000")
                
                if [ "$script_response" = "200" ]; then
                    print_status "OK" "JavaScript bundle is accessible"
                else
                    print_status "WARN" "JavaScript bundle may not be accessible (HTTP $script_response)"
                fi
            fi
            
            return 0
        else
            print_status "WARN" "No JavaScript bundle found in HTML"
            return 0
        fi
    else
        print_status "ERROR" "Could not check JavaScript bundle"
        return 1
    fi
}

# Function to check response headers
check_response_headers() {
    echo ""
    echo "Checking response headers..."
    
    local headers=$(curl -s -I --max-time $TIMEOUT "$WEB_URL/" 2>/dev/null)
    
    if [ -n "$headers" ]; then
        # Check Content-Type
        if echo "$headers" | grep -qi "content-type.*text/html"; then
            print_status "OK" "Correct Content-Type header"
        else
            print_status "WARN" "Unexpected Content-Type header"
        fi
        
        # Check for caching headers
        if echo "$headers" | grep -qi "cache-control"; then
            print_status "OK" "Cache-Control header present"
        fi
        
        return 0
    else
        print_status "WARN" "Could not retrieve response headers"
        return 0
    fi
}

# Main execution
main() {
    echo "=========================================="
    echo "Web Application Health Check"
    echo "=========================================="
    echo ""
    echo "Web URL: $WEB_URL"
    echo ""
    
    local exit_code=0
    
    # Check web server response
    if ! check_web_server; then
        exit_code=1
        echo ""
        echo "=========================================="
        echo -e "Status: ${RED}UNHEALTHY${NC}"
        echo "=========================================="
        exit $exit_code
    fi
    
    # Check HTML content
    if ! check_html_content; then
        exit_code=1
    fi
    
    # Check static asset serving
    check_static_assets
    
    # Check routing functionality
    if ! check_routing; then
        exit_code=1
    fi
    
    # Check JavaScript bundle
    check_javascript_bundle
    
    # Check response headers
    check_response_headers
    
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
