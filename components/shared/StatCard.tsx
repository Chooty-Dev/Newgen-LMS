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
        "rounded-3xl p-6 md:p-8 flex flex-col justify-between border-border bg-card shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm md:text-base font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className="size-11 rounded-full bg-secondary text-primary flex items-center justify-center shadow-xs">
            <Icon className="size-5 stroke-[2]" />
          </div>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <div className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
          {value}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
        )}
        {trend && (
          <p className="text-sm text-emerald-600 font-semibold flex items-center gap-1">
            {trend.value}
          </p>
        )}
      </div>
    </Card>
  );
}
