#!/bin/bash

# Production Deployment Script
# Main orchestrator for deploying all services to production
#
# This script:
# 1. Validates environment variables
# 2. Runs database migrations
# 3. Starts services with health check verification
# 4. Registers Restate workflows
# 5. Verifies deployment success
#
# Usage: ./deploy.sh [OPTIONS]
# Options:
#   --skip-migrations    Skip database migration execution
#   --skip-health-check  Skip health check verification
#   --skip-registration  Skip Restate workflow registration
#   --env-file FILE      Use custom environment file (default: .env.production)
#   --help               Show this help message
#
# Exit codes:
#   0 - Success
#   1 - Validation failed
#   2 - Migration failed
#   3 - Service startup failed
#   4 - Health check failed
#   5 - Registration failed

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
DEPLOYMENT_DIR="$(dirname "$SCRIPT_DIR")"

# Default options
SKIP_MIGRATIONS=false
SKIP_HEALTH_CHECK=false
SKIP_REGISTRATION=false
ENV_FILE="${DEPLOYMENT_DIR}/.env.production"

# Deployment tracking
DEPLOYMENT_LOG="${SCRIPT_DIR}/deployment.log"
DEPLOYMENT_START_TIME=$(date +%s)
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-migrations)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --skip-health-check)
            SKIP_HEALTH_CHECK=true
            shift
            ;;
        --skip-registration)
            SKIP_REGISTRATION=true
            shift
            ;;
        --env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-migrations    Skip database migration execution"
            echo "  --skip-health-check  Skip health check verification"
            echo "  --skip-registration  Skip Restate workflow registration"
            echo "  --env-file FILE      Use custom environment file (default: .env.production)"
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
    
    echo "[${timestamp}] [${level}] ${message}" >> "${DEPLOYMENT_LOG}"
    
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

# Error handler
handle_error() {
    local exit_code=$1
    local error_message=$2
    
    log ERROR "${error_message}"
    log ERROR "Deployment failed with exit code: ${exit_code}"
    log ERROR "Check ${DEPLOYMENT_LOG} for details"
    
    # Send failure notification
    send_notification "error" "Deployment ${DEPLOYMENT_ID} failed: ${error_message}"
    
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}Deployment Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}${error_message}${NC}"
    echo ""
    echo -e "Check logs: ${DEPLOYMENT_LOG}"
    echo -e "To rollback: ${SCRIPT_DIR}/rollback.sh"
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

