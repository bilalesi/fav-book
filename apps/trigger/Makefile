.PHONY: help setup start stop restart logs status health backup clean update test

# Default target
help:
	@echo "Trigger.dev Infrastructure Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make setup      - Initial setup (run once)"
	@echo "  make start      - Start all services"
	@echo "  make stop       - Stop all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs (all services)"
	@echo "  make status     - Check service status"
	@echo "  make health     - Run health checks"
	@echo "  make backup     - Backup database"
	@echo "  make clean      - Clean up Docker resources"
	@echo "  make update     - Update services to latest"
	@echo "  make test       - Run connectivity tests"
	@echo ""

# Initial setup
setup:
	@echo "Running initial setup..."
	@./start-infrastructure.sh

# Start services
start:
	@echo "Starting services..."
	@cd docker && docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml up -d
	@docker-compose -f cobalt-compose.yml up -d
	@echo "Services started. Access Trigger.dev at http://localhost:8030"

# Stop services
stop:
	@echo "Stopping services..."
	@cd docker && docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml down
	@docker-compose -f cobalt-compose.yml down
	@echo "Services stopped"

# Restart services
restart:
	@echo "Restarting services..."
	@cd docker && docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml restart
	@docker-compose -f cobalt-compose.yml restart
	@echo "Services restarted"

# View logs
logs:
	@cd docker && docker-compose -f webapp/docker-compose.yml logs -f

# View logs for specific service
logs-webapp:
	@cd docker && docker-compose -f webapp/docker-compose.yml logs -f webapp

logs-supervisor:
	@cd docker && docker-compose -f worker/docker-compose.yml logs -f supervisor

logs-cobalt:
	@docker-compose -f cobalt-compose.yml logs -f cobalt

# Check status
status:
	@echo "Service Status:"
	@cd docker && docker-compose -f webapp/docker-compose.yml ps
	@echo ""
	@cd docker && docker-compose -f worker/docker-compose.yml ps
	@echo ""
	@docker-compose -f cobalt-compose.yml ps

# Run health checks
health:
	@./healthcheck.sh

# Run connectivity tests
test:
	@./test-connectivity.sh

# Backup database
backup:
	@echo "Creating database backup..."
	@BACKUP_FILE="backup-$$(date +%Y%m%d-%H%M%S).sql" && \
	cd docker && docker-compose -f webapp/docker-compose.yml exec -T postgres pg_dump -U postgres main > ../$$BACKUP_FILE && \
	cd .. && gzip $$BACKUP_FILE && \
	echo "Backup created: $${BACKUP_FILE}.gz"

# Clean up Docker resources
clean:
	@echo "Cleaning up Docker resources..."
	@cd docker && docker-compose -f webapp/docker-compose.yml rm -f
	@docker image prune -f
	@docker network prune -f
	@echo "Cleanup complete"

# Update services
update:
	@echo "Updating services..."
	@cd docker && docker-compose -f webapp/docker-compose.yml pull
	@cd docker && docker-compose -f worker/docker-compose.yml pull
	@docker-compose -f cobalt-compose.yml pull
	@cd docker && docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml up -d
	@docker-compose -f cobalt-compose.yml up -d
	@echo "Services updated"

# Pull images
pull:
	@echo "Pulling latest images..."
	@cd docker && docker-compose -f webapp/docker-compose.yml pull
	@cd docker && docker-compose -f worker/docker-compose.yml pull
	@docker-compose -f cobalt-compose.yml pull

# Show resource usage
resources:
	@echo "Docker Resource Usage:"
	@docker stats --no-stream
	@echo ""
	@echo "Disk Usage:"
	@docker system df

# Access MinIO console
minio:
	@echo "Opening MinIO console..."
	@open http://localhost:9001 || xdg-open http://localhost:9001 || echo "Open http://localhost:9001 in your browser"

# Access Trigger.dev webapp
webapp:
	@echo "Opening Trigger.dev webapp..."
	@open http://localhost:8030 || xdg-open http://localhost:8030 || echo "Open http://localhost:8030 in your browser"

# Get worker token from logs
token:
	@echo "Searching for worker token in logs..."
	@cd docker && docker-compose -f webapp/docker-compose.yml logs webapp | grep -A 5 "TRIGGER_WORKER_TOKEN" || echo "Token not found. Using bootstrap token automatically."

# Destroy everything (including volumes)
destroy:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? (yes/no): " confirm && [ "$$confirm" = "yes" ] || exit 1
	@cd docker && docker-compose -f webapp/docker-compose.yml -f worker/docker-compose.yml down -v
	@docker-compose -f cobalt-compose.yml down -v
	@echo "All services and data destroyed"
