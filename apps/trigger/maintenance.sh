#!/bin/bash

# Maintenance Script for Trigger.dev Infrastructure
# Provides common maintenance tasks

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

show_menu() {
    echo ""
    echo "=========================================="
    echo "Trigger.dev Infrastructure Maintenance"
    echo "=========================================="
    echo ""
    echo "1. Backup Database"
    echo "2. Restore Database"
    echo "3. Backup MinIO Data"
    echo "4. Clean Up Docker Resources"
    echo "5. Update Services"
    echo "6. View Service Logs"
    echo "7. Check Service Health"
    echo "8. Restart Services"
    echo "9. View Resource Usage"
    echo "0. Exit"
    echo ""
}

backup_database() {
    print_info "Backing up PostgreSQL database..."
    
    BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
    
    if docker-compose exec -T postgres pg_dump -U postgres triggerdev > "$BACKUP_FILE"; then
        print_success "Database backed up to: $BACKUP_FILE"
        
        # Compress backup
        gzip "$BACKUP_FILE"
        print_success "Backup compressed to: ${BACKUP_FILE}.gz"
    else
        print_error "Database backup failed"
    fi
}

restore_database() {
    print_warning "This will restore the database from a backup file"
    print_warning "Current data will be overwritten!"
    echo ""
    
    read -p "Enter backup file path: " BACKUP_FILE
    
    if [ ! -f "$BACKUP_FILE" ]; then
        print_error "Backup file not found: $BACKUP_FILE"
        return
    fi
    
    read -p "Are you sure you want to restore? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Restore cancelled"
        return
    fi
    
    print_info "Restoring database..."
    
    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | docker-compose exec -T postgres psql -U postgres triggerdev
    else
        docker-compose exec -T postgres psql -U postgres triggerdev < "$BACKUP_FILE"
    fi
    
    print_success "Database restored successfully"
}

backup_minio() {
    print_info "Backing up MinIO data..."
    
    BACKUP_FILE="minio-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    docker run --rm \
        -v trigger_minio-data:/data \
        -v "$(pwd):/backup" \
        alpine tar czf "/backup/$BACKUP_FILE" -C /data .
    
    print_success "MinIO data backed up to: $BACKUP_FILE"
}

cleanup_docker() {
    print_info "Cleaning up Docker resources..."
    
    echo ""
    echo "This will remove:"
    echo "  - Stopped containers"
    echo "  - Unused images"
    echo "  - Unused networks"
    echo "  - Build cache"
    echo ""
    
    read -p "Continue? (yes/no): " CONFIRM
    
    if [ "$CONFIRM" != "yes" ]; then
        print_info "Cleanup cancelled"
        return
    fi
    
    # Remove stopped containers
    print_info "Removing stopped containers..."
    docker-compose rm -f
    
    # Prune images
    print_info "Removing unused images..."
    docker image prune -f
    
    # Prune networks
    print_info "Removing unused networks..."
    docker network prune -f
    
    # Prune build cache
    print_info "Removing build cache..."
    docker builder prune -f
    
    print_success "Cleanup complete"
    
    # Show disk usage
    echo ""
    print_info "Current Docker disk usage:"
    docker system df
}

update_services() {
    print_info "Updating services..."
    
    # Pull latest images
    print_info "Pulling latest images..."
    docker-compose pull
    docker-compose -f cobalt-compose.yml pull
    
    # Restart services with new images
    print_info "Restarting services..."
    docker-compose up -d
    docker-compose -f cobalt-compose.yml up -d
    
    print_success "Services updated successfully"
    
    # Show running services
    echo ""
    docker-compose ps
}

view_logs() {
    echo ""
    echo "Available services:"
    echo "  1. webapp"
    echo "  2. supervisor"
    echo "  3. postgres"
    echo "  4. redis"
    echo "  5. minio"
    echo "  6. registry"
    echo "  7. cobalt"
    echo "  8. all"
    echo ""
    
    read -p "Select service (1-8): " SERVICE_CHOICE
    
    case $SERVICE_CHOICE in
        1) docker-compose logs -f webapp ;;
        2) docker-compose logs -f supervisor ;;
        3) docker-compose logs -f postgres ;;
        4) docker-compose logs -f redis ;;
        5) docker-compose logs -f minio ;;
        6) docker-compose logs -f registry ;;
        7) docker-compose -f cobalt-compose.yml logs -f cobalt ;;
        8) docker-compose logs -f ;;
        *) print_error "Invalid choice" ;;
    esac
}

check_health() {
    print_info "Checking service health..."
    echo ""
    
    # Check Docker Compose services
    docker-compose ps
    
    echo ""
    
    # Check Cobalt
    if docker-compose -f cobalt-compose.yml ps | grep -q "Up"; then
        print_success "Cobalt API is running"
    else
        print_error "Cobalt API is not running"
    fi
    
    echo ""
    
    # Check connectivity
    print_info "Testing connectivity..."
    
    # PostgreSQL
    if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL is accessible"
    else
        print_error "PostgreSQL is not accessible"
    fi
    
    # Redis
    if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis is accessible"
    else
        print_error "Redis is not accessible"
    fi
    
    # MinIO
    if curl -f -s http://localhost:9000/minio/health/live > /dev/null 2>&1; then
        print_success "MinIO is accessible"
    else
        print_error "MinIO is not accessible"
    fi
    
    # Trigger.dev
    if curl -f -s http://localhost:8030/health > /dev/null 2>&1; then
        print_success "Trigger.dev webapp is accessible"
    else
        print_error "Trigger.dev webapp is not accessible"
    fi
    
    # Cobalt
    if curl -f -s http://localhost:9002/api/serverInfo > /dev/null 2>&1; then
        print_success "Cobalt API is accessible"
    else
        print_error "Cobalt API is not accessible"
    fi
}

restart_services() {
    echo ""
    echo "Restart options:"
    echo "  1. All services"
    echo "  2. Webapp only"
    echo "  3. Supervisor only"
    echo "  4. Cobalt only"
    echo ""
    
    read -p "Select option (1-4): " RESTART_CHOICE
    
    case $RESTART_CHOICE in
        1)
            print_info "Restarting all services..."
            docker-compose restart
            docker-compose -f cobalt-compose.yml restart
            print_success "All services restarted"
            ;;
        2)
            print_info "Restarting webapp..."
            docker-compose restart webapp
            print_success "Webapp restarted"
            ;;
        3)
            print_info "Restarting supervisor..."
            docker-compose restart supervisor
            print_success "Supervisor restarted"
            ;;
        4)
            print_info "Restarting Cobalt..."
            docker-compose -f cobalt-compose.yml restart cobalt
            print_success "Cobalt restarted"
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

view_resources() {
    print_info "Docker resource usage:"
    echo ""
    
    # Container stats
    docker stats --no-stream
    
    echo ""
    
    # Disk usage
    print_info "Docker disk usage:"
    docker system df
    
    echo ""
    
    # Volume sizes
    print_info "Volume sizes:"
    docker volume ls --format "table {{.Name}}\t{{.Driver}}" | grep trigger
}

# Main loop
while true; do
    show_menu
    read -p "Select option (0-9): " CHOICE
    
    case $CHOICE in
        1) backup_database ;;
        2) restore_database ;;
        3) backup_minio ;;
        4) cleanup_docker ;;
        5) update_services ;;
        6) view_logs ;;
        7) check_health ;;
        8) restart_services ;;
        9) view_resources ;;
        0)
            print_info "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