# Validate required environment variables
validate_environment() {
    print_header "Step 1: Environment Validation"
    
    log PROGRESS "Validating environment configuration..."
    
    # Check if environment file exists
    if [ ! -f "${ENV_FILE}" ]; then
        handle_error 1 "Environment file not found: ${ENV_FILE}"
    fi
    
    log INFO "Using environment file: ${ENV_FILE}"
    
    # Load environment variables
    set -a
    source "${ENV_FILE}"
    set +a
    
    # Required variables
    local required_vars=(
        "DATABASE_URL"
        "BETTER_AUTH_SECRET"
        "BETTER_AUTH_URL"
        "CORS_ORIGIN"
        "RESTATE_INGRESS_URL"
        "RESTATE_ADMIN_URL"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log ERROR "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log ERROR "  - ${var}"
        done
        handle_error 1 "Environment validation failed"
    fi
    
    # Validate critical values are not placeholders
    if [[ "${BETTER_AUTH_SECRET}" == *"CHANGE"* ]] || [[ "${BETTER_AUTH_SECRET}" == *"REPLACE"* ]]; then
        handle_error 1 "BETTER_AUTH_SECRET contains placeholder value. Generate a secure secret."
    fi
    
    if [[ "${DATABASE_URL}" == *"CHANGE"* ]] || [[ "${DATABASE_URL}" == *"password"* ]]; then
        log WARNING "DATABASE_URL may contain placeholder values. Verify credentials."
    fi
    
    log SUCCESS "Environment validation passed"
    log INFO "Database: ${DATABASE_URL%%\?*}"
    log INFO "API URL: ${BETTER_AUTH_URL}"
    log INFO "CORS Origin: ${CORS_ORIGIN}"
    log INFO "Restate Ingress: ${RESTATE_INGRESS_URL}"
}

# Run database migrations
run_migrations() {
    if [ "$SKIP_MIGRATIONS" = true ]; then
        log WARNING "Skipping database migrations (--skip-migrations flag)"
        return 0
    fi
    
    print_header "Step 2: Database Migrations"
    
    log PROGRESS "Running database migrations..."
    
    # Check if migration script exists
    local migration_script="${DEPLOYMENT_DIR}/scripts/run-migrations.sh"
    
    if [ -f "${migration_script}" ]; then
        log INFO "Using migration script: ${migration_script}"
        if bash "${migration_script}"; then
            log SUCCESS "Database migrations completed"
        else
            handle_error 2 "Database migration failed"
        fi
    else
        # Fallback: Run Prisma migrations directly
        log INFO "Migration script not found, running Prisma migrations directly"
        
        # Navigate to db package
        local db_package_dir="${DEPLOYMENT_DIR}/../packages/db"
        
        if [ ! -d "${db_package_dir}" ]; then
            handle_error 2 "Database package not found: ${db_package_dir}"
        fi
        
        cd "${db_package_dir}"
        
        # Run migrations
        if npx prisma migrate deploy; then
            log SUCCESS "Database migrations completed"
        else
            handle_error 2 "Prisma migration failed"
        fi
        
        cd "${SCRIPT_DIR}"
    fi
}

# Start services
start_services() {
    print_header "Step 3: Starting Services"
    
    log PROGRESS "Starting Docker Compose services..."
    
    # Navigate to prod directory
    cd "${SCRIPT_DIR}"
    
    # Pull latest images (if using registry)
    log INFO "Pulling latest images..."
    docker-compose -f docker-compose.yml pull || log WARNING "Failed to pull images (may be using local builds)"
    
    # Start services
    log INFO "Starting services in detached mode..."
    if docker-compose -f docker-compose.yml up -d; then
        log SUCCESS "Services started"
    else
        handle_error 3 "Failed to start services"
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
    
    handle_error 4 "Health checks failed after ${max_retries} attempts"
}

# Register Restate workflows
register_workflows() {
    if [ "$SKIP_REGISTRATION" = true ]; then
        log WARNING "Skipping Restate workflow registration (--skip-registration flag)"
        return 0
    fi
    
    print_header "Step 5: Restate Workflow Registration"
    
    log PROGRESS "Registering Restate workflows..."
    
    # Wait for Restate admin API to be ready
    local restate_admin_url="${RESTATE_ADMIN_URL:-http://localhost:9070}"
    local max_retries=10
    local retry_delay=5
    local retry_count=0
    
    log INFO "Waiting for Restate admin API at ${restate_admin_url}..."
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -f -s "${restate_admin_url}/health" > /dev/null 2>&1; then
            log SUCCESS "Restate admin API is ready"
            break
        fi
        
        retry_count=$((retry_count + 1))
        
        if [ $retry_count -eq $max_retries ]; then
            handle_error 5 "Restate admin API not ready after ${max_retries} attempts"
        fi
        
        log INFO "Attempt ${retry_count}/${max_retries}: Waiting for Restate admin API..."
        sleep $retry_delay
    done
    
    # Register the worker
    local worker_host="${WORKER_HOST:-restate-worker}"
    local worker_port="${RESTATE_SERVICE_PORT:-9080}"
    local worker_url="http://${worker_host}:${worker_port}"
    
    log INFO "Registering worker at ${worker_url}..."
    
    local response=$(curl -s -w "\n%{http_code}" -X POST "${restate_admin_url}/deployments" \
        -H "Content-Type: application/json" \
        -d "{\"uri\": \"${worker_url}\"}")
    
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        log SUCCESS "Successfully registered Restate worker"
        
        # Extract and display registered services
        local services=$(echo "$body" | grep -o '"name":"[^"]*"' | sed 's/"name":"//g' | sed 's/"//g' || echo "")
        
        if [ -n "$services" ]; then
            log INFO "Registered services:"
            echo "$services" | while read -r service; do
                log INFO "  - ${service}"
            done
        fi
    elif [ "$http_code" = "409" ]; then
        log SUCCESS "Restate worker already registered"
    else
        log ERROR "Failed to register Restate worker"
        log ERROR "HTTP Status: ${http_code}"
        log ERROR "Response: ${body}"
        handle_error 5 "Restate workflow registration failed"
    fi
}

# Send notification
send_notification() {
    local type=$1
    local message=$2
    
    local notify_script="${SCRIPT_DIR}/notify.sh"
    
    if [ -f "${notify_script}" ]; then
        bash "${notify_script}" --type "${type}" --title "Production Deployment" "${message}" || true
    fi
}

# Print deployment summary
print_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - DEPLOYMENT_START_TIME))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    print_header "Deployment Summary"
    
    log SUCCESS "Deployment completed successfully!"
    log INFO "Deployment ID: ${DEPLOYMENT_ID}"
    log INFO "Duration: ${minutes}m ${seconds}s"
    log INFO "Log file: ${DEPLOYMENT_LOG}"
    
    # Send success notification
    send_notification "success" "Deployment ${DEPLOYMENT_ID} completed successfully in ${minutes}m ${seconds}s"
    
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Deployment Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "Services are now running:"
    echo -e "  ${CYAN}Web:${NC}     ${CORS_ORIGIN}"
    echo -e "  ${CYAN}API:${NC}     ${BETTER_AUTH_URL}"
    echo -e "  ${CYAN}Restate:${NC} ${RESTATE_INGRESS_URL}"
    echo ""
    echo -e "Next steps:"
    echo -e "  1. Verify application functionality"
    echo -e "  2. Monitor logs: docker-compose -f ${SCRIPT_DIR}/docker-compose.yml logs -f"
    echo -e "  3. Check health: ${SCRIPT_DIR}/health-check.sh"
    echo ""
    echo -e "To view service status:"
    echo -e "  docker-compose -f ${SCRIPT_DIR}/docker-compose.yml ps"
    echo ""
}

# Main execution
main() {
    # Initialize log file
    echo "========================================" > "${DEPLOYMENT_LOG}"
    echo "Deployment Log: ${DEPLOYMENT_ID}" >> "${DEPLOYMENT_LOG}"
    echo "Started: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "${DEPLOYMENT_LOG}"
    echo "========================================" >> "${DEPLOYMENT_LOG}"
    echo "" >> "${DEPLOYMENT_LOG}"
    
    print_header "Production Deployment"
    
    log INFO "Deployment ID: ${DEPLOYMENT_ID}"
    log INFO "Started at: $(date)"
    echo ""
    
    # Send start notification
    send_notification "info" "Deployment ${DEPLOYMENT_ID} started"
    
    # Execute deployment steps
    validate_environment
    run_migrations
    start_services
    verify_health
    register_workflows
    print_summary
    
    exit 0
}

# Run main function
main "$@"
