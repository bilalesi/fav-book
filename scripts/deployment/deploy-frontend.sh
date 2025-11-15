#!/bin/bash

# Deploy Frontend to Cloudflare Pages via Alchemy
# Usage: ./scripts/deployment/deploy-frontend.sh

set -e

echo "🚀 Deploying Frontend to Cloudflare Pages..."

# Check if required environment variables are set
if [ -z "$VITE_SERVER_URL" ]; then
  echo "❌ Error: VITE_SERVER_URL is not set"
  exit 1
fi

if [ -z "$ALCHEMY_PASSWORD" ]; then
  echo "❌ Error: ALCHEMY_PASSWORD is not set"
  exit 1
fi

# Navigate to web app directory
cd apps/web

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the application
echo "🔨 Building application..."
bun run build

# Deploy to Cloudflare Pages
echo "☁️  Deploying to Cloudflare Pages..."
bun run deploy

echo "✅ Frontend deployment complete!"
echo "🌐 Your app should be live at the Cloudflare Pages URL"
