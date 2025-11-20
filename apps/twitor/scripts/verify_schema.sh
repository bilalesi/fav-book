#!/bin/bash

# Script to verify the crawler schema exists and tables are created
# Usage: ./scripts/verify_schema.sh

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Verifying crawler schema..."
echo "Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/@/g')"
echo ""

# Check if crawler schema exists
echo "Checking for crawler schema..."
psql "$DATABASE_URL" -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'crawler';"

# Check for twitter_crawl_checkpoint table
echo ""
echo "Checking for twitter_crawl_checkpoint table..."
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'crawler' AND table_name = 'twitter_crawl_checkpoint';"

# Check for crawl_session table
echo ""
echo "Checking for crawl_session table..."
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'crawler' AND table_name = 'crawl_session';"

# Show table structures
echo ""
echo "twitter_crawl_checkpoint structure:"
psql "$DATABASE_URL" -c "\d crawler.twitter_crawl_checkpoint"

echo ""
echo "crawl_session structure:"
psql "$DATABASE_URL" -c "\d crawler.crawl_session"

echo ""
echo "Schema verification completed!"
