#!/bin/bash
# pm2-wrapper.sh
# Wrapper to run commands with dotenvx for PM2

ENV_FILE=$1
shift

# Ensure dotenvx is in PATH
export PATH="$HOME/.local/bin:$PATH"

# Run the command with dotenvx
exec dotenvx run --env-file="$ENV_FILE" -- "$@"
