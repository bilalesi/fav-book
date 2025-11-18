#!/bin/bash

# Build script for API server
# This script builds the API server with TypeScript compilation,
# dependency bundling, and build artifact validation.
#
# Usage: ./build-server.sh
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
SERVER_DIR="${PROJECT_ROOT}/apps/server"
BUILD_DIR="${SERVER_DIR}/dist"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building API Server${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Change to project root
cd "${PROJECT_ROOT}"

# Step 1: TypeScript type checking
echo -e "${YELLOW}[1/5] Running TypeScript type checking...${NC}"
if ! bun run --filter=server check-types 2>&1; then
    echo -e "${RED}✗ TypeScript type checking failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ TypeScript type checking passed${NC}"
echo ""

# Step 2: Generate Prisma client
echo -e "${YELLOW}[2/5] Generating Prisma client...${NC}"
if ! bun run --filter=@favy/db db:generate 2>&1; then
    echo -e "${RED}✗ Prisma client generation failed${NC}"
    exit 2
fi
echo -e "${GREEN}✓ Prisma client generated${NC}"
echo ""

# Step 3: Clean previous build
echo -e "${YELLOW}[3/5] Cleaning previous build artifacts...${NC}"
if [ -d "${BUILD_DIR}" ]; then
    rm -rf "${BUILD_DIR}"
    echo -e "${GREEN}✓ Cleaned previous build${NC}"
else
    echo -e "${GREEN}✓ No previous build to clean${NC}"
fi
echo ""

# Step 4: Build TypeScript and bundle dependencies
echo -e "${YELLOW}[4/5] Building TypeScript and bundling dependencies...${NC}"
if ! bun run --filter=server build 2>&1; then
    echo -e "${RED}✗ Build failed${NC}"
    exit 2
fi
echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

# Step 5: Validate build artifacts
echo -e "${YELLOW}[5/5] Validating build artifacts...${NC}"

# Check if build directory exists
if [ ! -d "${BUILD_DIR}" ]; then
    echo -e "${RED}✗ Build directory not found: ${BUILD_DIR}${NC}"
    exit 3
fi

# Check if main entry point exists
if [ ! -f "${BUILD_DIR}/index.js" ]; then
    echo -e "${RED}✗ Main entry point (index.js) not found in build directory${NC}"
    exit 3
fi

# Check if the built file is valid JavaScript
if ! node -c "${BUILD_DIR}/index.js" 2>/dev/null; then
    echo -e "${RED}✗ Built JavaScript file has syntax errors${NC}"
    exit 3
fi

# Calculate build size
BUILD_SIZE=$(du -sh "${BUILD_DIR}" | cut -f1)
echo -e "${GREEN}✓ Build artifacts validated${NC}"
echo -e "${GREEN}  Build directory: ${BUILD_DIR}${NC}"
echo -e "${GREEN}  Build size: ${BUILD_SIZE}${NC}"
echo ""

# List build files
echo -e "${BLUE}Build artifacts:${NC}"
ls -lh "${BUILD_DIR}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}API Server Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Build artifacts are ready at: ${BUILD_DIR}"
echo -e "Next step: Build Docker image with 'docker build -f deployment/docker/Dockerfile.server .'"
echo ""

exit 0
