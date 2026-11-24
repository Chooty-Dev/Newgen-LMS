"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DataLoaderProps {
  text?: string;
  className?: string;
  minHeight?: string;
  size?: "sm" | "md" | "lg";
}

export function DataLoader({
  text = "Loading data...",
  className,
  minHeight = "min-h-[180px]",
  size = "md",
}: DataLoaderProps) {
  const spinnerSize =
    size === "sm" ? "size-6 border-2" : size === "lg" ? "size-12 border-3" : "size-8 border-2";

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center gap-3 py-10 transition-opacity duration-300 animate-in fade-in",
        minHeight,
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "rounded-full border-primary/20 border-t-primary animate-spin",
            spinnerSize
          )}
        />
      </div>
      {text && (
        <p className="text-xs font-semibold text-muted-foreground tracking-wide select-none">
          {text}
        </p>
      )}
    </div>
  );
}

export function InlineDataLoader({
  text = "Loading data...",
  className,
}: {
  text?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center gap-2 py-4 px-3 text-xs font-semibold text-muted-foreground animate-in fade-in",
        className
      )}
    >
      <div className="size-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin shrink-0" />
      <span>{text}</span>
    </div>
  );
}
