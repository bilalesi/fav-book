#!/bin/bash

# Unified build script for all services
# This script orchestrates the build process for web, server, and Restate worker
# with proper build order management, parallel building where possible,
# and comprehensive error handling.
#
# Usage: ./build-all.sh [OPTIONS]
# Options:
#   --sequential    Build services sequentially (default: parallel where possible)
#   --skip-web      Skip building web application
#   --skip-server   Skip building API server
#   --skip-restate  Skip building Restate worker
#   --help          Show this help message
#
# Exit codes:
#   0 - Success
#   1 - One or more builds failed

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default options
SEQUENTIAL=false
SKIP_WEB=false
SKIP_SERVER=false
SKIP_RESTATE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --sequential)
            SEQUENTIAL=true
            shift
            ;;
        --skip-web)
            SKIP_WEB=true
            shift
            ;;
        --skip-server)
            SKIP_SERVER=true
            shift
            ;;
        --skip-restate)
            SKIP_RESTATE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --sequential    Build services sequentially (default: parallel where possible)"
            echo "  --skip-web      Skip building web application"
            echo "  --skip-server   Skip building API server"
            echo "  --skip-restate  Skip building Restate worker"
            echo "  --help          Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Track build status
BUILD_FAILED=false
FAILED_SERVICES=()

# Function to run a build and track its status
run_build() {
    local service_name=$1
    local build_script=$2
    
    echo -e "${CYAN}Starting build: ${service_name}${NC}"
    
    if bash "${build_script}"; then
        echo -e "${GREEN}✓ ${service_name} build completed${NC}"
        return 0
    else
        echo -e "${RED}✗ ${service_name} build failed${NC}"
        BUILD_FAILED=true
        FAILED_SERVICES+=("${service_name}")
        return 1
    fi
}

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building All Services${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Determine which services to build
SERVICES_TO_BUILD=()
if [ "$SKIP_WEB" = false ]; then
    SERVICES_TO_BUILD+=("web")
fi
if [ "$SKIP_SERVER" = false ]; then
    SERVICES_TO_BUILD+=("server")
fi
if [ "$SKIP_RESTATE" = false ]; then
    SERVICES_TO_BUILD+=("restate")
fi

# Check if any services to build
if [ ${#SERVICES_TO_BUILD[@]} -eq 0 ]; then
    echo -e "${YELLOW}No services selected for building${NC}"
    exit 0
fi

echo -e "${BLUE}Services to build: ${SERVICES_TO_BUILD[*]}${NC}"
echo -e "${BLUE}Build mode: $([ "$SEQUENTIAL" = true ] && echo "Sequential" || echo "Parallel")${NC}"
echo ""

# Record start time
START_TIME=$(date +%s)

if [ "$SEQUENTIAL" = true ]; then
    # Sequential build
    echo -e "${YELLOW}Building services sequentially...${NC}"
    echo ""
    
    # Build in order: web, server, restate
    for service in "${SERVICES_TO_BUILD[@]}"; do
        case $service in
            web)
                run_build "Web Application" "${SCRIPT_DIR}/build-web.sh" || true
                echo ""
                ;;
            server)
                run_build "API Server" "${SCRIPT_DIR}/build-server.sh" || true
                echo ""
                ;;
            restate)
                run_build "Restate Worker" "${SCRIPT_DIR}/build-restate-worker.sh" || true
                echo ""
                ;;
        esac
    done
else
    # Parallel build (web can build independently, server and restate share dependencies)
    echo -e "${YELLOW}Building services in parallel where possible...${NC}"
    echo ""
    
    # Start web build in background if needed
    WEB_PID=""
    if [[ " ${SERVICES_TO_BUILD[*]} " =~ " web " ]]; then
        (run_build "Web Application" "${SCRIPT_DIR}/build-web.sh") &
        WEB_PID=$!
    fi
    
    # Build server and restate sequentially (they share Prisma dependency)
    if [[ " ${SERVICES_TO_BUILD[*]} " =~ " server " ]]; then
        run_build "API Server" "${SCRIPT_DIR}/build-server.sh" || true
        echo ""
    fi
    
    if [[ " ${SERVICES_TO_BUILD[*]} " =~ " restate " ]]; then
        run_build "Restate Worker" "${SCRIPT_DIR}/build-restate-worker.sh" || true
        echo ""
    fi
    
    # Wait for web build to complete
    if [ -n "$WEB_PID" ]; then
        echo -e "${YELLOW}Waiting for web build to complete...${NC}"
        if wait $WEB_PID; then
            echo -e "${GREEN}✓ Web build completed${NC}"
        else
            echo -e "${RED}✗ Web build failed${NC}"
            BUILD_FAILED=true
            FAILED_SERVICES+=("Web Application")
        fi
        echo ""
    fi
fi

# Calculate total build time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Print summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "Total build time: ${MINUTES}m ${SECONDS}s"
echo ""

if [ "$BUILD_FAILED" = true ]; then
    echo -e "${RED}✗ Build failed for the following services:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
        echo -e "${RED}  - ${service}${NC}"
    done
    echo ""
    echo -e "${RED}Please check the error messages above and fix the issues.${NC}"
    exit 1
else
    echo -e "${GREEN}✓ All builds completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "1. Build Docker images:"
    echo -e "   docker build -f deployment/docker/Dockerfile.web -t fav-book-web:latest ."
    echo -e "   docker build -f deployment/docker/Dockerfile.server -t fav-book-server:latest ."
    echo -e "   docker build -f deployment/docker/Dockerfile.restate-worker -t fav-book-restate-worker:latest ."
    echo ""
    echo -e "2. Deploy to production:"
    echo -e "   cd deployment/prod && docker-compose up -d"
    echo ""
    exit 0
fi
