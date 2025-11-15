# Monitoring and Observability Guide

## Overview

This guide covers monitoring, logging, and observability for the Social Bookmarks Manager in production.

## Application Monitoring

### Health Checks

The API provides health check endpoints:

- `GET /health` - Detailed health status with uptime
- `GET /` - Basic status check

Example health check response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "environment": "production"
}
```

### Uptime Monitoring

Recommended services:

- **UptimeRobot** (Free tier available)
- **Pingdom**
- **StatusCake**

Configuration:

- Monitor: `https://api.yourdomain.com/health`
- Interval: 5 minutes
- Alert on: HTTP status != 200
- Notification: Email, Slack, SMS

### Performance Monitoring

Key metrics to track:

- Response time (target: < 500ms p95)
- Error rate (target: < 1%)
- Request throughput
- Database query performance

## Database Monitoring (Neon)

### Built-in Metrics

Access via Neon Console:

- Query performance and slow queries
- Connection pool usage
- Storage usage and growth
- Active connections
- Cache hit ratio

### Alerts to Configure

1. **High Connection Count**

   - Threshold: > 80% of max connections
   - Action: Scale connection pool or investigate leaks

2. **Storage Usage**

   - Threshold: > 80% of allocated storage
   - Action: Archive old data or upgrade plan

3. **Slow Queries**

   - Threshold: Queries > 1 second
   - Action: Add indexes or optimize queries

4. **Failed Connections**
   - Threshold: > 5 failures in 5 minutes
   - Action: Check network or database status

## Logging

### Application Logs

The server logs to stdout/stderr. Capture with:

**PM2 Logs**

```bash
# View logs
pm2 logs social-bookmarks-api

# Save logs to file
pm2 logs social-bookmarks-api --out /var/log/app/out.log --error /var/log/app/error.log
```

**Docker Logs**

```bash
# View logs
docker logs social-bookmarks-api

# Follow logs
docker logs -f social-bookmarks-api

# Save logs
docker logs social-bookmarks-api > /var/log/app.log 2>&1
```

### Log Levels

- `ERROR`: Critical errors requiring immediate attention
- `WARN`: Warning conditions
- `INFO`: Informational messages (default)
- `DEBUG`: Detailed debugging information

Set log level via environment variable:

```bash
LOG_LEVEL=info
```

### Structured Logging

Logs include context:

- Timestamp
- Log level
- User ID (if authenticated)
- Request path
- Error code
- Stack trace (in development)

### Log Aggregation

For production, consider:

- **Papertrail** - Simple log aggregation
- **Logtail** - Modern log management
- **Datadog** - Full observability platform
- **ELK Stack** - Self-hosted solution

## Error Tracking

### Recommended Services

**Sentry** (Recommended)

- Real-time error tracking
- Stack traces and context
- Release tracking
- Performance monitoring

Integration example:

```typescript
import * as Sentry from "@sentry/bun";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**Alternatives**

- Rollbar
- Bugsnag
- Airbrake

## Metrics and Analytics

### Application Metrics

Track with custom metrics:

- Bookmarks created per day
- Active users
- Search queries performed
- API endpoint usage
- Authentication success/failure rate

### Database Metrics

Monitor via Neon Console:

- Total bookmarks count
- Database size growth
- Query performance trends
- Connection pool efficiency

### Frontend Metrics

Use Web Vitals:

- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

Already integrated in `apps/web` via `web-vitals` package.

## Alerting

### Critical Alerts

Configure alerts for:

1. **API Down**

   - Condition: Health check fails
   - Severity: Critical
   - Response: Immediate investigation

2. **High Error Rate**

   - Condition: > 5% error rate for 5 minutes
   - Severity: High
   - Response: Check logs and recent deployments

3. **Database Connection Failures**

   - Condition: Cannot connect to database
   - Severity: Critical
   - Response: Check Neon status and connection string

4. **High Response Time**

   - Condition: p95 > 2 seconds for 10 minutes
   - Severity: Medium
   - Response: Investigate slow queries or scaling

5. **Disk Space**
   - Condition: > 90% disk usage
   - Severity: High
   - Response: Clean up logs or scale storage

### Alert Channels

Configure notifications via:

- Email
- Slack
- PagerDuty (for on-call)
- SMS (for critical alerts)

## Dashboard

### Recommended Tools

**Grafana** (Self-hosted)

- Visualize metrics from multiple sources
- Custom dashboards
- Alerting rules

**Datadog** (SaaS)

- All-in-one monitoring
- APM and infrastructure monitoring
- Log aggregation

**New Relic** (SaaS)

- Application performance monitoring
- Real user monitoring
- Synthetic monitoring

### Key Metrics Dashboard

Create a dashboard with:

- API response time (p50, p95, p99)
- Request rate (requests/minute)
- Error rate (%)
- Active users
- Database query performance
- System resources (CPU, memory)

## Performance Optimization

### Monitoring Performance

Track these metrics:

- API endpoint response times
- Database query execution times
- Cache hit rates
- Frontend page load times

### Optimization Triggers

Investigate when:

- Response time > 1 second
- Database queries > 500ms
- Error rate > 1%
- Memory usage > 80%

## Incident Response

### Response Procedure

1. **Detect**: Alert triggered
2. **Assess**: Check logs and metrics
3. **Mitigate**: Apply quick fix or rollback
4. **Resolve**: Implement permanent fix
5. **Review**: Post-mortem and prevention

### Runbook

Keep a runbook with:

- Common issues and solutions
- Rollback procedures
- Contact information
- Escalation paths

## Backup and Recovery

### Database Backups

Neon provides:

- Automatic continuous backups
- Point-in-time recovery (PITR)
- Retention: 7-30 days depending on plan

### Recovery Testing

Regularly test:

- Database restore from backup
- Application recovery from failure
- Rollback procedures

### Backup Verification

Monthly checklist:

- [ ] Verify backups are running
- [ ] Test restore procedure
- [ ] Document recovery time
- [ ] Update runbook if needed

## Security Monitoring

### Monitor for:

- Failed authentication attempts
- Unusual API usage patterns
- Database access anomalies
- Suspicious user behavior

### Security Alerts

Configure alerts for:

- Multiple failed login attempts
- Unauthorized access attempts
- Unusual data access patterns
- Configuration changes

## Cost Monitoring

### Track Costs

Monitor spending on:

- Neon database (storage, compute)
- Cloudflare Pages (bandwidth)
- Server hosting
- Third-party services (Resend, monitoring)

### Cost Optimization

Review monthly:

- Database storage usage
- API request volume
- Unused resources
- Service plan optimization

## Maintenance Windows

### Scheduled Maintenance

Plan for:

- Database maintenance (Neon handles automatically)
- Application updates
- Security patches
- Performance optimizations

### Communication

Notify users:

- 24 hours before maintenance
- During maintenance window
- After completion

## Resources

- [Neon Monitoring Docs](https://neon.tech/docs/introduction/monitoring)
- [Cloudflare Analytics](https://developers.cloudflare.com/analytics/)
- [PM2 Monitoring](https://pm2.keymetrics.io/docs/usage/monitoring/)
- [Sentry Documentation](https://docs.sentry.io/)
