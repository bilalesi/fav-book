#!/bin/bash

# Deployment Status Tracking Script
# Displays current deployment status and history
#
# Usage: ./deployment-status.sh [OPTIONS]
# Options:
#   --json           Output in JSON format
#   --history        Show deployment history
#   --watch          Continuously monitor status (updates every 10s)
#   --help           Show this help message
#
# Exit codes:
#   0 - Success

set -e

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

# Configuration
VERSION_FILE="${SCRIPT_DIR}/.deployment-versions"
DEPLOYMENT_LOG="${SCRIPT_DIR}/deployment.log"
JSON_OUTPUT=false
SHOW_HISTORY=false
WATCH_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        --history)
            SHOW_HISTORY=true
            shift
            ;;
        --watch)
            WATCH_MODE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --json           Output in JSON format"
            echo "  --history        Show deployment history"
            echo "  --watch          Continuously monitor status (updates every 10s)"
            echo "  --help           Show this help message"
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

# Get current version
get_current_version() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo "unknown"
        return
    fi
    
    tail -n 1 "${VERSION_FILE}" | cut -d',' -f1
}

# Get deployment timestamp
get_deployment_timestamp() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo "unknown"
        return
    fi
    
    tail -n 1 "${VERSION_FILE}" | cut -d',' -f2
}

# Get service status
get_service_status() {
    cd "${SCRIPT_DIR}"
    
    local services=()
    
    # Get all services from docker-compose
    while IFS= read -r line; do
        local service_name=$(echo "$line" | awk '{print $1}')
        local service_status=$(echo "$line" | awk '{print $2}')
        local uptime=$(echo "$line" | awk '{print $3, $4}')
        
        # Determine status
        local status="stopped"
        if [[ "$service_status" == *"Up"* ]]; then
            status="running"
        elif [[ "$service_status" == *"Exit"* ]] || [[ "$service_status" == *"Restarting"* ]]; then
            status="error"
        fi
        
        # Get restart count
        local restart_count=$(docker inspect --format='{{.RestartCount}}' "bookmarks-prod-${service_name}" 2>/dev/null || echo "0")
        
        services+=("{\"name\":\"${service_name}\",\"status\":\"${status}\",\"uptime\":\"${uptime}\",\"restartCount\":${restart_count}}")
    done < <(docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.RunningFor}}" | tail -n +2)
    
    # Join array elements with commas
    local services_json=$(IFS=,; echo "${services[*]}")
    echo "[${services_json}]"
}

# Get deployment history
get_deployment_history() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo "[]"
        return
    fi
    
    local history=()
    
    while IFS=',' read -r version timestamp; do
        history+=("{\"version\":\"${version}\",\"timestamp\":\"${timestamp}\"}")
    done < "${VERSION_FILE}"
    
    # Join array elements with commas
    local history_json=$(IFS=,; echo "${history[*]}")
    echo "[${history_json}]"
}

# Output JSON status
output_json() {
    local current_version=$(get_current_version)
    local deployment_timestamp=$(get_deployment_timestamp)
    local services=$(get_service_status)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat <<EOF
{
  "environment": "production",
  "version": "${current_version}",
  "deployedAt": "${deployment_timestamp}",
  "services": ${services},
  "timestamp": "${timestamp}"
}
EOF
}

# Output human-readable status
output_human() {
    local current_version=$(get_current_version)
    local deployment_timestamp=$(get_deployment_timestamp)
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deployment Status${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "Environment:     ${CYAN}production${NC}"
    echo -e "Current Version: ${GREEN}${current_version}${NC}"
    echo -e "Deployed At:     ${deployment_timestamp}"
    echo -e "Status Time:     $(date)"
    echo ""
    
    # Service status
    echo -e "${BLUE}Services:${NC}"
    echo ""
    
    cd "${SCRIPT_DIR}"
    
    # Get service status from docker-compose
    if docker-compose ps > /dev/null 2>&1; then
        while IFS= read -r line; do
            local service_name=$(echo "$line" | awk '{print $1}')
            local service_status=$(echo "$line" | awk '{print $2}')
            local uptime=$(echo "$line" | awk '{print $3, $4}')
            
            # Determine status color
            local status_color="${GREEN}"
            local status_symbol="✓"
            
            if [[ "$service_status" == *"Up"* ]]; then
                status_color="${GREEN}"
                status_symbol="✓"
            elif [[ "$service_status" == *"Exit"* ]] || [[ "$service_status" == *"Restarting"* ]]; then
                status_color="${RED}"
                status_symbol="✗"
            else
                status_color="${YELLOW}"
                status_symbol="⚠"
            fi
            
            # Get restart count
            local restart_count=$(docker inspect --format='{{.RestartCount}}' "bookmarks-prod-${service_name}" 2>/dev/null || echo "0")
            
            printf "  ${status_color}${status_symbol}${NC} %-20s ${service_status} (uptime: ${uptime}, restarts: ${restart_count})\n" "${service_name}"
        done < <(docker-compose ps --format "table {{.Service}}\t{{.Status}}\t{{.RunningFor}}" | tail -n +2)
    else
        echo -e "  ${RED}✗${NC} Unable to get service status (docker-compose not running)"
    fi
    
    echo ""
    
    # Recent logs
    if [ -f "${DEPLOYMENT_LOG}" ]; then
        echo -e "${BLUE}Recent Deployment Events:${NC}"
        echo ""
        tail -n 5 "${DEPLOYMENT_LOG}" | while read -r line; do
            echo "  ${line}"
        done
        echo ""
    fi
}

# Show deployment history
show_history() {
    if [ ! -f "${VERSION_FILE}" ] || [ ! -s "${VERSION_FILE}" ]; then
        echo "No deployment history found"
        return
    fi
    
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Deployment History${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    local line_num=1
    local total_lines=$(wc -l < "${VERSION_FILE}")
    
    while IFS=',' read -r version timestamp; do
        if [ $line_num -eq $total_lines ]; then
            echo -e "  ${GREEN}${version}${NC} (current) - ${timestamp}"
        else
            echo -e "  ${version} - ${timestamp}"
        fi
        line_num=$((line_num + 1))
    done < "${VERSION_FILE}"
    
    echo ""
}

# Watch mode
watch_status() {
    while true; do
        clear
        output_human
        echo -e "${CYAN}Refreshing in 10 seconds... (Ctrl+C to exit)${NC}"
        sleep 10
    done
}

# Main execution
main() {
    if [ "$WATCH_MODE" = true ]; then
        watch_status
    elif [ "$SHOW_HISTORY" = true ]; then
        if [ "$JSON_OUTPUT" = true ]; then
            get_deployment_history
        else
            show_history
        fi
    elif [ "$JSON_OUTPUT" = true ]; then
        output_json
    else
        output_human
    fi
    
    exit 0
}

main "$@"
