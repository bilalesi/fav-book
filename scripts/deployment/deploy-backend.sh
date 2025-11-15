#!/bin/bash

# Deploy Backend to Production Server
# Usage: ./scripts/deployment/deploy-backend.sh [server-host] [server-user]

set -e

SERVER_HOST=${1:-$SERVER_HOST}
SERVER_USER=${2:-$SERVER_USER}
DEPLOY_PATH="/opt/social-bookmarks"

if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ]; then
  echo "❌ Error: Server host and user are required"
  echo "Usage: ./deploy-backend.sh [server-host] [server-user]"
  echo "Or set SERVER_HOST and SERVER_USER environment variables"
  exit 1
fi

echo "🚀 Deploying Backend to $SERVER_HOST..."

# Build the application
echo "🔨 Building application..."
bun run build

# Create deployment package
echo "📦 Creating deployment package..."
cd apps/server
tar -czf ../../backend-deploy.tar.gz dist/ package.json

# Upload to server
echo "⬆️  Uploading to server..."
cd ../..
scp backend-deploy.tar.gz $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/

# Deploy on server
echo "🔧 Deploying on server..."
ssh $SERVER_USER@$SERVER_HOST << 'EOF'
cd /opt/social-bookmarks
tar -xzf backend-deploy.tar.gz
rm backend-deploy.tar.gz
bun install --production
pm2 restart social-bookmarks-api || pm2 start dist/index.js --name social-bookmarks-api
pm2 save
EOF

# Cleanup
rm backend-deploy.tar.gz

echo "✅ Backend deployment complete!"
echo "🔍 Check status: ssh $SERVER_USER@$SERVER_HOST 'pm2 status'"
