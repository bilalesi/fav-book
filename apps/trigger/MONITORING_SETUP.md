# Trigger.dev Monitoring and Observability Setup

This guide covers setting up monitoring, observability, and alerting for the background processing pipeline using Trigger.dev dashboard and application metrics.

## Table of Contents

1. [Trigger.dev Dashboard Configuration](#triggerd-dashboard-configuration)
2. [Application Metrics](#application-metrics)
3. [Alerting Setup](#alerting-setup)
4. [Monitoring Dashboard](#monitoring-dashboard)
5. [Troubleshooting](#troubleshooting)

## Trigger.dev Dashboard Configuration

### Accessing the Dashboard

The Trigger.dev dashboard is available at:

- **Local Development**: http://localhost:8030
- **Production**: Your configured `LOGIN_ORIGIN` URL

### Initial Setup

1. **Login to Dashboard**

   ```bash
   # Check webapp logs for magic link
   cd docker
   docker-compose -f webapp/docker-compose.yml logs -f webapp | grep "Magic link"
   ```

2. **Create Organization and Project**

   - Navigate to http://localhost:8030
   - Click the magic link from logs
   - Create a new organization
   - Create a new project (e.g., "bookmark-enrichment")
   - Note your project reference (e.g., `proj_xxxxxxxxxxxxx`)

3. **Configure API Keys**

   - Go to Project Settings → API Keys
   - Copy the API key
   - Update your application `.env`:
     ```bash
     TRIGGER_API_KEY=tr_dev_xxxxxxxxxxxxx
     TRIGGER_API_URL=http://localhost:8030
     TRIGGER_PROJECT_ID=proj_xxxxxxxxxxxxx
     ```

### Webhook Configuration

Configure webhooks to receive real-time updates about workflow execution:

1. **Navigate to Webhooks**

   - Go to Project Settings → Webhooks
   - Click "Add Webhook"

2. **Configure Webhook Endpoint**

   ```
   URL: https://your-api-domain.com/api/webhooks/trigger
   Events:
     - run.started
     - run.completed
     - run.failed
     - run.crashed
   ```

3. **Implement Webhook Handler** (in your API)

   ```typescript
   // packages/api/src/routers/webhooks.ts
   import { Elysia } from "elysia";

   export const webhooksRouter = new Elysia({ prefix: "/webhooks" }).post(
     "/trigger",
     async ({ body, set }) => {
       const event = body as TriggerWebhookEvent;

       // Verify webhook signature (recommended)
       // const isValid = verifyWebhookSignature(body, headers);

       switch (event.type) {
         case "run.started":
           console.log(`Workflow ${event.run.id} started`);
           break;

         case "run.completed":
           console.log(`Workflow ${event.run.id} completed successfully`);
           // Update metrics
           break;

         case "run.failed":
           console.error(`Workflow ${event.run.id} failed:`, event.run.error);
           // Trigger alert
           break;

         case "run.crashed":
           console.error(`Workflow ${event.run.id} crashed`);
           // Trigger critical alert
           break;
       }

       set.status = 200;
       return { received: true };
     }
   );
   ```

### Workflow Visibility

The dashboard provides visibility into:

- **Active Runs**: Currently executing workflows
- **Run History**: Past workflow executions with status
- **Run Details**: Step-by-step execution logs
- **Performance Metrics**: Duration, retry counts, success rates
- **Error Logs**: Detailed error messages and stack traces

### Testing Workflow Visibility

1. **Create a Test Bookmark**

   ```bash
   curl -X POST http://localhost:3000/api/bookmarks \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "platform": "URL",
       "url": "https://example.com/article",
       "content": "Test article content"
     }'
   ```

2. **Check Dashboard**

   - Navigate to Runs tab
   - You should see the `bookmark-enrichment` workflow
   - Click on the run to see detailed execution logs

3. **Verify Logging**

   - Each workflow step should appear in the timeline
   - Check that logs include bookmark ID and context
   - Verify error handling for failed steps

## Application Metrics

### Prometheus Metrics Implementation

Create a metrics package to track workflow performance:

```typescript
// packages/trigger/src/lib/metrics.ts
import { Counter, Histogram, Gauge, register } from "prom-client";

// Workflow execution counter
export const workflowCounter = new Counter({
  name: "bookmark_enrichment_total",
  help: "Total bookmark enrichment workflows executed",
  labelNames: ["status", "platform"],
});

// Workflow duration histogram
export const workflowDuration = new Histogram({
  name: "bookmark_enrichment_duration_seconds",
  help: "Bookmark enrichment workflow duration in seconds",
  labelNames: ["platform", "status"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1s to 10min
});

// Workflow retry counter
export const workflowRetries = new Counter({
  name: "bookmark_enrichment_retries_total",
  help: "Total number of workflow step retries",
  labelNames: ["step", "error_type"],
});

// Active workflows gauge
export const activeWorkflows = new Gauge({
  name: "bookmark_enrichment_active",
  help: "Number of currently active enrichment workflows",
});

// Step-specific metrics
export const stepDuration = new Histogram({
  name: "bookmark_enrichment_step_duration_seconds",
  help: "Duration of individual workflow steps",
  labelNames: ["step", "status"],
  buckets: [0.5, 1, 2, 5, 10, 30, 60],
});

export const stepCounter = new Counter({
  name: "bookmark_enrichment_step_total",
  help: "Total workflow steps executed",
  labelNames: ["step", "status"],
});

// AI/LLM metrics
export const llmTokensUsed = new Counter({
  name: "bookmark_enrichment_llm_tokens_total",
  help: "Total LLM tokens used for summarization",
  labelNames: ["model"],
});

export const llmRequestDuration = new Histogram({
  name: "bookmark_enrichment_llm_duration_seconds",
  help: "LLM request duration",
  buckets: [1, 2, 5, 10, 20, 30, 60],
});

// Media download metrics
export const mediaDownloadSize = new Histogram({
  name: "bookmark_enrichment_media_size_bytes",
  help: "Size of downloaded media files",
  buckets: [
    1024 * 1024, // 1MB
    10 * 1024 * 1024, // 10MB
    50 * 1024 * 1024, // 50MB
    100 * 1024 * 1024, // 100MB
    500 * 1024 * 1024, // 500MB
  ],
});

export const mediaDownloadDuration = new Histogram({
  name: "bookmark_enrichment_media_download_duration_seconds",
  help: "Media download duration",
  buckets: [5, 10, 30, 60, 120, 300],
});

// Storage metrics
export const storageUploadSize = new Histogram({
  name: "bookmark_enrichment_storage_upload_bytes",
  help: "Size of files uploaded to storage",
  buckets: [
    1024 * 1024,
    10 * 1024 * 1024,
    50 * 1024 * 1024,
    100 * 1024 * 1024,
    500 * 1024 * 1024,
  ],
});

// Error metrics
export const errorCounter = new Counter({
  name: "bookmark_enrichment_errors_total",
  help: "Total errors encountered during enrichment",
  labelNames: ["step", "error_type", "retryable"],
});

/**
 * Get all metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return await register.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.clear();
}
```

### Instrumenting Workflows

Update the workflow to emit metrics:

```typescript
// packages/trigger/src/workflows/bookmark-enrichment.ts
import {
  workflowCounter,
  workflowDuration,
  activeWorkflows,
  stepDuration,
  stepCounter,
  workflowRetries,
  errorCounter,
} from "../lib/metrics";

export const bookmarkEnrichmentWorkflow = task({
  id: "bookmark-enrichment",
  run: async (payload, { ctx }) => {
    const startTime = Date.now();
    activeWorkflows.inc();

    try {
      // Track workflow execution
      workflowCounter.inc({
        status: "started",
        platform: payload.platform,
      });

      // ... workflow steps with metrics ...

      // Success metrics
      const duration = (Date.now() - startTime) / 1000;
      workflowDuration.observe(
        { platform: payload.platform, status: "completed" },
        duration
      );
      workflowCounter.inc({
        status: "completed",
        platform: payload.platform,
      });

      return result;
    } catch (error) {
      // Error metrics
      const duration = (Date.now() - startTime) / 1000;
      workflowDuration.observe(
        { platform: payload.platform, status: "failed" },
        duration
      );
      workflowCounter.inc({
        status: "failed",
        platform: payload.platform,
      });

      throw error;
    } finally {
      activeWorkflows.dec();
    }
  },
});
```

### Metrics Endpoint

Expose metrics via API endpoint:

```typescript
// packages/api/src/routers/metrics.ts
import { Elysia } from "elysia";
import { getMetrics } from "@repo/trigger/lib/metrics";

export const metricsRouter = new Elysia({ prefix: "/metrics" }).get(
  "/",
  async ({ set }) => {
    set.headers["Content-Type"] = "text/plain; version=0.0.4";
    return await getMetrics();
  }
);
```

### Tracking Success/Failure Rates

```typescript
// packages/trigger/src/lib/metrics-tracker.ts
export class MetricsTracker {
  private successCount = 0;
  private failureCount = 0;
  private totalCount = 0;

  recordSuccess(platform: string): void {
    this.successCount++;
    this.totalCount++;
    workflowCounter.inc({ status: "success", platform });
  }

  recordFailure(platform: string, errorType: string): void {
    this.failureCount++;
    this.totalCount++;
    workflowCounter.inc({ status: "failure", platform });
    errorCounter.inc({ error_type: errorType });
  }

  getSuccessRate(): number {
    return this.totalCount > 0 ? this.successCount / this.totalCount : 0;
  }

  getFailureRate(): number {
    return this.totalCount > 0 ? this.failureCount / this.totalCount : 0;
  }

  reset(): void {
    this.successCount = 0;
    this.failureCount = 0;
    this.totalCount = 0;
  }
}

export const metricsTracker = new MetricsTracker();
```

### Tracking Processing Duration

```typescript
// Helper to track step duration
export async function trackStepDuration<T>(
  stepName: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = (Date.now() - startTime) / 1000;

    stepDuration.observe({ step: stepName, status: "success" }, duration);
    stepCounter.inc({ step: stepName, status: "success" });

    return result;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;

    stepDuration.observe({ step: stepName, status: "failure" }, duration);
    stepCounter.inc({ step: stepName, status: "failure" });

    throw error;
  }
}
```

### Tracking Retry Counts

```typescript
// Track retries in workflow
export function trackRetry(step: string, errorType: string): void {
  workflowRetries.inc({ step, error_type: errorType });
}
```

## Alerting Setup

### Alert Configuration

Create alert rules for critical conditions:

```typescript
// packages/trigger/src/lib/alerting.ts
import { metricsTracker } from "./metrics-tracker";

export interface AlertRule {
  name: string;
  condition: () => boolean;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  cooldown: number; // minutes
}

export const alertRules: AlertRule[] = [
  {
    name: "high_failure_rate",
    condition: () => metricsTracker.getFailureRate() > 0.1, // >10%
    severity: "high",
    message:
      "Workflow failure rate exceeded 10% threshold in the last 5 minutes",
    cooldown: 5,
  },
  {
    name: "service_unavailable",
    condition: async () => {
      try {
        // Check if Trigger.dev is reachable
        const response = await fetch(
          `${process.env.TRIGGER_API_URL}/api/v1/health`
        );
        return !response.ok;
      } catch {
        return true;
      }
    },
    severity: "critical",
    message: "Trigger.dev service is unavailable",
    cooldown: 1,
  },
  {
    name: "storage_quota_warning",
    condition: async () => {
      // Check S3 storage usage
      const usage = await getStorageUsage();
      return usage > 0.8; // >80%
    },
    severity: "medium",
    message: "Storage quota exceeded 80% threshold",
    cooldown: 60,
  },
];

// Alert delivery
export async function sendAlert(rule: AlertRule): Promise<void> {
  console.error(`[ALERT ${rule.severity.toUpperCase()}] ${rule.message}`);

  // Send to multiple channels
  await Promise.all([
    sendEmailAlert(rule),
    sendSlackAlert(rule),
    logAlert(rule),
  ]);
}

async function sendEmailAlert(rule: AlertRule): Promise<void> {
  // Implement email alerting
  // Use Resend or SMTP
}

async function sendSlackAlert(rule: AlertRule): Promise<void> {
  if (!process.env.SLACK_WEBHOOK_URL) return;

  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `🚨 ${rule.severity.toUpperCase()} Alert`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${rule.name}*\n${rule.message}`,
          },
        },
      ],
    }),
  });
}

