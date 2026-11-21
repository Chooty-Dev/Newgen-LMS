import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl p-6 md:p-8 flex flex-col justify-between border-border bg-card shadow-sm hover:border-foreground/30 transition-colors",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-medium text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-6 text-foreground stroke-[1.8]" />}
      </div>
      <div className="mt-4 space-y-1">
        <div className="text-4xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
        )}
        {trend && (
          <p className="text-sm text-muted-foreground font-medium">
            {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}
