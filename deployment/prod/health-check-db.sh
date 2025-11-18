#!/bin/bash

# Database Health Check Script
# Tests database connectivity, verifies schema version, and checks performance metrics
# Usage: ./health-check-db.sh
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

# Function to check if DATABASE_URL is set
check_env() {
    if [ -z "$DATABASE_URL" ]; then
        print_status "ERROR" "DATABASE_URL environment variable is not set"
        return 1
    fi
    return 0
}

# Function to test database connectivity
check_connectivity() {
    echo "Checking database connectivity..."
    
    local start_time=$(date +%s%3N)
    
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        local end_time=$(date +%s%3N)
        local response_time=$((end_time - start_time))
        
        print_status "OK" "Database is reachable (${response_time}ms)"
        
        if [ $response_time -gt $MAX_RESPONSE_TIME ]; then
            print_status "WARN" "Response time exceeds threshold (${MAX_RESPONSE_TIME}ms)"
        fi
        
        return 0
    else
        print_status "ERROR" "Cannot connect to database"
        return 1
    fi
}

# Function to verify schema version
check_schema_version() {
    echo ""
    echo "Checking schema version..."
    
    # Check if migrations table exists
    local migrations_exist=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations');" 2>/dev/null | xargs)
    
    if [ "$migrations_exist" = "t" ]; then
        # Get the latest migration
        local latest_migration=$(psql "$DATABASE_URL" -t -c "SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;" 2>/dev/null | xargs)
        
        if [ -n "$latest_migration" ]; then
            print_status "OK" "Latest migration: $latest_migration"
            
            # Check for pending migrations (failed or not applied)
            local pending_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL;" 2>/dev/null | xargs)
            
            if [ "$pending_count" -gt 0 ]; then
                print_status "WARN" "Found $pending_count pending/failed migrations"
            else
                print_status "OK" "All migrations applied successfully"
            fi
        else
            print_status "WARN" "No migrations found in database"
        fi
        return 0
    else
        print_status "WARN" "Migrations table does not exist (database may not be initialized)"
        return 1
    fi
}

# Function to check database performance metrics
check_performance() {
    echo ""
    echo "Checking database performance metrics..."
    
    # Check active connections
    local active_connections=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs)
    
    if [ -n "$active_connections" ]; then
        print_status "OK" "Active connections: $active_connections"
        
        if [ "$active_connections" -gt 50 ]; then
            print_status "WARN" "High number of active connections"
        fi
    fi
    
    # Check database size
    local db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_size=$(psql "$DATABASE_URL" -t -c "SELECT pg_size_pretty(pg_database_size('$db_name'));" 2>/dev/null | xargs)
    
    if [ -n "$db_size" ]; then
        print_status "OK" "Database size: $db_size"
    fi
    
    # Check for long-running queries
    local long_queries=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds';" 2>/dev/null | xargs)
    
    if [ -n "$long_queries" ] && [ "$long_queries" -gt 0 ]; then
        print_status "WARN" "Found $long_queries long-running queries (>30s)"
    else
        print_status "OK" "No long-running queries detected"
    fi
    
    return 0
}

# Main execution
main() {
    echo "=========================================="
    echo "Database Health Check"
    echo "=========================================="
    echo ""
    
    local exit_code=0
    
    # Check environment variables
    if ! check_env; then
        exit_code=1
    fi
    
    # Check connectivity
    if ! check_connectivity; then
        exit_code=1
        echo ""
        echo "=========================================="
        echo -e "Status: ${RED}UNHEALTHY${NC}"
        echo "=========================================="
        exit $exit_code
    fi
    
    # Check schema version
    if ! check_schema_version; then
        exit_code=1
    fi
    
    # Check performance metrics
    check_performance
    
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
