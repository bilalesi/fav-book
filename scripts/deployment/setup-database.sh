#!/bin/bash

# Setup Production Database (Neon)
# Usage: ./scripts/deployment/setup-database.sh

set -e

echo "🗄️  Setting up Production Database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo "Please set your Neon database connection string:"
  echo "export DATABASE_URL='postgresql://user:password@host.neon.tech/dbname?sslmode=require'"
  exit 1
fi

# Generate Prisma Client
echo "📝 Generating Prisma Client..."
bun run db:generate

# Push schema to database
echo "🚀 Pushing schema to production database..."
bun run db:push

echo "✅ Database setup complete!"
echo ""
echo "📊 To open Prisma Studio and verify:"
echo "   bun run db:studio"
echo ""
echo "⚠️  Remember to:"
echo "   - Enable connection pooling in Neon Console"
echo "   - Configure automatic backups"
echo "   - Set up monitoring alerts"
