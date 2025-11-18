# Monitoring Quick Start Guide

Quick reference for using the monitoring and observability features.

## Quick Access

- **Dashboard**: http://localhost:3000/monitoring
- **Metrics**: http://localhost:3000/api/monitoring/metrics
- **Trigger.dev**: http://localhost:8030

## Common Tasks

### View System Health

```bash
curl http://localhost:3000/api/monitoring/health | jq
```

### Check Queue Depth

```bash
curl http://localhost:3000/api/monitoring/queue | jq
```

### View Recent Errors

```bash
curl http://localhost:3000/api/monitoring/errors?limit=10 | jq
```

### Test Alerts

```bash
curl -X POST http://localhost:3000/api/monitoring/alerts/test
```

### Get Dashboard Stats

```bash
curl http://localhost:3000/api/monitoring/dashboard | jq
```

## Alert Configuration

### Slack Webhook

Add to `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Email Alerts

Add to `.env`:

```bash
ALERT_EMAIL=admin@example.com
```

## Metrics Endpoints

| Endpoint                       | Description             | Format |
| ------------------------------ | ----------------------- | ------ |
| `/api/monitoring/metrics`      | Prometheus metrics      | Text   |
| `/api/monitoring/metrics/json` | Metrics as JSON         | JSON   |
| `/api/monitoring/dashboard`    | Dashboard stats         | JSON   |
| `/api/monitoring/performance`  | Performance by platform | JSON   |
| `/api/monitoring/errors`       | Recent errors           | JSON   |
| `/api/monitoring/queue`        | Queue depth             | JSON   |
| `/api/monitoring/storage`      | Storage usage           | JSON   |
| `/api/monitoring/health`       | System health           | JSON   |

## Key Metrics

### Workflow Metrics

- `bookmark_enrichment_total` - Total workflows
- `bookmark_enrichment_duration_seconds` - Duration
- `bookmark_enrichment_active` - Active count
- `bookmark_enrichment_retries_total` - Retries

### Error Metrics

- `bookmark_enrichment_errors_total` - Total errors

### Performance Metrics

- `bookmark_enrichment_step_duration_seconds` - Step timing
- `bookmark_enrichment_llm_duration_seconds` - AI timing
- `bookmark_enrichment_media_download_duration_seconds` - Download timing

## Alert Rules

| Alert               | Condition                 | Severity | Cooldown |
| ------------------- | ------------------------- | -------- | -------- |
| High Failure Rate   | >10% failures in 5min     | High     | 5min     |
| Service Unavailable | Trigger.dev down          | Critical | 1min     |
| Storage Quota       | >80% storage used         | Medium   | 60min    |
| High Error Count    | >50 failures in 1hr       | High     | 15min    |
| LM Studio Down      | AI service unavailable    | High     | 5min     |
| Cobalt Down         | Media service unavailable | Medium   | 5min     |

## Dashboard Panels

### System Health

- Trigger.dev status
- LM Studio status
- Cobalt API status
- Storage status
- Database status

### Key Metrics

- Today's workflows
- Active workflows
- Queue depth
- Failed workflows

### Statistics

- Completion rates (today, week)
- Status distribution
- Platform breakdown

### Storage

- Total usage
- Usage percentage
- Files by type

## Troubleshooting

### No Metrics Showing

```bash
# Check metrics endpoint
curl http://localhost:3000/api/monitoring/metrics

# Verify prom-client installed
cd packages/trigger && bun list | grep prom-client
```

### Alerts Not Working

```bash
# Test alert delivery
curl -X POST http://localhost:3000/api/monitoring/alerts/test

# Check environment variables
echo $SLACK_WEBHOOK_URL
echo $ALERT_EMAIL
```

### Dashboard Not Loading

```bash
# Check API is running
curl http://localhost:3000/api/monitoring/health

# Check browser console for errors
# Open DevTools → Console
```

## Integration Examples

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "bookmark-enrichment"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/api/monitoring/metrics"
    scrape_interval: 30s
```

### Grafana

1. Add Prometheus data source
2. Import dashboard JSON
3. Configure panels:
   - Success rate graph
   - Active workflows gauge
   - Error rate graph
   - Queue depth graph

### Custom Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Check system health

HEALTH=$(curl -s http://localhost:3000/api/monitoring/health)
HEALTHY=$(echo $HEALTH | jq -r '.healthy')

if [ "$HEALTHY" != "true" ]; then
  echo "⚠️  System unhealthy!"
  echo $HEALTH | jq '.services'
  exit 1
fi

echo "✓ System healthy"
```

## Best Practices

1. **Check dashboard daily** - Review trends and errors
2. **Set up alerts** - Configure Slack/email notifications
3. **Monitor storage** - Keep usage below 80%
4. **Review errors** - Investigate failed workflows
5. **Track performance** - Use metrics to optimize
6. **Plan capacity** - Monitor queue depth for scaling

## Support

For detailed documentation, see:

- `MONITORING_SETUP.md` - Complete setup guide
- `MONITORING_IMPLEMENTATION.md` - Implementation details
- `MONITORING.md` - General monitoring guide
