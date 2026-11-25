"use client";

import * as React from "react";
import {
  BookOpen,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScheduledCategory } from "@/modules/attendance/schedule";

export const STAFF_CATEGORY_STYLE: Record<
  ScheduledCategory,
  { badge: string; icon: React.ComponentType<{ className?: string }> }
> = {
  class: {
    badge: "bg-primary/10 text-primary border-primary/20",
    icon: Users,
  },
  exam: {
    badge: "bg-[#184880] text-white border-[#184880]",
    icon: GraduationCap,
  },
  test: {
    badge: "bg-[#EBF3FE] text-[#184880] border-[#DDE8F8]",
    icon: FileText,
  },
  mcq_quiz: {
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ClipboardCheck,
  },
  paper: {
    badge: "bg-secondary text-foreground border-border",
    icon: BookOpen,
  },
  assignment: {
    badge: "bg-[#E2EEFC] text-[#184880] border-[#DDE8F8]",
    icon: FileText,
  },
};

export function getLocalIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function shiftIsoDate(dateStr: string, deltaDays: number): string {
  const base = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(base.getTime())) return dateStr;
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

/**
 * Safely hydrates the current client calendar date after mount to stay compliant
 * with Next.js 16 prerender rules and React Compiler lint constraints.
 */
export function useClientDateState() {
  const [selectedDate, setSelectedDate] = React.useState("");
  const [todayDate, setTodayDate] = React.useState("");

  React.useEffect(() => {
    const localIso = getLocalIsoDate();
    const timer = setTimeout(() => {
      setTodayDate(localIso);
      setSelectedDate((prev) => prev || localIso);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return { selectedDate, setSelectedDate, todayDate };
}

export interface StaffScheduleFilterTab<T extends string> {
  key: T;
  label: string;
  count: number;
}

export function StaffScheduleHero<T extends string>({
  title,
  selectedDate,
  todayDate,
  onDateChange,
  filterTabs,
  activeFilter,
  onFilterChange,
  summaryBadgeLabel,
  totalScheduled,
  summarySubtitle,
  statTiles,
}: {
  title: string;
  selectedDate: string;
  todayDate: string;
  onDateChange: (nextDate: string) => void;
  filterTabs: Array<StaffScheduleFilterTab<T>>;
  activeFilter: T;
  onFilterChange: (nextFilter: T) => void;
  summaryBadgeLabel: string;
  totalScheduled: number;
  summarySubtitle: string;
  statTiles: [
    { label: string; value: number },
    { label: string; value: number },
  ];
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      <div className="lg:col-span-8 bg-white border border-border/80 rounded-[28px] p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/50">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary mb-1">
              <CalendarCheck className="size-4" />
              <span>{selectedDate ? formatReadableDate(selectedDate) : "Loading date..."}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              type="button"
              onClick={() => selectedDate && onDateChange(shiftIsoDate(selectedDate, -1))}
              disabled={!selectedDate}
              className="size-9 rounded-full bg-secondary/70 hover:bg-secondary border border-border/60 flex items-center justify-center text-foreground transition-colors cursor-pointer"
              title="Previous day"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="relative">
              <Calendar className="size-3.5 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="h-9 pl-8 pr-3 rounded-full bg-secondary/60 border border-border/70 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="button"
              onClick={() => selectedDate && onDateChange(shiftIsoDate(selectedDate, 1))}
              disabled={!selectedDate}
              className="size-9 rounded-full bg-secondary/70 hover:bg-secondary border border-border/60 flex items-center justify-center text-foreground transition-colors cursor-pointer"
              title="Next day"
            >
              <ChevronRight className="size-4" />
            </button>
            {todayDate && selectedDate !== todayDate && (
              <button
                type="button"
                onClick={() => onDateChange(todayDate)}
                className="px-3 h-9 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors cursor-pointer"
              >
                Today
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onFilterChange(tab.key)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                activeFilter === tab.key
                  ? "bg-[#184880] text-white shadow-xs"
                  : "bg-secondary/70 text-muted-foreground hover:text-foreground border border-border/60"
              )}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-4 bg-[#184880] text-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between pb-3">
            <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-extrabold tracking-wide">
              {summaryBadgeLabel}
            </span>
            <span className="text-xs font-bold text-white/80">
              {selectedDate === todayDate ? "Today" : selectedDate || "—"}
            </span>
          </div>
          <p className="text-4xl font-black tabular-nums mt-1">{totalScheduled}</p>
          <p className="text-xs text-white/80 font-medium mt-1">{summarySubtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/15">
          {statTiles.map((tile) => (
            <div key={tile.label} className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] text-white/80 font-bold uppercase">{tile.label}</p>
              <p className="text-base font-black tabular-nums mt-0.5">{tile.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