async function logAlert(rule: AlertRule): Promise<void> {
  // Log to database for audit trail
  await prisma.alertLog.create({
    data: {
      name: rule.name,
      severity: rule.severity,
      message: rule.message,
      triggeredAt: new Date(),
    },
  });
}
```

### Alert Monitoring Loop

```typescript
// packages/trigger/src/lib/alert-monitor.ts
import { alertRules, sendAlert } from "./alerting";

const alertCooldowns = new Map<string, number>();

export async function startAlertMonitoring(): Promise<void> {
  // Check alerts every minute
  setInterval(async () => {
    for (const rule of alertRules) {
      try {
        // Check cooldown
        const lastAlert = alertCooldowns.get(rule.name) || 0;
        const cooldownExpired =
          Date.now() - lastAlert > rule.cooldown * 60 * 1000;

        if (!cooldownExpired) continue;

        // Evaluate condition
        const shouldAlert =
          typeof rule.condition === "function"
            ? await rule.condition()
            : rule.condition;

        if (shouldAlert) {
          await sendAlert(rule);
          alertCooldowns.set(rule.name, Date.now());
        }
      } catch (error) {
        console.error(`Error checking alert rule ${rule.name}:`, error);
      }
    }
  }, 60 * 1000); // Every minute
}
```

### Test Alert Delivery

```typescript
// Test script
async function testAlerts() {
  const testRule: AlertRule = {
    name: "test_alert",
    condition: () => true,
    severity: "low",
    message: "This is a test alert",
    cooldown: 0,
  };

  await sendAlert(testRule);
  console.log("Test alert sent successfully");
}
```

## Monitoring Dashboard

### Dashboard Components

Create a monitoring dashboard that displays:

1. **Workflow Metrics**

   - Total workflows executed (today, this week, this month)
   - Success rate percentage
   - Average processing time
   - Active workflows count

2. **Performance Metrics**

   - P50, P95, P99 latencies
   - Throughput (workflows/minute)
   - Queue depth

3. **Error Metrics**

   - Error rate over time
   - Top error types
   - Failed workflows list

4. **Resource Metrics**
   - LLM token usage
   - Media download volume
   - Storage usage

### Dashboard API Endpoints

```typescript
// packages/api/src/routers/monitoring.ts
import { Elysia } from "elysia";
import { prisma } from "@repo/db";

