# Troubleshooting Guide

Common issues and solutions for the Trigger.dev infrastructure.

## Table of Contents

- [Services Won't Start](#services-wont-start)
- [Worker Not Connecting](#worker-not-connecting)
- [Database Issues](#database-issues)
- [MinIO/Storage Issues](#miniostorage-issues)
- [Cobalt API Issues](#cobalt-api-issues)
- [Registry Issues](#registry-issues)
- [Performance Issues](#performance-issues)
- [Network Issues](#network-issues)

## Services Won't Start

### Symptom

Services fail to start or immediately exit.

### Solutions

1. **Check Docker is running**

   ```bash
   docker info
   ```

   If this fails, start Docker Desktop or the Docker daemon.

2. **Check for port conflicts**

   ```bash
   # Check if ports are already in use
   lsof -i :8030  # Trigger.dev webapp
   lsof -i :9000  # MinIO API
   lsof -i :9001  # MinIO console
   lsof -i :9002  # Cobalt API
   lsof -i :5000  # Registry
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   ```

   Kill the conflicting process or change ports in docker-compose.yml.

3. **Check disk space**

   ```bash
   df -h
   docker system df
   ```

   Free up space if needed: `docker system prune -a`

4. **Check logs for errors**

   ```bash
   docker-compose logs
   ```

5. **Reset everything**
   ```bash
   docker-compose down -v
   ./setup.sh
   ```

## Worker Not Connecting

### Symptom

Supervisor logs show connection errors or "waiting for token".

### Solutions

1. **Check worker token is set**

   ```bash
   grep TRIGGER_WORKER_TOKEN .env
   ```

2. **Get token from webapp logs**

   ```bash
   docker-compose logs webapp | grep "TRIGGER_WORKER_TOKEN"
   ```

   Copy the token (starts with `tr_wgt_`) to your `.env` file.

3. **Use file-based token**
   In `.env`:

   ```bash
   TRIGGER_WORKER_TOKEN=file:///home/node/shared/worker_token
   ```

4. **Restart supervisor**

   ```bash
   docker-compose restart supervisor
   ```

5. **Check supervisor logs**

   ```bash
   docker-compose logs -f supervisor
   ```

6. **Verify webapp is healthy**
   ```bash
   curl http://localhost:8030/health
   docker-compose ps webapp
   ```

## Database Issues

### Symptom

PostgreSQL connection errors or data not persisting.

### Solutions

1. **Check PostgreSQL is running**

   ```bash
   docker-compose ps postgres
   docker-compose logs postgres
   ```

2. **Test connection**

   ```bash
   docker-compose exec postgres psql -U postgres -d triggerdev -c "SELECT 1;"
   ```

3. **Check DATABASE_URL**

   ```bash
   grep DATABASE_URL .env
   ```

   Should be: `postgresql://postgres:password@postgres:5432/triggerdev`

4. **Reset database**

   ```bash
   docker-compose down
   docker volume rm trigger_postgres-data
   docker-compose up -d
   ```

5. **Restore from backup**
   ```bash
   gunzip -c backup.sql.gz | docker-compose exec -T postgres psql -U postgres triggerdev
   ```

## MinIO/Storage Issues

### Symptom

Media uploads fail or MinIO console not accessible.

### Solutions

1. **Check MinIO is running**

   ```bash
   docker-compose ps minio
   curl http://localhost:9000/minio/health/live
   ```

2. **Check MinIO logs**

   ```bash
   docker-compose logs minio
   ```

3. **Verify buckets exist**

   ```bash
   docker-compose exec minio mc ls /data
   ```

   Should show `packets` and `bookmark-media` buckets.

4. **Recreate buckets**

   ```bash
   docker-compose exec minio mc mb /data/packets
   docker-compose exec minio mc mb /data/bookmark-media
   docker-compose exec minio mc anonymous set download /data/bookmark-media
   ```

5. **Check credentials**

   ```bash
   grep OBJECT_STORE .env
   ```

   Default: minioadmin/minioadmin

6. **Access MinIO console**
   Open http://localhost:9001 and login with credentials.

7. **Check disk space**
   ```bash
   docker volume inspect trigger_minio-data
   df -h
   ```

## Cobalt API Issues

### Symptom

Media downloads fail or Cobalt API not responding.

### Solutions

1. **Check Cobalt is running**

   ```bash
   docker-compose -f cobalt-compose.yml ps
   curl http://localhost:9002/api/serverInfo
   ```

2. **Check Cobalt logs**

   ```bash
   docker-compose -f cobalt-compose.yml logs cobalt
   ```

3. **Restart Cobalt**

   ```bash
   docker-compose -f cobalt-compose.yml restart cobalt
   ```

4. **Test download**

   ```bash
   curl -X POST http://localhost:9002/api/json \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
   ```

5. **Check network connectivity**

   ```bash
   docker network inspect trigger-network
   ```

6. **Recreate Cobalt**
   ```bash
   docker-compose -f cobalt-compose.yml down
   docker-compose -f cobalt-compose.yml up -d
   ```

## Registry Issues

### Symptom

Cannot push/pull images or registry authentication fails.

### Solutions

1. **Check registry is running**

   ```bash
   docker-compose ps registry
   curl http://localhost:5000/v2/
   ```

2. **Check registry logs**

   ```bash
   docker-compose logs registry
   ```

3. **Verify htpasswd file exists**

   ```bash
   ls -la registry/auth/.htpasswd
   ```

4. **Regenerate credentials**

   ```bash
   docker run --rm --entrypoint htpasswd httpd:2 -Bbn registry-user very-secure-indeed > registry/auth/.htpasswd
   docker-compose restart registry
   ```

5. **Login to registry**

   ```bash
   docker login -u registry-user localhost:5000
   # Password: very-secure-indeed
   ```

6. **Check registry storage**
   ```bash
   docker volume inspect trigger_registry-data
   ```

## Performance Issues

### Symptom

Slow response times or high resource usage.

### Solutions

1. **Check resource usage**

   ```bash
   docker stats
   ```

2. **Check disk I/O**

   ```bash
   docker system df
   iostat -x 1
   ```

3. **Increase resource limits**
   Edit docker-compose.yml:

   ```yaml
   supervisor:
     deploy:
       resources:
         limits:
           cpus: "8"
           memory: 16G
   ```

4. **Clean up Docker resources**

   ```bash
   docker system prune -a
   docker volume prune
   ```

5. **Check database performance**

   ```bash
   docker-compose exec postgres psql -U postgres -d triggerdev -c "
     SELECT pid, query, state, wait_event_type
     FROM pg_stat_activity
     WHERE state != 'idle';
   "
   ```

6. **Optimize PostgreSQL**
   Add to docker-compose.yml:

   ```yaml
   postgres:
     command: postgres -c shared_buffers=256MB -c max_connections=200
   ```

7. **Add more workers**
   Duplicate the supervisor service in docker-compose.yml.

## Network Issues

### Symptom

Services cannot communicate with each other.

### Solutions

1. **Check network exists**

   ```bash
   docker network inspect trigger-network
   ```

2. **Recreate network**

   ```bash
   docker network rm trigger-network
   docker network create trigger-network
   docker-compose up -d
   ```

3. **Check service connectivity**

   ```bash
   # From webapp to postgres
   docker-compose exec webapp ping postgres

   # From supervisor to webapp
   docker-compose exec supervisor curl http://webapp:3000/health
   ```

4. **Check DNS resolution**

   ```bash
   docker-compose exec webapp nslookup postgres
   ```

5. **Verify all services on same network**
   ```bash
   docker network inspect trigger-network | grep Name
   ```

## Common Error Messages

### "Error: connect ECONNREFUSED"

- Service is not running or not accessible
- Check service is up: `docker-compose ps`
- Check logs: `docker-compose logs [service]`

### "Error: ENOSPC: no space left on device"

- Disk is full
- Clean up: `docker system prune -a --volumes`
- Check space: `df -h`

### "Error: port is already allocated"

- Port conflict with another service
- Find process: `lsof -i :[port]`
- Kill process or change port in docker-compose.yml

### "Error: Cannot connect to the Docker daemon"

- Docker is not running
- Start Docker: `sudo systemctl start docker` (Linux) or start Docker Desktop

### "Error: permission denied"

- Docker socket permissions issue
- Add user to docker group: `sudo usermod -aG docker $USER`
- Logout and login again

### "Error: network not found"

- Docker network doesn't exist
- Create network: `docker network create trigger-network`

## Getting Help

If you're still stuck:

1. **Run diagnostics**

   ```bash
   ./test-connectivity.sh
   ```

2. **Collect logs**

   ```bash
   docker-compose logs > logs.txt
   docker-compose -f cobalt-compose.yml logs >> logs.txt
   ```

3. **Check service health**

   ```bash
   ./healthcheck.sh
   ```

4. **View resource usage**

   ```bash
   docker stats --no-stream
   docker system df
   ```

5. **Check documentation**

   - [README.md](./README.md)
   - [QUICKSTART.md](./QUICKSTART.md)
   - Trigger.dev docs: https://trigger.dev/docs

6. **Reset everything** (last resort)
   ```bash
   docker-compose down -v
   docker-compose -f cobalt-compose.yml down -v
   docker system prune -a --volumes
   ./setup.sh
   ```

## Prevention

To avoid issues:

1. **Regular backups**

   ```bash
   make backup  # or ./maintenance.sh
   ```

2. **Monitor resources**

   ```bash
   make resources
   ```

3. **Keep services updated**

   ```bash
   make update
   ```

4. **Regular cleanup**

   ```bash
   make clean
   ```

5. **Check health regularly**
   ```bash
   make health
   ```
