"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function FriendlySkeletons({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 animate-in fade-in duration-300", className)}>
      {/* Top greeting skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64 rounded-full" />
        <Skeleton className="h-6 w-96 rounded-full" />
      </div>

      {/* Bento grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-[2rem] md:col-span-2" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-[2rem]" />
        <Skeleton className="h-72 rounded-[2rem]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-48 rounded-[2rem]" />
        <Skeleton className="h-48 rounded-[2rem]" />
        <Skeleton className="h-48 rounded-[2rem]" />
      </div>
    </div>
  );
}
