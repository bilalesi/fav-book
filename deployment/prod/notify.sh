#!/bin/bash

# Deployment Notification Script
# Sends notifications for deployment events
#
# This script supports multiple notification channels:
# - Slack webhook
# - Discord webhook
# - Email (via sendmail or SMTP)
# - Custom webhook
#
# Usage: ./notify.sh [OPTIONS] MESSAGE
# Options:
#   --type TYPE      Notification type: success, error, warning, info (default: info)
#   --title TITLE    Notification title (default: "Deployment Notification")
#   --channel CHAN   Notification channel: slack, discord, email, webhook (default: all configured)
#   --help           Show this help message
#
# Environment Variables:
#   SLACK_WEBHOOK_URL     - Slack webhook URL
#   DISCORD_WEBHOOK_URL   - Discord webhook URL
#   NOTIFICATION_EMAIL    - Email address for notifications
#   CUSTOM_WEBHOOK_URL    - Custom webhook URL
#
# Exit codes:
#   0 - Success
#   1 - Failed to send notification

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default options
NOTIFICATION_TYPE="info"
NOTIFICATION_TITLE="Deployment Notification"
NOTIFICATION_CHANNEL="all"
NOTIFICATION_MESSAGE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type)
            NOTIFICATION_TYPE="$2"
            shift 2
            ;;
        --title)
            NOTIFICATION_TITLE="$2"
            shift 2
            ;;
        --channel)
            NOTIFICATION_CHANNEL="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS] MESSAGE"
            echo ""
            echo "Options:"
            echo "  --type TYPE      Notification type: success, error, warning, info (default: info)"
            echo "  --title TITLE    Notification title (default: 'Deployment Notification')"
            echo "  --channel CHAN   Notification channel: slack, discord, email, webhook (default: all configured)"
            echo "  --help           Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  SLACK_WEBHOOK_URL     - Slack webhook URL"
            echo "  DISCORD_WEBHOOK_URL   - Discord webhook URL"
            echo "  NOTIFICATION_EMAIL    - Email address for notifications"
            echo "  CUSTOM_WEBHOOK_URL    - Custom webhook URL"
            echo ""
            exit 0
            ;;
        *)
            NOTIFICATION_MESSAGE="$1"
            shift
            ;;
    esac
done

# Validate message
if [ -z "$NOTIFICATION_MESSAGE" ]; then
    echo -e "${RED}Error: No message provided${NC}"
    echo "Use --help for usage information"
    exit 1
fi

# Get color and emoji based on type
get_notification_color() {
    case $NOTIFICATION_TYPE in
        success)
            echo "#36a64f"  # Green
            ;;
        error)
            echo "#ff0000"  # Red
            ;;
        warning)
            echo "#ff9900"  # Orange
            ;;
        info)
            echo "#0099ff"  # Blue
            ;;
        *)
            echo "#808080"  # Gray
            ;;
    esac
}

get_notification_emoji() {
    case $NOTIFICATION_TYPE in
        success)
            echo "✅"
            ;;
        error)
            echo "❌"
            ;;
        warning)
            echo "⚠️"
            ;;
        info)
            echo "ℹ️"
            ;;
        *)
            echo "📢"
            ;;
    esac
}

# Send Slack notification
send_slack_notification() {
    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        return 0
    fi
    
    local color=$(get_notification_color)
    local emoji=$(get_notification_emoji)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local hostname=$(hostname)
    
    local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "${color}",
      "title": "${emoji} ${NOTIFICATION_TITLE}",
      "text": "${NOTIFICATION_MESSAGE}",
      "fields": [
        {
          "title": "Environment",
          "value": "Production",
          "short": true
        },
        {
          "title": "Host",
          "value": "${hostname}",
          "short": true
        },
        {
          "title": "Type",
          "value": "${NOTIFICATION_TYPE}",
          "short": true
        },
        {
          "title": "Timestamp",
          "value": "${timestamp}",
          "short": true
        }
      ],
      "footer": "Deployment System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' --data "${payload}" "${SLACK_WEBHOOK_URL}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Slack notification sent"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to send Slack notification"
        return 1
    fi
}

