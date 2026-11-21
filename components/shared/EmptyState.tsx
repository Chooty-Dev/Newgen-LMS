import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  message,
  actionLabel,
  onAction,
  icon: Icon,
  className,
}: EmptyStateProps) {
  return (
    <Card
      className={cn(
        "rounded-3xl p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-border bg-card/60 my-6",
        className
      )}
    >
      {Icon && <Icon className="size-12 text-muted-foreground mb-4 stroke-[1.5]" />}
      <p className="text-lg font-medium text-muted-foreground mb-6 max-w-sm">
        {message}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="rounded-full h-12 px-8">
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
