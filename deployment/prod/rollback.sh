#!/bin/bash

# Production Rollback Script
# Rolls back to the previous deployment version
#
# This script:
# 1. Identifies the previous deployment version
# 2. Stops current services
# 3. Restores previous Docker images
# 4. Starts services with previous version
# 5. Verifies rollback success with health checks
#
# Usage: ./rollback.sh [OPTIONS]
# Options:
#   --version VERSION    Rollback to specific version (default: previous)
#   --skip-health-check  Skip health check verification
#   --force              Force rollback without confirmation
#   --help               Show this help message
#
# Exit codes:
#   0 - Success
#   1 - Rollback failed
#   2 - No previous version found
#   3 - Health check failed

set -e  # Exit on error
set -o pipefail  # Catch errors in pipes

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default options
TARGET_VERSION=""
SKIP_HEALTH_CHECK=false
FORCE=false

# Version tracking file
VERSION_FILE="${SCRIPT_DIR}/.deployment-versions"
ROLLBACK_LOG="${SCRIPT_DIR}/rollback.log"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --version)
            TARGET_VERSION="$2"
            shift 2
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --version VERSION    Rollback to specific version (default: previous)"
            echo "  --skip-health-check  Skip health check verification"
            echo "  --force              Force rollback without confirmation"
            echo "  --help               Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo "[${timestamp}] [${level}] ${message}" >> "${ROLLBACK_LOG}"
    
    case $level in
        INFO)
            echo -e "${BLUE}ℹ${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}✓${NC} ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}⚠${NC} ${message}"
            ;;
        ERROR)
            echo -e "${RED}✗${NC} ${message}"
            ;;
        PROGRESS)
            echo -e "${CYAN}▶${NC} ${message}"
            ;;
    esac
}

# Send notification
send_notification() {
    local type=$1
    local message=$2
    
    local notify_script="${SCRIPT_DIR}/notify.sh"
    
    if [ -f "${notify_script}" ]; then
        bash "${notify_script}" --type "${type}" --title "Production Rollback" "${message}" || true
    fi
}

# Error handler
handle_error() {
    local exit_code=$1
    local error_message=$2
    
    log ERROR "${error_message}"
    log ERROR "Rollback failed with exit code: ${exit_code}"
    
    # Send failure notification
    send_notification "error" "Rollback failed: ${error_message}"
    
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Rollback Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}${error_message}${NC}"
    echo ""
    echo -e "Check logs: ${ROLLBACK_LOG}"
    echo ""
    
    exit "${exit_code}"
}

# Print header
print_header() {
    echo ""
    echo -e "${MAGENTA}========================================${NC}"
    echo -e "${MAGENTA}$1${NC}"
    echo -e "${MAGENTA}========================================${NC}"
    echo ""
}

# Initialize version tracking
init_version_tracking() {
    if [ ! -f "${VERSION_FILE}" ]; then
        log INFO "Creating version tracking file"
        touch "${VERSION_FILE}"
    fi
}

# Get current version
get_current_version() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo "unknown"
        return
    fi
    
    tail -n 1 "${VERSION_FILE}" | cut -d',' -f1
}

# Get previous version
get_previous_version() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo ""
        return
    fi
    
    # Get second to last line
    local line_count=$(wc -l < "${VERSION_FILE}")
    
    if [ "$line_count" -lt 2 ]; then
        echo ""
        return
    fi
    
    tail -n 2 "${VERSION_FILE}" | head -n 1 | cut -d',' -f1
}

# List available versions
list_versions() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo "No deployment history found"
        return
    fi
    
    echo "Available versions:"
    echo ""
    
    local line_num=1
    while IFS=',' read -r version timestamp; do
        if [ $line_num -eq $(wc -l < "${VERSION_FILE}") ]; then
            echo -e "  ${GREEN}${version}${NC} (current) - deployed at ${timestamp}"
        else
            echo -e "  ${version} - deployed at ${timestamp}"
        fi
        line_num=$((line_num + 1))
    done < "${VERSION_FILE}"
}

# Confirm rollback
confirm_rollback() {
    local current_version=$1
    local target_version=$2
    
    if [ "$FORCE" = true ]; then
        return 0
    fi
    
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Rollback Confirmation${NC}"
    echo -e "${YELLOW}========================================${NC}"
    echo ""
    echo -e "Current version: ${GREEN}${current_version}${NC}"
    echo -e "Target version:  ${CYAN}${target_version}${NC}"
    echo ""
    echo -e "${YELLOW}This will:${NC}"
    echo -e "  1. Stop all running services"
    echo -e "  2. Restore Docker images to version ${target_version}"
    echo -e "  3. Restart services with previous version"
    echo -e "  4. Verify health checks"
    echo ""
    echo -e "${RED}WARNING: This operation will cause downtime!${NC}"
    echo ""
    
    read -p "Do you want to proceed? (yes/no): " -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log INFO "Rollback cancelled by user"
        echo "Rollback cancelled"
        exit 0
    fi
}

# Stop current services
stop_services() {
    print_header "Step 1: Stopping Current Services"
    
    log PROGRESS "Stopping Docker Compose services..."
    
    cd "${SCRIPT_DIR}"
    
    if docker-compose -f docker-compose.yml down; then
        log SUCCESS "Services stopped"
    else
        log WARNING "Failed to stop some services (may already be stopped)"
    fi
}