export const monitoringRouter = new Elysia({ prefix: "/monitoring" })
  .get("/dashboard", async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get workflow statistics
    const [todayStats, weekStats, activeCount] = await Promise.all([
      getWorkflowStats(oneDayAgo, now),
      getWorkflowStats(oneWeekAgo, now),
      getActiveWorkflowCount(),
    ]);

    return {
      today: todayStats,
      week: weekStats,
      active: activeCount,
    };
  })
  .get("/performance", async () => {
    // Get performance metrics from database
    const metrics = await prisma.bookmarkPost.aggregate({
      where: {
        enrichedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _avg: {
        // Add processing duration field if available
      },
      _count: true,
    });

    return metrics;
  })
  .get("/errors", async ({ query }) => {
    const limit = parseInt(query.limit || "50");

    const errors = await prisma.bookmarkPost.findMany({
      where: {
        processingStatus: "FAILED",
      },
      select: {
        id: true,
        postUrl: true,
        errorMessage: true,
        savedAt: true,
        platform: true,
      },
      orderBy: {
        savedAt: "desc",
      },
      take: limit,
    });

    return errors;
  })
  .get("/queue", async () => {
    const queueDepth = await prisma.bookmarkPost.count({
      where: {
        processingStatus: {
          in: ["PENDING", "PROCESSING"],
        },
      },
    });

    return { queueDepth };
  });

async function getWorkflowStats(from: Date, to: Date) {
  const [total, completed, failed, partialSuccess] = await Promise.all([
    prisma.bookmarkPost.count({
      where: { savedAt: { gte: from, lte: to } },
    }),
    prisma.bookmarkPost.count({
      where: {
        savedAt: { gte: from, lte: to },
        processingStatus: "COMPLETED",
      },
    }),
    prisma.bookmarkPost.count({
      where: {
        savedAt: { gte: from, lte: to },
        processingStatus: "FAILED",
      },
    }),
    prisma.bookmarkPost.count({
      where: {
        savedAt: { gte: from, lte: to },
        processingStatus: "PARTIAL_SUCCESS",
      },
    }),
  ]);

  const successRate = total > 0 ? (completed / total) * 100 : 0;

  return {
    total,
    completed,
    failed,
    partialSuccess,
    successRate,
  };
}

async function getActiveWorkflowCount() {
  return await prisma.bookmarkPost.count({
    where: {
      processingStatus: "PROCESSING",
    },
  });
}
```

### Frontend Dashboard Component

```typescript
// apps/web/src/routes/monitoring.tsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function MonitoringDashboard() {
  const { data: dashboard } = useQuery({
    queryKey: ["monitoring", "dashboard"],
    queryFn: () => api.monitoring.dashboard.get(),
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: errors } = useQuery({
    queryKey: ["monitoring", "errors"],
    queryFn: () => api.monitoring.errors.get(),
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Workflows"
          value={dashboard?.today.total || 0}
          subtitle={`${dashboard?.today.successRate.toFixed(1)}% success`}
        />
        <MetricCard
          title="Active Workflows"
          value={dashboard?.active || 0}
          subtitle="Currently processing"
        />
        <MetricCard
          title="Failed Today"
          value={dashboard?.today.failed || 0}
          subtitle="Requires attention"
          variant="error"
        />
        <MetricCard
          title="Week Total"
          value={dashboard?.week.total || 0}
          subtitle={`${dashboard?.week.successRate.toFixed(1)}% success`}
        />
      </div>

      {/* Error List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Errors</h2>
        <div className="space-y-2">
          {errors?.map((error) => (
            <div key={error.id} className="border-l-4 border-red-500 pl-4 py-2">
              <div className="font-medium">{error.postUrl}</div>
              <div className="text-sm text-gray-600">{error.errorMessage}</div>
              <div className="text-xs text-gray-400">
                {new Date(error.savedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Troubleshooting

### Metrics Not Appearing

1. Check metrics endpoint is accessible:
   ```bash
   curl http://localhost:3000/api/metrics
   ```
2. Verify Prometheus client is installed:
   ```bash
   cd packages/trigger
   bun install prom-client
   ```
3. Check workflow is emitting metrics

### Alerts Not Firing

1. Verify alert monitoring loop is running
2. Check alert conditions are being evaluated
3. Verify notification channels (email, Slack) are configured
4. Check alert cooldown periods

### Dashboard Not Loading

1. Check API endpoints are accessible
2. Verify database queries are working
3. Check browser console for errors
4. Verify authentication tokens

### High Memory Usage

1. Check for memory leaks in metrics collection
2. Verify metrics are being reset appropriately
3. Consider using metric aggregation
4. Monitor Prometheus scrape interval

## Next Steps

1. Set up Grafana for advanced visualization
2. Configure Prometheus for metric scraping
3. Implement custom alert rules
4. Add more detailed performance metrics
5. Set up log aggregation (ELK, Datadog)

## Resources

- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Prometheus Client Documentation](https://github.com/siimon/prom-client)
- [Grafana Documentation](https://grafana.com/docs/)