# Send Discord notification
send_discord_notification() {
    if [ -z "$DISCORD_WEBHOOK_URL" ]; then
        return 0
    fi
    
    local color_decimal
    case $NOTIFICATION_TYPE in
        success)
            color_decimal=3581519  # Green
            ;;
        error)
            color_decimal=16711680  # Red
            ;;
        warning)
            color_decimal=16750848  # Orange
            ;;
        info)
            color_decimal=39423  # Blue
            ;;
        *)
            color_decimal=8421504  # Gray
            ;;
    esac
    
    local emoji=$(get_notification_emoji)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local hostname=$(hostname)
    
    local payload=$(cat <<EOF
{
  "embeds": [
    {
      "title": "${emoji} ${NOTIFICATION_TITLE}",
      "description": "${NOTIFICATION_MESSAGE}",
      "color": ${color_decimal},
      "fields": [
        {
          "name": "Environment",
          "value": "Production",
          "inline": true
        },
        {
          "name": "Host",
          "value": "${hostname}",
          "inline": true
        },
        {
          "name": "Type",
          "value": "${NOTIFICATION_TYPE}",
          "inline": true
        }
      ],
      "timestamp": "${timestamp}",
      "footer": {
        "text": "Deployment System"
      }
    }
  ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' --data "${payload}" "${DISCORD_WEBHOOK_URL}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Discord notification sent"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to send Discord notification"
        return 1
    fi
}

# Send email notification
send_email_notification() {
    if [ -z "$NOTIFICATION_EMAIL" ]; then
        return 0
    fi
    
    local emoji=$(get_notification_emoji)
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local hostname=$(hostname)
    
    local subject="${emoji} ${NOTIFICATION_TITLE} - ${NOTIFICATION_TYPE}"
    local body=$(cat <<EOF
Deployment Notification

Title: ${NOTIFICATION_TITLE}
Type: ${NOTIFICATION_TYPE}
Environment: Production
Host: ${hostname}
Timestamp: ${timestamp}

Message:
${NOTIFICATION_MESSAGE}

---
This is an automated message from the deployment system.
EOF
)
    
    # Try to send email using mail command
    if command -v mail > /dev/null 2>&1; then
        if echo "${body}" | mail -s "${subject}" "${NOTIFICATION_EMAIL}"; then
            echo -e "${GREEN}✓${NC} Email notification sent"
            return 0
        else
            echo -e "${RED}✗${NC} Failed to send email notification"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠${NC} mail command not available, skipping email notification"
        return 0
    fi
}

# Send custom webhook notification
send_custom_webhook_notification() {
    if [ -z "$CUSTOM_WEBHOOK_URL" ]; then
        return 0
    fi
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local hostname=$(hostname)
    
    local payload=$(cat <<EOF
{
  "title": "${NOTIFICATION_TITLE}",
  "message": "${NOTIFICATION_MESSAGE}",
  "type": "${NOTIFICATION_TYPE}",
  "environment": "production",
  "host": "${hostname}",
  "timestamp": "${timestamp}"
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' --data "${payload}" "${CUSTOM_WEBHOOK_URL}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Custom webhook notification sent"
        return 0
    else
        echo -e "${RED}✗${NC} Failed to send custom webhook notification"
        return 1
    fi
}

# Main execution
main() {
    local notification_sent=false
    local notification_failed=false
    
    echo -e "${BLUE}Sending notifications...${NC}"
    echo ""
    
    # Send to specified channel or all configured channels
    if [ "$NOTIFICATION_CHANNEL" = "all" ] || [ "$NOTIFICATION_CHANNEL" = "slack" ]; then
        if send_slack_notification; then
            notification_sent=true
        else
            notification_failed=true
        fi
    fi
    
    if [ "$NOTIFICATION_CHANNEL" = "all" ] || [ "$NOTIFICATION_CHANNEL" = "discord" ]; then
        if send_discord_notification; then
            notification_sent=true
        else
            notification_failed=true
        fi
    fi
    
    if [ "$NOTIFICATION_CHANNEL" = "all" ] || [ "$NOTIFICATION_CHANNEL" = "email" ]; then
        if send_email_notification; then
            notification_sent=true
        else
            notification_failed=true
        fi
    fi
    
    if [ "$NOTIFICATION_CHANNEL" = "all" ] || [ "$NOTIFICATION_CHANNEL" = "webhook" ]; then
        if send_custom_webhook_notification; then
            notification_sent=true
        else
            notification_failed=true
        fi
    fi
    
    echo ""
    
    if [ "$notification_sent" = false ]; then
        echo -e "${YELLOW}⚠${NC} No notification channels configured"
        echo ""
        echo "Configure notification channels by setting environment variables:"
        echo "  - SLACK_WEBHOOK_URL"
        echo "  - DISCORD_WEBHOOK_URL"
        echo "  - NOTIFICATION_EMAIL"
        echo "  - CUSTOM_WEBHOOK_URL"
        echo ""
        return 0
    fi
    
    if [ "$notification_failed" = true ]; then
        echo -e "${YELLOW}⚠${NC} Some notifications failed to send"
        return 1
    fi
    
    echo -e "${GREEN}✓${NC} All notifications sent successfully"
    return 0
}

main "$@"
