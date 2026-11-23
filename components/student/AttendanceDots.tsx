"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AttendanceDot {
  date: string;
  status: "present" | "absent" | "late" | "excused" | string;
}

interface AttendanceDotsProps {
  dots: AttendanceDot[];
  attendedCount: number;
  totalCount: number;
  className?: string;
}

export function AttendanceDots({
  dots,
  attendedCount,
  totalCount,
  className,
}: AttendanceDotsProps) {
  const percentage = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : 100;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-foreground uppercase tracking-wider">
          Recent Sessions
        </span>
        <span className="text-muted-foreground font-semibold tabular-nums">
          {attendedCount} of {totalCount} attended ({percentage}%)
        </span>
      </div>

      {/* Cute Rounded Circles Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-1">
        {dots.slice(-14).map((dot, idx) => {
          const isPresent = dot.status === "present" || dot.status === "excused";
          const isLate = dot.status === "late";
          const isAbsent = dot.status === "absent";

          return (
            <div
              key={idx}
              title={`${dot.date}: ${dot.status}`}
              className={cn(
                "size-6 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xs",
                isPresent && "bg-emerald-500 text-white",
                isLate && "bg-amber-400 text-white",
                isAbsent && "bg-secondary text-muted-foreground border border-border"
              )}
            >
              <div
                className={cn(
                  "size-1.5 rounded-full",
                  isPresent || isLate ? "bg-white" : "bg-muted-foreground/40"
                )}
              />
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground font-medium pt-0.5">
        Showing up regularly builds strong habits and better grades!
      </p>
    </div>
  );
}
