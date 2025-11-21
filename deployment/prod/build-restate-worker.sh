#!/bin/bash

# Build script for Restate worker
# This script builds the Restate worker with workflow compilation,
# service bundling, and build artifact validation.
#
# Usage: ./build-restate-worker.sh
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
RESTATE_DIR="${PROJECT_ROOT}/apps/workflow"
BUILD_DIR="${RESTATE_DIR}/dist"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Building Restate Worker${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Change to project root
cd "${PROJECT_ROOT}"

# Step 1: TypeScript type checking
echo -e "${YELLOW}[1/5] Running TypeScript type checking...${NC}"
if ! bun run --filter=@favy/workflow check-types 2>&1; then
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

# Step 4: Build workflows and services
echo -e "${YELLOW}[4/5] Building workflows and services...${NC}"
if ! bun run --filter=@favy/workflow build 2>&1; then
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

# Check if server entry point exists
if [ ! -f "${BUILD_DIR}/server.js" ]; then
    echo -e "${RED}✗ Server entry point (server.js) not found in build directory${NC}"
    exit 3
fi

# Check if the built file is valid JavaScript
if ! node -c "${BUILD_DIR}/server.js" 2>/dev/null; then
    echo -e "${RED}✗ Built JavaScript file has syntax errors${NC}"
    exit 3
fi

# Check for workflow files
WORKFLOW_COUNT=$(find "${BUILD_DIR}/workflows" -name "*.js" 2>/dev/null | wc -l || echo "0")
SERVICE_COUNT=$(find "${BUILD_DIR}/services" -name "*.js" 2>/dev/null | wc -l || echo "0")

echo -e "${GREEN}✓ Build artifacts validated${NC}"
echo -e "${GREEN}  Build directory: ${BUILD_DIR}${NC}"
echo -e "${GREEN}  Workflows found: ${WORKFLOW_COUNT}${NC}"
echo -e "${GREEN}  Services found: ${SERVICE_COUNT}${NC}"

# Calculate build size
BUILD_SIZE=$(du -sh "${BUILD_DIR}" | cut -f1)
echo -e "${GREEN}  Build size: ${BUILD_SIZE}${NC}"
echo ""

# List build structure
echo -e "${BLUE}Build structure:${NC}"
ls -lh "${BUILD_DIR}"
echo ""

if [ -d "${BUILD_DIR}/workflows" ]; then
    echo -e "${BLUE}Workflows:${NC}"
    ls -lh "${BUILD_DIR}/workflows"
    echo ""
fi

if [ -d "${BUILD_DIR}/services" ]; then
    echo -e "${BLUE}Services:${NC}"
    ls -lh "${BUILD_DIR}/services"
    echo ""
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Restate Worker Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Build artifacts are ready at: ${BUILD_DIR}"
echo -e "Next step: Build Docker image with 'docker build -f deployment/docker/Dockerfile.restate-worker .'"
echo ""

exit 0
