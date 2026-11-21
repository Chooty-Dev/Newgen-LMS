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
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-foreground">Recent Sessions</span>
        <span className="text-muted-foreground font-medium">
          {attendedCount} of {totalCount} attended
        </span>
      </div>

      {/* 14 Dot Grid */}
      <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 pt-1">
        {dots.slice(-14).map((dot, idx) => {
          const isPresent = dot.status === "present" || dot.status === "excused";
          const isLate = dot.status === "late";
          const isAbsent = dot.status === "absent";

          return (
            <div
              key={idx}
              title={`${dot.date}: ${dot.status}`}
              className={cn(
                "h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                isPresent && "bg-primary text-primary-foreground",
                isLate && "bg-primary/50 text-primary-foreground",
                isAbsent && "bg-muted text-muted-foreground border border-border"
              )}
            >
              <div
                className={cn(
                  "size-2 rounded-full",
                  isPresent ? "bg-primary-foreground" : isLate ? "bg-primary-foreground" : "bg-muted-foreground/40"
                )}
              />
            </div>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground pt-1">
        Showing up regularly builds strong habits and better grades!
      </p>
    </div>
  );
}
