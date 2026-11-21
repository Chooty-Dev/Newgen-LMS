"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  label?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ScoreRing({
  score,
  label,
  size = 190,
  strokeWidth = 14,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  let friendlyWord = label;
  if (!friendlyWord) {
    if (score >= 75) friendlyWord = "Great job!";
    else if (score >= 50) friendlyWord = "Doing well!";
    else friendlyWord = "Keep going!";
  }

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center select-none",
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="rotate-[-90deg] transition-all duration-700 ease-out"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/60"
        />
        {/* Animated value stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="text-primary transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center Score & Word */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <span className="text-5xl md:text-6xl font-bold tracking-tight text-foreground tabular-nums">
          {score}
          <span className="text-3xl font-medium text-muted-foreground">%</span>
        </span>
        <span className="text-sm md:text-base font-semibold text-primary pt-1">
          {friendlyWord}
        </span>
      </div>
    </div>
  );
}
