# Monitoring and Observability Implementation

This document summarizes the monitoring and observability features implemented for the background processing pipeline.

## Overview

A comprehensive monitoring system has been implemented to track workflow execution, system health, and performance metrics for the bookmark enrichment pipeline.

## Components Implemented

### 1. Trigger.dev Dashboard Configuration

**Location**: `apps/trigger/MONITORING_SETUP.md`

- Complete setup guide for Trigger.dev dashboard
- Webhook configuration for real-time workflow updates
- Instructions for testing workflow visibility
- Dashboard access and navigation guide

**Key Features**:

- Real-time workflow execution tracking
- Step-by-step execution logs
- Error tracking with stack traces
- Performance metrics visualization

### 2. Application Metrics (Prometheus)

**Location**: `packages/trigger/src/lib/metrics.ts`

Implemented comprehensive Prometheus metrics:

- **Workflow Metrics**:

  - `bookmark_enrichment_total` - Total workflows executed (by status, platform)
  - `bookmark_enrichment_duration_seconds` - Workflow duration histogram
  - `bookmark_enrichment_active` - Active workflows gauge
  - `bookmark_enrichment_retries_total` - Retry counter

- **Step Metrics**:

  - `bookmark_enrichment_step_duration_seconds` - Individual step durations
  - `bookmark_enrichment_step_total` - Step execution counter

- **AI/LLM Metrics**:

  - `bookmark_enrichment_llm_tokens_total` - Token usage tracking
  - `bookmark_enrichment_llm_duration_seconds` - LLM request duration

- **Media Metrics**:

  - `bookmark_enrichment_media_size_bytes` - Downloaded media file sizes
  - `bookmark_enrichment_media_download_duration_seconds` - Download duration

- **Storage Metrics**:

  - `bookmark_enrichment_storage_upload_bytes` - Upload sizes

- **Error Metrics**:
  - `bookmark_enrichment_errors_total` - Error counter (by step, type, retryable)

**Helper Functions**:

- `trackStepDuration()` - Automatic step timing
- `trackRetry()` - Retry tracking
- `trackError()` - Error classification and tracking

### 3. Metrics Tracker

**Location**: `packages/trigger/src/lib/metrics-tracker.ts`

Tracks success/failure rates over time windows:

- Configurable time windows (default: 5 minutes)
- Success rate calculation
- Failure rate calculation
- Automatic window reset
- Statistics export

### 4. Alerting System

**Location**: `packages/trigger/src/lib/alerting.ts`

Implemented alert rules for critical conditions:

- **High Failure Rate**: >10% failures in 5 minutes
- **Service Unavailable**: Trigger.dev not responding
- **Storage Quota Warning**: >80% storage used
- **High Error Count**: >50 failures in 1 hour
- **LM Studio Unavailable**: AI service down
- **Cobalt API Unavailable**: Media download service down

**Alert Delivery Channels**:

- Console logging
- Email alerts (configurable)
- Slack webhooks
- Database audit log

**Features**:

- Configurable cooldown periods
- Alert severity levels (critical, high, medium, low)
- Automatic alert evaluation loop
- Test alert functionality

### 5. Monitoring API

**Location**: `packages/api/src/routers/monitoring.ts`

Comprehensive monitoring endpoints:

- `GET /monitoring/metrics` - Prometheus metrics (text format)
- `GET /monitoring/metrics/json` - Metrics as JSON
- `GET /monitoring/dashboard` - Dashboard statistics
- `GET /monitoring/performance` - Performance metrics by platform
- `GET /monitoring/errors` - Recent error list
- `GET /monitoring/queue` - Queue depth and backlog
- `GET /monitoring/storage` - Storage usage statistics
- `GET /monitoring/timeline` - Workflow timeline data
- `GET /monitoring/health` - System health checks
- `POST /monitoring/alerts/test` - Test alert delivery
- `POST /monitoring/alerts/evaluate` - Manual alert evaluation

**Dashboard Statistics**:

- Today's workflow counts and success rate
- Week's workflow counts and success rate
- Month's workflow counts
- Active workflow count
- Queue depth (pending + processing)
- Current window statistics

**Health Checks**:

- Trigger.dev service
- LM Studio (AI)
- Cobalt API (media downloads)
- Storage (S3/MinIO)
- Database (PostgreSQL)

### 6. Monitoring Dashboard UI

**Location**: `apps/web/src/routes/monitoring.tsx`

Interactive monitoring dashboard with:

**System Health Panel**:

- Real-time health indicators for all services
- Visual status (healthy/unhealthy)

**Key Metrics Cards**:

- Today's workflows with success rate
- Active workflows count
- Queue depth with pending/processing breakdown
- Failed workflows count

**Workflow Statistics**:

- Today's completion breakdown (completed, failed, partial success)
- Week's completion breakdown
- Visual progress bars

**Storage Usage**:

- Total usage vs. limit
- Usage percentage with color coding
- Breakdown by media type

