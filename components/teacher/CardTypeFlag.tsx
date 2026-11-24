"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardTypeFlagProps {
  type: string;
  className?: string;
  variant?: "pill" | "flag";
}

const TYPE_CONFIG: Record<
  string,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  regular: {
    label: "Regular",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  special: {
    label: "Special",
    dot: "bg-indigo-500",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
  },
  exam: {
    label: "Exam",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  quiz: {
    label: "Quiz",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  assignment: {
    label: "Assignment",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  midterm: {
    label: "Midterm",
    dot: "bg-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
  },
  final: {
    label: "Final",
    dot: "bg-rose-600",
    bg: "bg-rose-50",
    text: "text-rose-900",
    border: "border-rose-300",
  },
  active: {
    label: "Active",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  paused: {
    label: "Paused",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  ended: {
    label: "Ended",
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  general: {
    label: "General",
    dot: "bg-primary",
    bg: "bg-secondary",
    text: "text-primary",
    border: "border-border",
  },
  important: {
    label: "Important",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  weak: {
    label: "Needs Support",
    dot: "bg-rose-500",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
  },
  medium: {
    label: "Consistent",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  excellent: {
    label: "Top Tier",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  scheduled: {
    label: "Scheduled",
    dot: "bg-sky-500",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
  },
  waiting_marks: {
    label: "Needs Marks",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
  },
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  evaluated: {
    label: "Evaluated",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
  },
  archived: {
    label: "Archived",
    dot: "bg-slate-400",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
  },
};

export function CardTypeFlag({ type, className, variant = "pill" }: CardTypeFlagProps) {
  const key = type.toLowerCase().trim();
  const config = TYPE_CONFIG[key] || {
    label: type,
    dot: "bg-primary",
    bg: "bg-secondary",
    text: "text-primary",
    border: "border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs shrink-0 select-none",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} />
      <span>{config.label}</span>
    </span>
  );
}
