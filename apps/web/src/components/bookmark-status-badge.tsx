import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ProcessingStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL_SUCCESS"
  | "FAILED";

interface BookmarkStatusBadgeProps {
  status: ProcessingStatus;
  className?: string;
}

const statusConfig = {
  PENDING: {
    label: "Queued",
    variant: "outline" as const,
    icon: Clock,
    className: "text-gray-600 border-gray-300",
    animated: false,
  },
  PROCESSING: {
    label: "Processing",
    variant: "outline" as const,
    icon: Loader2,
    className: "text-blue-600 border-blue-300 bg-blue-50",
    animated: true,
  },
  COMPLETED: {
    label: "Enriched",
    variant: "outline" as const,
    icon: CheckCircle,
    className: "text-green-600 border-green-300 bg-green-50",
    animated: false,
  },
  PARTIAL_SUCCESS: {
    label: "Partially Enriched",
    variant: "outline" as const,
    icon: AlertCircle,
    className: "text-yellow-600 border-yellow-300 bg-yellow-50",
    animated: false,
  },
  FAILED: {
    label: "Failed",
    variant: "outline" as const,
    icon: XCircle,
    className: "text-red-600 border-red-300 bg-red-50",
    animated: false,
  },
};

export function BookmarkStatusBadge({
  status,
  className,
}: BookmarkStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
      aria-label={`Processing status: ${config.label}`}
    >
      <Icon
        className={cn("w-3 h-3 mr-1", config.animated && "animate-spin")}
        aria-hidden="true"
      />
      {config.label}
    </Badge>
  );
}