**Recent Errors**:

- Last 10 failed workflows
- Error messages and timestamps
- Platform badges
- Quick links to bookmark details

**Performance by Platform**:

- Workflow counts per platform (Twitter, LinkedIn, URL)

**Features**:

- Auto-refresh every 30 seconds
- Manual refresh button
- Responsive grid layout
- Color-coded status indicators

### 7. Navigation Integration

**Location**: `apps/web/src/components/sidebar.tsx`

Added monitoring link to sidebar navigation with Activity icon.

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Alert Configuration
ALERT_EMAIL=admin@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Storage Limits
MAX_STORAGE_GB=100
```

### Prometheus Scraping

To scrape metrics with Prometheus, add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: "bookmark-enrichment"
    static_configs:
      - targets: ["localhost:3000"]
    metrics_path: "/api/monitoring/metrics"
    scrape_interval: 30s
```

### Grafana Dashboard

Import the metrics into Grafana for advanced visualization:

1. Add Prometheus as data source
2. Create dashboard with panels for:
   - Workflow success rate over time
   - Active workflows gauge
   - Error rate over time
   - Processing duration histogram
   - Queue depth over time

## Usage

### Accessing the Dashboard

Navigate to `/monitoring` in the web application to view the monitoring dashboard.

### Testing Alerts

```bash
# Test alert delivery
curl -X POST http://localhost:3000/api/monitoring/alerts/test

# Manually trigger alert evaluation
curl -X POST http://localhost:3000/api/monitoring/alerts/evaluate
```

### Viewing Metrics

```bash
# Get Prometheus metrics
curl http://localhost:3000/api/monitoring/metrics

# Get metrics as JSON
curl http://localhost:3000/api/monitoring/metrics/json

# Get dashboard data
curl http://localhost:3000/api/monitoring/dashboard
```

### Starting Alert Monitoring

The alert monitoring loop can be started in your application:

```typescript
import { startAlertMonitoring } from "@my-better-t-app/trigger/lib/alerting";

// Start monitoring (checks every minute)
const interval = startAlertMonitoring(1);

// Stop monitoring when needed
stopAlertMonitoring(interval);
```

## Monitoring Best Practices

1. **Set Up Alerts**: Configure Slack/email alerts for critical issues
2. **Regular Review**: Check dashboard daily for trends
3. **Storage Management**: Monitor storage usage and set up cleanup policies
4. **Performance Tuning**: Use metrics to identify bottlenecks
5. **Error Analysis**: Review failed workflows and improve error handling
6. **Capacity Planning**: Track queue depth to plan for scaling

## Troubleshooting

### Metrics Not Appearing

1. Check that `prom-client` is installed: `bun install prom-client`
2. Verify metrics endpoint is accessible: `curl http://localhost:3000/api/monitoring/metrics`
3. Check that workflows are emitting metrics

### Alerts Not Firing

1. Verify alert monitoring loop is running
2. Check alert conditions are being evaluated
3. Verify notification channels (email, Slack) are configured
4. Check alert cooldown periods haven't been triggered

### Dashboard Not Loading

1. Check API endpoints are accessible
2. Verify database queries are working
3. Check browser console for errors
4. Verify authentication tokens

## Next Steps

1. **Grafana Integration**: Set up Grafana for advanced visualization
2. **Custom Alerts**: Add more alert rules based on your needs
3. **Log Aggregation**: Integrate with ELK stack or Datadog
4. **Performance Optimization**: Use metrics to identify and fix bottlenecks
5. **Capacity Planning**: Use historical data to plan infrastructure scaling

## Files Created/Modified

### New Files

- `apps/trigger/MONITORING_SETUP.md` - Complete monitoring setup guide
- `packages/trigger/src/lib/metrics.ts` - Prometheus metrics
- `packages/trigger/src/lib/metrics-tracker.ts` - Success/failure rate tracker
- `packages/trigger/src/lib/alerting.ts` - Alert system
- `packages/api/src/routers/monitoring.ts` - Monitoring API endpoints
- `apps/web/src/routes/monitoring.tsx` - Monitoring dashboard UI

### Modified Files

- `packages/trigger/package.json` - Added prom-client dependency
- `packages/trigger/src/index.ts` - Exported monitoring modules
- `packages/api/src/routers/index.ts` - Added monitoring router
- `apps/web/src/components/sidebar.tsx` - Added monitoring link

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 7.1**: Structured logs for each workflow step ✓
- **Requirement 7.2**: Workflow execution traces through Trigger.dev dashboard ✓
- **Requirement 7.3**: Processing status tracking for UI display ✓
- **Requirement 7.4**: Metrics for success rate, processing time, retry counts ✓
- **Requirement 7.5**: Alerts for high failure rates (>10% over 5 minutes) ✓

## Conclusion

The monitoring and observability system provides comprehensive visibility into the background processing pipeline, enabling proactive issue detection, performance optimization, and capacity planning. The system is production-ready and follows industry best practices for observability.
