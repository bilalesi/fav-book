#!/bin/bash

# Automated Trigger.dev Infrastructure Startup Script
# This script follows the official Trigger.dev documentation for self-hosting with Docker
# Documentation: https://trigger.dev/docs/self-hosting/docker

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker 20.10.0+ first."
    exit 1
fi

if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed. Please install Docker Compose 2.20.0+ first."
    exit 1
fi

print_success "Prerequisites check passed"

# Navigate to docker directory
cd docker

# Create .env file in docker directory (as per official docs)
print_info "Setting up environment configuration..."

if [ ! -f .env ]; then
    print_warning ".env not found. Creating from .env.example..."
    cp .env.example .env
    
    # Generate secure random secrets
    print_info "Generating secure random secrets..."
    SESSION_SECRET=$(openssl rand -hex 16)
    MAGIC_LINK_SECRET=$(openssl rand -hex 16)
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    MANAGED_WORKER_SECRET=$(openssl rand -hex 16)
    
    # Update secrets in .env
    if command_exists sed; then
        sed -i.bak "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" .env
        sed -i.bak "s/MAGIC_LINK_SECRET=.*/MAGIC_LINK_SECRET=$MAGIC_LINK_SECRET/" .env
        sed -i.bak "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
        sed -i.bak "s/MANAGED_WORKER_SECRET=.*/MANAGED_WORKER_SECRET=$MANAGED_WORKER_SECRET/" .env
        rm .env.bak 2>/dev/null || true
        print_success "Generated secure random secrets in .env"
    else
        print_warning "Please manually update secrets in .env"
    fi
else
    print_success ".env file already exists"
fi

# Create symlinks for webapp and worker (they read from parent .env)
print_info "Setting up environment for webapp and worker..."
if [ ! -f webapp/.env ] && [ -f .env ]; then
    ln -sf ../.env webapp/.env
    print_success "Linked webapp/.env to docker/.env"
fi

if [ ! -f worker/.env ] && [ -f .env ]; then
    ln -sf ../.env worker/.env
    print_success "Linked worker/.env to docker/.env"
fi

# Pull images first
print_info "Pulling Docker images..."
docker-compose -f webapp/docker-compose.yml pull
docker-compose -f worker/docker-compose.yml pull

# Step 1: Start webapp first (base infrastructure)
print_info "Step 1: Starting Trigger.dev webapp (base infrastructure)..."
print_info "This includes: PostgreSQL, Redis, ClickHouse, Electric, MinIO, Registry"
cd webapp
docker-compose up -d
cd ..

# Wait for webapp to be healthy
print_info "Waiting for webapp to be healthy (this may take 30-60 seconds)..."
sleep 20

# Step 2: Start worker (supervisor)
print_info "Step 2: Starting Trigger.dev worker (supervisor)..."
cd worker
docker-compose up -d
cd ..

print_success "Trigger.dev infrastructure started (combined setup)"

# Wait for services to be healthy
print_info "Waiting for services to start (this may take 30-60 seconds)..."
sleep 15

# Check service health
print_info "Checking service health..."

check_service() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose -f webapp/docker-compose.yml ps 2>/dev/null | grep -q "$service.*healthy\|$service.*running"; then
            print_success "$service is running"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    print_warning "$service may still be starting (check logs if needed)"
    return 0
}

check_service "postgres"
check_service "redis"
check_service "clickhouse"
check_service "minio"
check_service "registry"
check_service "webapp"
check_service "supervisor"

# Setup Cobalt API for media downloads
print_info "Setting up Cobalt API for media downloads..."

# Create Cobalt docker-compose if it doesn't exist
if [ ! -f ../cobalt-compose.yml ]; then
    cat > ../cobalt-compose.yml << 'EOF'
version: "3.8"

services:
  cobalt:
    image: ghcr.io/imputnet/cobalt:latest
    container_name: cobalt-api
    restart: unless-stopped
    environment:
      API_URL: http://cobalt:9000
      API_NAME: "Bookmark Media Downloader"
      CORS_WILDCARD: "true"
      CORS_URL: "*"
    ports:
      - "9002:9000"
    networks:
      - webapp
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:9000/api/serverInfo"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

