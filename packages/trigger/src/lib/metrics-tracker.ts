import { workflowCounter, errorCounter } from "./metrics";

/**
 * Tracks workflow success/failure rates over time
 * Provides methods to calculate rates and trends
 */
export class MetricsTracker {
  private successCount = 0;
  private failureCount = 0;
  private totalCount = 0;
  private windowStart: number;
  private windowDuration: number; // in milliseconds

  constructor(windowDurationMinutes = 5) {
    this.windowStart = Date.now();
    this.windowDuration = windowDurationMinutes * 60 * 1000;
  }

  /**
   * Record a successful workflow execution
   */
  recordSuccess(platform: string): void {
    this.checkWindow();
    this.successCount++;
    this.totalCount++;
    workflowCounter.inc({ status: "success", platform });
  }

  /**
   * Record a failed workflow execution
   */
  recordFailure(platform: string, errorType: string): void {
    this.checkWindow();
    this.failureCount++;
    this.totalCount++;
    workflowCounter.inc({ status: "failure", platform });
    errorCounter.inc({
      step: "workflow",
      error_type: errorType,
      retryable: "false",
    });
  }

  /**
   * Get success rate as a percentage (0-1)
   */
  getSuccessRate(): number {
    return this.totalCount > 0 ? this.successCount / this.totalCount : 0;
  }

  /**
   * Get failure rate as a percentage (0-1)
   */
  getFailureRate(): number {
    return this.totalCount > 0 ? this.failureCount / this.totalCount : 0;
  }

  /**
   * Get total count of workflows in current window
   */
  getTotalCount(): number {
    return this.totalCount;
  }

  /**
   * Get success count in current window
   */
  getSuccessCount(): number {
    return this.successCount;
  }

  /**
   * Get failure count in current window
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Check if window has expired and reset if needed
   */
  private checkWindow(): void {
    const now = Date.now();
    if (now - this.windowStart > this.windowDuration) {
      this.reset();
      this.windowStart = now;
    }
  }

  /**
   * Reset all counters
   */
  reset(): void {
    this.successCount = 0;
    this.failureCount = 0;
    this.totalCount = 0;
  }

  /**
   * Get current window statistics
   */
  getStats() {
    return {
      successCount: this.successCount,
      failureCount: this.failureCount,
      totalCount: this.totalCount,
      successRate: this.getSuccessRate(),
      failureRate: this.getFailureRate(),
      windowStart: new Date(this.windowStart),
      windowDuration: this.windowDuration / 1000 / 60, // in minutes
    };
  }
}

// Global metrics tracker instance (5-minute window)
export const metricsTracker = new MetricsTracker(5);