# Restore previous version
restore_version() {
    local target_version=$1
    
    print_header "Step 2: Restoring Version ${target_version}"
    
    log PROGRESS "Restoring Docker images to version ${target_version}..."
    
    # Tag previous images as latest
    local images=(
        "bookmarks-web"
        "bookmarks-server"
        "bookmarks-restate-worker"
    )
    
    local restore_failed=false
    
    for image in "${images[@]}"; do
        local versioned_image="${image}:${target_version}"
        local latest_image="${image}:latest"
        
        # Check if versioned image exists
        if docker image inspect "${versioned_image}" > /dev/null 2>&1; then
            log INFO "Restoring ${image}..."
            
            # Tag versioned image as latest
            if docker tag "${versioned_image}" "${latest_image}"; then
                log SUCCESS "Restored ${image}"
            else
                log ERROR "Failed to restore ${image}"
                restore_failed=true
            fi
        else
            log WARNING "Versioned image not found: ${versioned_image}"
            log WARNING "Attempting to use existing latest image for ${image}"
        fi
    done
    
    if [ "$restore_failed" = true ]; then
        handle_error 1 "Failed to restore one or more images"
    fi
    
    log SUCCESS "Version restoration completed"
}

# Start services
start_services() {
    print_header "Step 3: Starting Services"
    
    log PROGRESS "Starting Docker Compose services..."
    
    cd "${SCRIPT_DIR}"
    
    if docker-compose -f docker-compose.yml up -d; then
        log SUCCESS "Services started"
    else
        handle_error 1 "Failed to start services"
    fi
    
    # Wait for services to initialize
    log INFO "Waiting for services to initialize (30 seconds)..."
    sleep 30
}

# Verify health checks
verify_health() {
    if [ "$SKIP_HEALTH_CHECK" = true ]; then
        log WARNING "Skipping health check verification (--skip-health-check flag)"
        return 0
    fi
    
    print_header "Step 4: Health Check Verification"
    
    log PROGRESS "Running health checks..."
    
    local health_check_script="${SCRIPT_DIR}/health-check.sh"
    
    if [ ! -f "${health_check_script}" ]; then
        log WARNING "Health check script not found: ${health_check_script}"
        return 0
    fi
    
    # Run health checks with retries
    local max_retries=5
    local retry_delay=10
    local retry_count=0
    
    while [ $retry_count -lt $max_retries ]; do
        if bash "${health_check_script}"; then
            log SUCCESS "All health checks passed"
            return 0
        fi
        
        retry_count=$((retry_count + 1))
        
        if [ $retry_count -lt $max_retries ]; then
            log WARNING "Health check failed (attempt ${retry_count}/${max_retries}), retrying in ${retry_delay}s..."
            sleep $retry_delay
        fi
    done
    
    handle_error 3 "Health checks failed after ${max_retries} attempts"
}

# Update version tracking
update_version_tracking() {
    local target_version=$1
    
    # Add rollback entry
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "${target_version},${timestamp}" >> "${VERSION_FILE}"
    
    log INFO "Updated version tracking"
}

# Print rollback summary
print_summary() {
    local target_version=$1
    
    print_header "Rollback Summary"
    
    log SUCCESS "Rollback completed successfully!"
    log INFO "Restored to version: ${target_version}"
    log INFO "Log file: ${ROLLBACK_LOG}"
    
    # Send success notification
    send_notification "success" "Rollback to version ${target_version} completed successfully"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Rollback Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Services are now running version: ${CYAN}${target_version}${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Verify application functionality"
    echo -e "  2. Monitor logs: docker-compose -f ${SCRIPT_DIR}/docker-compose.yml logs -f"
    echo -e "  3. Check health: ${SCRIPT_DIR}/health-check.sh"
    echo ""
}

# Main execution
main() {
    # Initialize log file
    echo "========================================" > "${ROLLBACK_LOG}"
    echo "Rollback Log" >> "${ROLLBACK_LOG}"
    echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${ROLLBACK_LOG}"
    echo "========================================" >> "${ROLLBACK_LOG}"
    echo "" >> "${ROLLBACK_LOG}"
    
    print_header "Production Rollback"
    
    log INFO "Started at: $(date)"
    echo ""
    
    # Initialize version tracking
    init_version_tracking
    
    # Get current and previous versions
    local current_version=$(get_current_version)
    local previous_version=$(get_previous_version)
    
    # Determine target version
    if [ -n "$TARGET_VERSION" ]; then
        log INFO "Target version specified: ${TARGET_VERSION}"
        target_version="$TARGET_VERSION"
    elif [ -n "$previous_version" ]; then
        log INFO "Using previous version: ${previous_version}"
        target_version="$previous_version"
    else
        log ERROR "No previous version found"
        echo ""
        list_versions
        echo ""
        handle_error 2 "Cannot rollback: no previous deployment version found"
    fi
    
    log INFO "Current version: ${current_version}"
    log INFO "Target version: ${target_version}"
    
    # Show available versions
    echo ""
    list_versions
    
    # Confirm rollback
    confirm_rollback "$current_version" "$target_version"
    
    # Send start notification
    send_notification "warning" "Rollback to version ${target_version} started"
    
    # Execute rollback steps
    stop_services
    restore_version "$target_version"
    start_services
    verify_health
    update_version_tracking "$target_version"
    print_summary "$target_version"
    
    exit 0
}

# Run main function
main "$@"
