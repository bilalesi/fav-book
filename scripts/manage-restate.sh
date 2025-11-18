#!/bin/bash

# Restate Infrastructure Management Script
# This script manages the Restate server lifecycle for local development and testing

set -e

# Configuration
RESTATE_CONTAINER_NAME="restate"
RESTATE_IMAGE="restatedev/restate:latest"
RESTATE_INGRESS_PORT="8080"
RESTATE_ADMIN_PORT="9070"
RESTATE_VOLUME="restate-data"
RESTATE_HEALTH_ENDPOINT="http://localhost:${RESTATE_ADMIN_PORT}/health"
MAX_HEALTH_RETRIES=30
HEALTH_RETRY_INTERVAL=2

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Check if Restate container exists
container_exists() {
    docker ps -a --format '{{.Names}}' | grep -q "^${RESTATE_CONTAINER_NAME}$"
}

# Check if Restate container is running
container_running() {
    docker ps --format '{{.Names}}' | grep -q "^${RESTATE_CONTAINER_NAME}$"
}

# Health check function
check_health() {
    local retries=0
    log_info "Checking Restate health..."
    
    while [ $retries -lt $MAX_HEALTH_RETRIES ]; do
        if curl -f -s "${RESTATE_HEALTH_ENDPOINT}" > /dev/null 2>&1; then
            log_info "Restate is healthy and accepting connections"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_HEALTH_RETRIES ]; then
            echo -n "."
            sleep $HEALTH_RETRY_INTERVAL
        fi
    done
    
    echo ""
    log_error "Restate health check failed after ${MAX_HEALTH_RETRIES} attempts"
    return 1
}

# Start Restate server
start_restate() {
    check_docker
    
    if container_running; then
        log_warn "Restate container is already running"
        check_health
        return 0
    fi
    
    if container_exists; then
        log_info "Starting existing Restate container..."
        docker start "${RESTATE_CONTAINER_NAME}"
    else
        log_info "Creating and starting new Restate container..."
        docker run -d \
            --name "${RESTATE_CONTAINER_NAME}" \
            -p "${RESTATE_INGRESS_PORT}:8080" \
            -p "${RESTATE_ADMIN_PORT}:9070" \
            -v "${RESTATE_VOLUME}:/restate-data" \
            --restart unless-stopped \
            "${RESTATE_IMAGE}"
    fi
    
    log_info "Restate server started"
    log_info "Ingress endpoint: http://localhost:${RESTATE_INGRESS_PORT}"
    log_info "Admin API: http://localhost:${RESTATE_ADMIN_PORT}"
    
    # Wait for health check
    if check_health; then
        log_info "Restate is ready to accept workflow invocations"
        return 0
    else
        log_error "Restate started but health check failed"
        return 1
    fi
}

# Stop Restate server
stop_restate() {
    check_docker
    
    if ! container_running; then
        log_warn "Restate container is not running"
        return 0
    fi
    
    log_info "Stopping Restate container..."
    docker stop "${RESTATE_CONTAINER_NAME}"
    log_info "Restate server stopped gracefully"
}

# Restart Restate server
restart_restate() {
    log_info "Restarting Restate server..."
    stop_restate
    sleep 2
    start_restate
}

# Show Restate status
status_restate() {
    check_docker
    
    if container_running; then
        log_info "Restate container is running"
        docker ps --filter "name=${RESTATE_CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        
        if curl -f -s "${RESTATE_HEALTH_ENDPOINT}" > /dev/null 2>&1; then
            log_info "Health check: PASSED"
        else
            log_warn "Health check: FAILED"
        fi
    elif container_exists; then
        log_warn "Restate container exists but is not running"
        docker ps -a --filter "name=${RESTATE_CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}"
    else
        log_info "Restate container does not exist"
    fi
}

# View Restate logs
logs_restate() {
    check_docker
    
    if ! container_exists; then
        log_error "Restate container does not exist"
        exit 1
    fi
    
    log_info "Showing Restate logs (Ctrl+C to exit)..."
    docker logs -f "${RESTATE_CONTAINER_NAME}"
}

# Remove Restate container and volume
clean_restate() {
    check_docker
    
    log_warn "This will remove the Restate container and all persistent data"
    read -p "Are you sure? (yes/no): " -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Clean operation cancelled"
        return 0
    fi
    
    if container_running; then
        log_info "Stopping Restate container..."
        docker stop "${RESTATE_CONTAINER_NAME}"
    fi
    
    if container_exists; then
        log_info "Removing Restate container..."
        docker rm "${RESTATE_CONTAINER_NAME}"
    fi
    
    if docker volume ls --format '{{.Name}}' | grep -q "^${RESTATE_VOLUME}$"; then
        log_info "Removing Restate data volume..."
        docker volume rm "${RESTATE_VOLUME}"
    fi
    
    log_info "Cleanup complete"
}

# Show usage information
show_usage() {
    cat << EOF
Restate Infrastructure Management Script

Usage: $0 {start|stop|restart|status|logs|clean|health}

Commands:
    start       Start the Restate server (creates container if needed)
    stop        Stop the Restate server gracefully
    restart     Restart the Restate server
    status      Show Restate server status
    logs        Show Restate server logs (follow mode)
    clean       Remove Restate container and persistent data
    health      Check Restate server health

Configuration:
    Ingress Port:  ${RESTATE_INGRESS_PORT}
    Admin Port:    ${RESTATE_ADMIN_PORT}
    Container:     ${RESTATE_CONTAINER_NAME}
    Volume:        ${RESTATE_VOLUME}
    Image:         ${RESTATE_IMAGE}

Examples:
    $0 start        # Start Restate server
    $0 status       # Check if Restate is running
    $0 logs         # View server logs
    $0 stop         # Stop the server

EOF
}

# Main script logic
case "$1" in
    start)
        start_restate
        ;;
    stop)
        stop_restate
        ;;
    restart)
        restart_restate
        ;;
    status)
        status_restate
        ;;
    logs)
        logs_restate
        ;;
    clean)
        clean_restate
        ;;
    health)
        check_docker
        if container_running; then
            check_health
        else
            log_error "Restate container is not running"
            exit 1
        fi
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0