networks:
  webapp:
    external: true
    name: webapp
EOF
    print_success "Created Cobalt docker-compose configuration"
fi

# Start Cobalt API
print_info "Starting Cobalt API..."
docker-compose -f ../cobalt-compose.yml up -d

sleep 5

if docker-compose -f ../cobalt-compose.yml ps | grep -q "Up"; then
    print_success "Cobalt API is running"
else
    print_warning "Cobalt API may still be starting"
fi

# Create MinIO bookmark-media bucket
print_info "Creating MinIO bucket for media storage..."
sleep 5

# Get MinIO credentials from .env
MINIO_USER=$(grep "^OBJECT_STORE_ACCESS_KEY_ID=" webapp/.env | cut -d'=' -f2)
MINIO_PASSWORD=$(grep "^OBJECT_STORE_SECRET_ACCESS_KEY=" webapp/.env | cut -d'=' -f2)

# Create bookmark-media bucket
docker run --rm --network webapp \
    --entrypoint /bin/sh minio/mc -c "
    mc alias set myminio http://minio:9000 ${MINIO_USER:-admin} ${MINIO_PASSWORD:-very-safe-password} 2>/dev/null;
    mc mb myminio/bookmark-media --ignore-existing 2>/dev/null;
    mc anonymous set download myminio/bookmark-media 2>/dev/null;
    echo 'MinIO bookmark-media bucket created';
    " || print_warning "MinIO bucket may already exist"

# Display access information
print_success "Infrastructure setup complete!"
echo ""
echo "=========================================="
echo "Service Access Information"
echo "=========================================="
echo ""
echo "Trigger.dev Webapp:"
echo "  URL: http://localhost:8030"
echo "  Check logs for magic link:"
echo "    cd docker && docker-compose -f webapp/docker-compose.yml logs -f webapp"
echo ""
echo "MinIO Console (Object Storage):"
echo "  URL: http://localhost:9001"
echo "  Username: ${MINIO_USER:-admin}"
echo "  Password: ${MINIO_PASSWORD:-very-safe-password}"
echo "  Buckets: packets, bookmark-media"
echo ""
echo "Container Registry:"
echo "  URL: localhost:5000"
echo "  Username: registry-user"
echo "  Password: very-secure-indeed"
echo ""
echo "Cobalt API (Media Downloader):"
echo "  URL: http://localhost:9002"
echo "  Health: http://localhost:9002/api/serverInfo"
echo ""
echo "=========================================="
echo ""

# Check for worker token
print_info "Checking for worker token..."
sleep 5

if docker-compose -f webapp/docker-compose.yml logs webapp 2>/dev/null | grep -q "TRIGGER_WORKER_TOKEN"; then
    print_success "Worker token generated! Check webapp logs:"
    echo ""
    docker-compose -f webapp/docker-compose.yml logs webapp | grep -A 10 "Worker Token" || true
    echo ""
    print_info "The worker is using the bootstrap token automatically (combined setup)"
else
    print_info "Worker token will be generated on first login"
    print_info "The combined setup uses automatic bootstrap - no manual token configuration needed"
fi

echo ""
print_info "Next steps:"
echo "  1. Access Trigger.dev at http://localhost:8030"
echo "  2. Check webapp logs for magic link:"
echo "     cd docker && docker-compose -f webapp/docker-compose.yml logs -f webapp"
echo "  3. Login and create a project"
echo "  4. Initialize your project:"
echo "     npx trigger.dev@latest init -p <project-ref> -a http://localhost:8030"
echo ""
print_info "To stop all services:"
echo "  cd docker && docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml down"
echo "  docker-compose -f cobalt-compose.yml down"
echo ""
print_info "To view logs:"
echo "  cd docker && docker-compose -f webapp/docker-compose.yml logs -f [service-name]"
echo ""
print_success "Setup complete! Happy coding! 🚀"
