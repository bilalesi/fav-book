#!/bin/bash

# Build script for Twitor service Docker image
# This script builds the Docker image for the Twitter bookmark crawler service

set -e

echo "🐦 Building Twitor Docker image..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Build the Docker image
docker build \
  -t bookmarks-twitor:latest \
  -f "$PROJECT_ROOT/apps/twitor/Dockerfile" \
  "$PROJECT_ROOT/apps/twitor"

echo "✅ Twitor Docker image built successfully"
echo "   Image: bookmarks-twitor:latest"
