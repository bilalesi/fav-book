#!/bin/bash

# Build script for web application
# This script builds the web frontend with TypeScript type checking,
# production bundle optimization, and build artifact validation.
#
# Usage: ./build-web.sh
# Exit codes:
#   0 - Success
#   1 - Type checking failed
#   2 - Build failed
#   3 - Build artifact validation failed

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_DIR="${PROJECT_ROOT}/apps/web"
BUILD_DIR="${WEB_DIR}/dist"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building Web Application${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Change to project root
cd "${PROJECT_ROOT}"

# Step 1: TypeScript type checking
echo -e "${YELLOW}[1/4] Running TypeScript type checking...${NC}"
if ! bun run --filter=web check-types 2>&1; then
    echo -e "${RED}✗ TypeScript type checking failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ TypeScript type checking passed${NC}"
echo ""

# Step 2: Clean previous build
echo -e "${YELLOW}[2/4] Cleaning previous build artifacts...${NC}"
if [ -d "${BUILD_DIR}" ]; then
    rm -rf "${BUILD_DIR}"
    echo -e "${GREEN}✓ Cleaned previous build${NC}"
else
    echo -e "${GREEN}✓ No previous build to clean${NC}"
fi
echo ""

# Step 3: Build production bundle
echo -e "${YELLOW}[3/4] Building production bundle...${NC}"
if ! bun run --filter=web build 2>&1; then
    echo -e "${RED}✗ Production build failed${NC}"
    exit 2
fi
echo -e "${GREEN}✓ Production bundle built successfully${NC}"
echo ""

# Step 4: Validate build artifacts
echo -e "${YELLOW}[4/4] Validating build artifacts...${NC}"

# Check if build directory exists
if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}✗ Build directory not found: ${BUILD_DIR}${NC}"
    exit 3
fi

# Check if index.html exists
if [ ! -f "${BUILD_DIR}/index.html" ]; then
    echo -e "${RED}✗ index.html not found in build directory${NC}"
    exit 3
fi

# Check if assets directory exists
if [ ! -d "${BUILD_DIR}/assets" ]; then
    echo -e "${YELLOW}⚠ Warning: assets directory not found (may be expected for some builds)${NC}"
fi

# Calculate build size
BUILD_SIZE=$(du -sh "${BUILD_DIR}" | cut -f1)
echo -e "${GREEN}✓ Build artifacts validated${NC}"
echo -e "${GREEN}  Build directory: ${BUILD_DIR}${NC}"
echo -e "${GREEN}  Build size: ${BUILD_SIZE}${NC}"
echo ""

# List key files
echo -e "${BLUE}Key build artifacts:${NC}"
ls -lh "${BUILD_DIR}/index.html" 2>/dev/null || true
if [ -d "${BUILD_DIR}/assets" ]; then
    echo -e "${BLUE}Assets:${NC}"
    ls -lh "${BUILD_DIR}/assets" | head -n 10
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Web Application Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Build artifacts are ready at: ${BUILD_DIR}"
echo -e "Next step: Build Docker image with 'docker build -f deployment/docker/Dockerfile.web .'"
echo ""

exit 0
