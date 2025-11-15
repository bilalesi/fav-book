#!/bin/bash

# Health Check Script for Production Deployment
# Usage: ./scripts/deployment/health-check.sh [api-url] [web-url]

set -e

API_URL=${1:-$API_URL}
WEB_URL=${2:-$WEB_URL}

echo "🏥 Running Health Checks..."
echo ""

# Check API health
if [ -n "$API_URL" ]; then
  echo "🔍 Checking API at $API_URL..."
  
  if curl -f -s -o /dev/null -w "%{http_code}" "$API_URL/health" | grep -q "200"; then
    echo "✅ API is healthy"
  else
    echo "❌ API health check failed"
    exit 1
  fi
else
  echo "⚠️  Skipping API check (API_URL not set)"
fi

echo ""

# Check Web app
if [ -n "$WEB_URL" ]; then
  echo "🔍 Checking Web App at $WEB_URL..."
  
  if curl -f -s -o /dev/null -w "%{http_code}" "$WEB_URL" | grep -q "200"; then
    echo "✅ Web App is accessible"
  else
    echo "❌ Web App check failed"
    exit 1
  fi
else
  echo "⚠️  Skipping Web App check (WEB_URL not set)"
fi

echo ""
echo "✅ All health checks passed!"
