#!/bin/bash

# Connectivity Test Script
# Tests connectivity between all infrastructure services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name=$1
    local test_command=$2
    
    print_info "Testing: $test_name"
    
    if eval "$test_command" > /dev/null 2>&1; then
        print_success "$test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        print_error "$test_name"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo "=========================================="
echo "Infrastructure Connectivity Tests"
echo "=========================================="
echo ""

# Test 1: Docker is running
run_test "Docker daemon is running" "docker info"

# Test 2: Docker Compose is available
run_test "Docker Compose is available" "docker-compose version"

# Test 3: Services are running
print_info "Checking if services are running..."
cd docker
if docker-compose -f webapp/docker-compose.yml ps | grep -q "Up"; then
    print_success "Docker Compose services are running"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Docker Compose services are not running"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo "Run './start-infrastructure.sh' to start services"
    cd ..
    exit 1
fi

# Test 4: PostgreSQL connectivity
run_test "PostgreSQL is accessible" \
    "docker-compose -f webapp/docker-compose.yml exec -T postgres pg_isready -U postgres"

# Test 5: Redis connectivity
run_test "Redis is accessible" \
    "docker-compose -f webapp/docker-compose.yml exec -T redis redis-cli ping"

# Test 6: MinIO API is accessible
run_test "MinIO API is accessible" \
    "curl -f -s http://localhost:9000/minio/health/live"

# Test 7: MinIO Console is accessible
run_test "MinIO Console is accessible" \
    "curl -f -s http://localhost:9001"

# Test 8: Container Registry is accessible
run_test "Container Registry is accessible" \
    "curl -f -s http://localhost:5000/v2/"

# Test 9: Trigger.dev Webapp is accessible
run_test "Trigger.dev Webapp is accessible" \
    "curl -f -s http://localhost:8030/healthcheck"

# Test 10: Cobalt API is accessible
cd ..
if docker-compose -f cobalt-compose.yml ps 2>/dev/null | grep -q "Up"; then
    run_test "Cobalt API is accessible" \
        "curl -f -s http://localhost:9002/api/serverInfo"
else
    print_error "Cobalt API is not running"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 11: Docker networks exist
run_test "Docker network 'webapp' exists" \
    "docker network inspect webapp"

run_test "Docker network 'supervisor' exists" \
    "docker network inspect supervisor"

# Test 12: Supervisor is running
cd docker
if docker-compose -f worker/docker-compose.yml ps | grep -q "supervisor.*Up"; then
    print_success "Supervisor is running"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_error "Supervisor is not running"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
cd ..
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed! Infrastructure is ready."
    echo ""
    echo "Next steps:"
    echo "  1. Access Trigger.dev at http://localhost:8030"
    echo "  2. Login and create a project"
    echo "  3. Initialize your project"
    echo ""
    exit 0
else
    print_error "Some tests failed. Please check the errors above."
    echo ""
    echo "Common fixes:"
    echo "  - Run './start-infrastructure.sh' to start all services"
    echo "  - Check logs: cd docker && docker-compose -f webapp/docker-compose.yml logs [service-name]"
    echo "  - Restart services: cd docker && docker-compose -f webapp/docker-compose.yml restart"
    echo ""
    exit 1
fi
