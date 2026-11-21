import * as React from "react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 pb-6",
        className
      )}
    >
      {children}
    </div>
  );
}
