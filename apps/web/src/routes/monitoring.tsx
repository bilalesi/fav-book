import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/utils/orpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { get } from "radash";

export const Route = createFileRoute("/monitoring")({
  component: MonitoringDashboard,
});

function MonitoringDashboard() {
  const { data: dashboard, refetch: refetchDashboard } = useQuery({
    queryKey: ["monitoring", "dashboard"],
    queryFn: () => client.monitoring.dashboard({}),
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: performance } = useQuery({
    queryKey: ["monitoring", "performance"],
    queryFn: () => client.monitoring.performance({ hours: 24 }),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: errors } = useQuery({
    queryKey: ["monitoring", "errors"],
    queryFn: () => client.monitoring.errors({ limit: 10, offset: 0 }),
    refetchInterval: 30000,
  });

  const { data: queue } = useQuery({
    queryKey: ["monitoring", "queue"],
    queryFn: () => client.monitoring.queue({}),
    refetchInterval: 10000, 
  });

  const { data: storage } = useQuery({
    queryKey: ["monitoring", "storage"],
    queryFn: () => client.monitoring.storage({}),
    refetchInterval: 300000, 
  });

  const { data: health } = useQuery({
    queryKey: ["monitoring", "health"],
    queryFn: () => client.monitoring.probe_health({}),
    refetchInterval: 30000,
  });
  console.log('———health', health)
  const { data: restateStats } = useQuery({
    queryKey: ["monitoring", "restate"],
    queryFn: () => client.monitoring.restate_stats({}),
    refetchInterval: 30000,
  });
  console.log('———restateStats', restateStats)

  const { data: serviceConfig } = useQuery({
    queryKey: ["monitoring", "serviceConfig"],
    queryFn: () => client.monitoring.service_config({}),
    refetchInterval: 30000,
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time metrics and system health
          </p>
        </div>
        <Button onClick={() => refetchDashboard()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Service Configuration */}
      {serviceConfig && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4" />
                AI Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Provider
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {serviceConfig.ai.provider}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Model</span>
                  <span className="text-sm font-medium">
                    {serviceConfig.ai.model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    {serviceConfig.ai.healthy ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Healthy</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">Unhealthy</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Endpoint
                  </span>
                  <p className="text-xs font-mono mt-1 break-all">
                    {serviceConfig.ai.url}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4" />
                Workflow Orchestrator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Orchestrator
                  </span>
                  <Badge variant="secondary" className="font-mono">
                    {serviceConfig.workflow.orchestrator}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    {serviceConfig.workflow.healthy ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-600">Healthy</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600">Unhealthy</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Endpoint
                  </span>
                  <p className="text-xs font-mono mt-1 break-all">
                    {serviceConfig.workflow.url}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health */}
      {health && serviceConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <HealthIndicator
                name="Restate"
                healthy={get(health.services,serviceConfig.workflow.orchestrator, false )}
              />
              <HealthIndicator
                name={
                  serviceConfig.ai.provider === "ollama"
                    ? "Ollama"
                    : "LM Studio"
                }
                healthy={get(health.services,serviceConfig.ai.provider, false )}
              />
              <HealthIndicator
                name="Cobalt API"
                healthy={health.services.cobalt ?? false}
              />
              <HealthIndicator
                name="Storage"
                healthy={health.services.storage ?? false}
              />
              <HealthIndicator
                name="Database"
                healthy={health.services.database ?? false}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Today's Workflows"
          value={dashboard?.today.total || 0}
          subtitle={`${dashboard?.today.successRate.toFixed(1)}% success`}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={
            (dashboard?.today.successRate ?? 0) >= 90 ? "positive" : "negative"
          }
        />
        <MetricCard
          title="Active Workflows"
          value={dashboard?.active || 0}
          subtitle="Currently processing"
          icon={<Activity className="w-5 h-5" />}
        />
        <MetricCard
          title="Queue Depth"
          value={queue?.total || 0}
          subtitle={`${queue?.pending || 0} pending, ${
            queue?.processing || 0
          } processing`}
          icon={<Clock className="w-5 h-5" />}
          trend={queue?.backlog?.hasBacklog ? "negative" : "positive"}
        />
        <MetricCard
          title="Failed Today"
          value={dashboard?.today.failed || 0}
          subtitle="Requires attention"
          icon={<XCircle className="w-5 h-5" />}
          trend={(dashboard?.today.failed ?? 0) > 0 ? "negative" : "positive"}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success/Failure Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Today</span>
                <span className="text-sm text-muted-foreground">
                  {dashboard?.today.total || 0} total
                </span>
              </div>
              <div className="space-y-2">
                <StatBar
                  label="Completed"
                  value={dashboard?.today.completed || 0}
                  total={dashboard?.today.total || 1}
                  color="bg-green-500"
                />
                <StatBar
                  label="Failed"
                  value={dashboard?.today.failed || 0}
                  total={dashboard?.today.total || 1}
                  color="bg-red-500"
                />
                <StatBar
                  label="Partial Success"
                  value={dashboard?.today.partialSuccess || 0}
                  total={dashboard?.today.total || 1}
                  color="bg-yellow-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">This Week</span>
                <span className="text-sm text-muted-foreground">
                  {dashboard?.week.total || 0} total
                </span>
              </div>
              <div className="space-y-2">
                <StatBar
                  label="Completed"
                  value={dashboard?.week.completed || 0}
                  total={dashboard?.week.total || 1}
                  color="bg-green-500"
                />
                <StatBar
                  label="Failed"
                  value={dashboard?.week.failed || 0}
                  total={dashboard?.week.total || 1}
                  color="bg-red-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Usage</span>
                <span className="text-sm text-muted-foreground">
                  {formatBytes(storage?.totalBytes || 0)} /{" "}
                  {formatBytes(storage?.maxBytes || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (storage?.usagePercent || 0) > 80
                      ? "bg-red-500"
                      : (storage?.usagePercent || 0) > 60
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{ width: `${storage?.usagePercent || 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {storage?.usagePercent.toFixed(1)}% used
              </p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Files by Type</p>
              <div className="space-y-2">
                {storage?.byType.map((type: any) => (
                  <div
                    key={type.type}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{type.type}</span>
                    <span className="font-medium">
                      {type._count} files (
                      {formatBytes(Number(type._sum.fileSize || 0))})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      {errors && errors.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {errors.errors.map((error: any) => (
                <div
                  key={error.id}
                  className="border-l-4 border-red-500 pl-4 py-2 bg-red-50 rounded-r"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{error.platform}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.savedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">
                        {error.postUrl}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {error.errorMessage || "Unknown error"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(`/bookmarks/${error.id}`, "_blank")
                      }
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Restate Services */}
      {restateStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Restate Services
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Deployments</span>
                  <Badge variant="outline">
                    {restateStats.deploymentsCount}
                  </Badge>
                </div>
                {restateStats.deployments.length > 0 && (
                  <div className="space-y-2 text-sm">
                    {restateStats.deployments.map(
                      (deployment: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-muted-foreground"
                        >
                          <span>
                            {deployment.deployment?.id ||
                              `Deployment ${idx + 1}`}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {deployment.deployment?.protocol_type || "HTTP"}
                          </Badge>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Registered Services
                  </span>
                  <Badge variant="outline">{restateStats.servicesCount}</Badge>
                </div>
                {restateStats.services.length > 0 && (
                  <div className="space-y-2 text-sm">
                    {restateStats.services.map((service: any) => (
                      <div
                        key={service.name}
                        className="flex items-center justify-between"
                      >
                        <span className="font-medium">{service.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {service.ty || service.service_type || "service"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {service.handlers?.length || 0} handlers
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform Performance */}
      {performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Performance by Platform
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {performance.byPlatform.map((platform: any) => (
                <div
                  key={platform.platform}
                  className="flex items-center justify-between"
                >
                  <span className="font-medium">{platform.platform}</span>
                  <span className="text-sm text-muted-foreground">
                    {platform._count} workflows
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
          <div
            className={`${
              trend === "positive"
                ? "text-green-500"
                : trend === "negative"
                ? "text-red-500"
                : "text-gray-500"
            }`}
          >
            {icon}
          </div>
        </div>
        <div className="text-3xl font-bold mb-1">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function HealthIndicator({
  name,
  healthy,
}: {
  name: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {healthy ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {healthy ? "Healthy" : "Unhealthy"}
        </p>
      </div>
    </div>
  );
}

function StatBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">
          {value} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
