#!/bin/bash

# Script to run database migrations for Twitor service
# Usage: ./scripts/run_migration.sh [migration_file]

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Default to running all migrations if no specific file is provided
MIGRATION_FILE=${1:-"migrations/001_create_crawler_schema.sql"}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please set it in your .env file or export it"
    exit 1
fi

echo "Running migration: $MIGRATION_FILE"
echo "Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/@/g')"

# Run the migration
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

echo "Migration completed successfully!"
