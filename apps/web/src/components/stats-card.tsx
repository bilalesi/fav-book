import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  onClick,
  className,
}: StatsCardProps) {
  return (
    <Card
      className={cn(
        onClick && "cursor-pointer transition-all hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
