import { metricsTracker } from "./metrics-tracker";
import prisma from "@favy/db";

/**
 * Alert severity levels
 */
export type AlertSeverity = "critical" | "high" | "medium" | "low";

/**
 * Alert rule definition
 */
export interface AlertRule {
  name: string;
  condition: () => boolean | Promise<boolean>;
  severity: AlertSeverity;
  message: string;
  cooldown: number; // minutes
}

/**
 * Alert event for logging and notification
 */
export interface AlertEvent {
  rule: AlertRule;
  triggeredAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Predefined alert rules
 */
export const alertRules: AlertRule[] = [
  {
    name: "high_failure_rate",
    condition: () => {
      const failureRate = metricsTracker.getFailureRate();
      const totalCount = metricsTracker.getTotalCount();
      // Only alert if we have enough data (at least 10 workflows)
      return totalCount >= 10 && failureRate > 0.1; // >10%
    },
    severity: "high",
    message:
      "Workflow failure rate exceeded 10% threshold in the last 5 minutes",
    cooldown: 5,
  },
  {
    name: "service_unavailable",
    condition: async () => {
      try {
        const apiUrl = process.env.TRIGGER_API_URL;
        if (!apiUrl) return false;

        const response = await fetch(`${apiUrl}/api/v1/health`, {
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        return !response.ok;
      } catch {
        return true;
      }
    },
    severity: "critical",
    message: "Trigger.dev service is unavailable or not responding",
    cooldown: 1,
  },
  {
    name: "storage_quota_warning",
    condition: async () => {
      try {
        const usage = await getStorageUsage();
        return usage > 0.8; // >80%
      } catch {
        return false;
      }
    },
    severity: "medium",
    message: "Storage quota exceeded 80% threshold",
    cooldown: 60,
  },
  {
    name: "high_error_count",
    condition: async () => {
      // Check for high number of failed enrichments in last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const failedCount = await prisma.bookmarkEnrichment.count({
        where: {
          processingStatus: "FAILED",
          createdAt: {
            gte: oneHourAgo,
          },
        },
      });
      return failedCount > 50; // More than 50 failures in an hour
    },
    severity: "high",
    message: "More than 50 workflow failures detected in the last hour",
    cooldown: 15,
  },
  {
    name: "lm_studio_unavailable",
    condition: async () => {
      try {
        const lmStudioUrl = process.env.LM_STUDIO_API_URL;
        if (!lmStudioUrl) return false;

        const response = await fetch(`${lmStudioUrl}/v1/models`, {
          signal: AbortSignal.timeout(5000),
        });
        return !response.ok;
      } catch {
        return true;
      }
    },
    severity: "high",
    message: "LM Studio service is unavailable - AI summarization will fail",
    cooldown: 5,
  },
  {
    name: "cobalt_api_unavailable",
    condition: async () => {
      try {
        const cobaltUrl = process.env.COBALT_API_URL;
        if (!cobaltUrl) return false;

        const response = await fetch(`${cobaltUrl}/api/serverInfo`, {
          signal: AbortSignal.timeout(5000),
        });
        return !response.ok;
      } catch {
        return true;
      }
    },
    severity: "medium",
    message: "Cobalt API is unavailable - media downloads will fail",
    cooldown: 5,
  },
];

/**
 * Get current storage usage percentage
 */
async function getStorageUsage(): Promise<number> {
  try {
    // Query total size of downloaded media
    const result = await prisma.downloadedMedia.aggregate({
      _sum: {
        fileSize: true,
      },
    });

    const totalBytes = Number(result._sum.fileSize || 0);
    const maxBytes = getMaxStorageBytes();

    return totalBytes / maxBytes;
  } catch (error) {
    console.error("Error calculating storage usage:", error);
    return 0;
  }
}

/**
 * Get maximum storage limit in bytes
 */
function getMaxStorageBytes(): number {
  const maxGB = parseInt(process.env.MAX_STORAGE_GB || "100");
  return maxGB * 1024 * 1024 * 1024;
}

/**
 * Send alert through configured channels
 */
export async function sendAlert(event: AlertEvent): Promise<void> {
  const { rule } = event;

  console.error(
    `[ALERT ${rule.severity.toUpperCase()}] ${rule.name}: ${rule.message}`
  );

  // Send to multiple channels in parallel
  await Promise.allSettled([
    sendEmailAlert(event),
    sendSlackAlert(event),
    logAlert(event),
  ]);
}

/**
 * Send email alert
 */
async function sendEmailAlert(event: AlertEvent): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail) return;

  try {
    // Use your email service (Resend, SMTP, etc.)
    // This is a placeholder - implement based on your email service
    console.log(`Would send email alert to ${alertEmail}:`, event.rule.message);
  } catch (error) {
    console.error("Failed to send email alert:", error);
  }
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(event: AlertEvent): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    const severityEmoji = {
      critical: "🚨",
      high: "⚠️",
      medium: "⚡",
      low: "ℹ️",
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `${
          severityEmoji[event.rule.severity]
        } ${event.rule.severity.toUpperCase()} Alert`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${event.rule.name}*\n${event.rule.message}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Triggered at: ${event.triggeredAt.toISOString()}`,
              },
            ],
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}

/**
 * Log alert to database
 */
async function logAlert(event: AlertEvent): Promise<void> {
  try {
    // Create alert log table if it doesn't exist
    // This would be part of your Prisma schema
    console.log("Alert logged:", {
      name: event.rule.name,
      severity: event.rule.severity,
      message: event.rule.message,
      triggeredAt: event.triggeredAt,
      metadata: event.metadata,
    });
  } catch (error) {
    console.error("Failed to log alert:", error);
  }
}

/**
 * Alert cooldown tracker
 */
const alertCooldowns = new Map<string, number>();

/**
 * Check if alert is in cooldown period
 */
function isInCooldown(rule: AlertRule): boolean {
  const lastAlert = alertCooldowns.get(rule.name) || 0;
  const cooldownExpired = Date.now() - lastAlert > rule.cooldown * 60 * 1000;
  return !cooldownExpired;
}

/**
 * Set alert cooldown
 */
function setCooldown(rule: AlertRule): void {
  alertCooldowns.set(rule.name, Date.now());
}

/**
 * Evaluate a single alert rule
 */
export async function evaluateAlertRule(rule: AlertRule): Promise<boolean> {
  try {
    // Check cooldown
    if (isInCooldown(rule)) {
      return false;
    }

    // Evaluate condition
    const shouldAlert = await rule.condition();

    if (shouldAlert) {
      const event: AlertEvent = {
        rule,
        triggeredAt: new Date(),
      };

      await sendAlert(event);
      setCooldown(rule);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error evaluating alert rule ${rule.name}:`, error);
    return false;
  }
}

/**
 * Evaluate all alert rules
 */
export async function evaluateAllAlerts(): Promise<void> {
  for (const rule of alertRules) {
    await evaluateAlertRule(rule);
  }
}

/**
 * Start alert monitoring loop
 */
export function startAlertMonitoring(intervalMinutes = 1): NodeJS.Timeout {
  console.log(
    `Starting alert monitoring (checking every ${intervalMinutes} minute(s))`
  );

  return setInterval(async () => {
    try {
      await evaluateAllAlerts();
    } catch (error) {
      console.error("Error in alert monitoring loop:", error);
    }
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop alert monitoring
 */
export function stopAlertMonitoring(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  console.log("Alert monitoring stopped");
}

/**
 * Test alert delivery
 */
export async function testAlert(): Promise<void> {
  const testRule: AlertRule = {
    name: "test_alert",
    condition: () => true,
    severity: "low",
    message: "This is a test alert to verify notification channels are working",
    cooldown: 0,
  };

  const event: AlertEvent = {
    rule: testRule,
    triggeredAt: new Date(),
    metadata: {
      test: true,
    },
  };

  await sendAlert(event);
  console.log("Test alert sent successfully");
}
