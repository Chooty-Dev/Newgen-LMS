"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowUpRight,
  ClipboardList,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Check,
  MoreHorizontal,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles,
  BookOpen,
  GraduationCap,
  FileCheck2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DataLoader } from "@/components/ui/data-loader";

interface StaffDashboardData {
  stats: {
    pendingMarksCount: number;
    sessionsTodayCount: number;
    completedMarksCount: number;
    workload?: {
      exams: number;
      tests: number;
      quizzes: number;
      assignments: number;
    };
  };
  pendingAssessments: Array<{
    id: string;
    title: string;
    type: string;
    subject: string;
    date: string;
  }>;
  todaySessions: Array<{
    id: string;
    title: string;
    date: string;
    status: string;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    date: string;
  }>;
}

export function StaffDashboardView() {
  const { user } = useAuth();
  const [filterMode, setFilterMode] = React.useState<"all" | "evaluations" | "attendance">("all");
  const [hideSensitive, setHideSensitive] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // 1. Fetch Staff Dashboard Stats & Tasks
  const { data: dashResponse, isLoading: loadingDash } = useQuery({
    queryKey: ["dashboard", "staff", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/dashboard");
      if (!res.ok) throw new Error("Failed to load staff dashboard");
      return res.json();
    },
  });

  // 2. Fetch Daily Attendance Overview
  const { data: attendanceResponse, isLoading: loadingAttendance } = useQuery({
    queryKey: ["attendance-overview", user?.centerId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch(`/api/v1/attendance/overview?date=${today}`);
      if (!res.ok) return { data: null };
      return res.json();
    },
  });

  // 3. Fetch Assigned Classes count
  const { data: classesResponse } = useQuery({
    queryKey: ["classes", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const dashData: StaffDashboardData | undefined = dashResponse?.data;
  const stats = dashData?.stats;
  const overview = attendanceResponse?.data;
  const classesList = classesResponse?.data || [];

  const pendingMarks = stats?.pendingMarksCount ?? 0;
  const completedMarks = stats?.completedMarksCount ?? 0;
  const totalEvaluations = pendingMarks + completedMarks;
  const completionRate = totalEvaluations > 0 ? Math.round((completedMarks / totalEvaluations) * 100) : 100;

  // Attendance rate computation
  const expectedToday = overview?.expectedToday ?? 0;
  const attendedToday = overview?.attended ?? 0;
  const attendanceRate = expectedToday > 0 ? Math.round((attendedToday / expectedToday) * 100) : 100;

  // Workload values
  const workload = stats?.workload || {
    exams: 2,
    tests: 4,
    quizzes: 3,
    assignments: 5,
  };
  const totalWorkload = workload.exams + workload.tests + workload.quizzes + workload.assignments;

  const handleCopyId = () => {
    if (user?.username) {
      navigator.clipboard.writeText(`@${user.username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Staff username copied to clipboard");
    }
  };

  if (loadingDash) {
    return <DataLoader text="Loading staff dashboard..." minHeight="min-h-[400px]" />;
  }

  // Filter tasks for column 3
  const pendingAssessments = dashData?.pendingAssessments || [];
  const todaySessions = dashData?.todaySessions || [];

  const filteredTasks = [
    ...pendingAssessments.map((a) => ({
      id: a.id,
      title: a.title,
      type: "assessment" as const,
      category: a.type ? a.type.toUpperCase() : "EXAM",
      date: a.date || "Scheduled",
      subject: a.subject,
      status: "pending_marks" as const,
      href: `/evaluate-marks?assessmentId=${a.id}`,
      actionLabel: "Enter Marks",
    })),
    ...todaySessions.map((s) => ({
      id: s.id,
      title: s.title,
      type: "session" as const,
      category: "ATTENDANCE",
      date: s.date || "Today",
      subject: "Class Session",
      status: s.status === "finalized" ? ("completed" as const) : ("pending_attendance" as const),
      href: "/attendance",
      actionLabel: s.status === "finalized" ? "View Roster" : "Mark Attendance",
    })),
  ].filter((item) => {
    if (filterMode === "evaluations") return item.type === "assessment";
    if (filterMode === "attendance") return item.type === "session";
    return true;
  });

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-300">
      {/* =========================================================================
          ROW 1: TOP 2 MAIN CARDS (Left White Card ~60% + Right Solid Blue Card ~40%)
         ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Left Card (~60% width - White Card) */}
        <div className="lg:col-span-7 bg-white dark:bg-card border border-border/80 rounded-[28px] p-6 sm:p-8 flex flex-col justify-between shadow-xs transition-all hover:border-primary/20">
          <div>
            {/* Top row: Filter pills on left + Staff identifier on right */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-border/50">
              <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-full border border-border/60">
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterMode === "all"
                      ? "bg-white text-primary shadow-2xs dark:bg-card"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("evaluations")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterMode === "evaluations"
                      ? "bg-white text-primary shadow-2xs dark:bg-card"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Marks
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("attendance")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterMode === "attendance"
                      ? "bg-white text-primary shadow-2xs dark:bg-card"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sessions
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Click to copy staff ID"
              >
                <span className="text-[11px] text-muted-foreground/80">Staff ID</span>
                <span className="font-mono text-foreground font-extrabold">@{user?.username || "staff"}</span>
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              </button>
            </div>

            {/* Middle row: Big Metric Display */}
            <div className="pt-6 pb-6">
              <p className="text-xs sm:text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Pending Evaluations & Tasks
              </p>
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight tabular-nums">
                  {hideSensitive ? "•••" : pendingMarks + (overview?.leftToMark ? 1 : 0)}
                </span>
                <span className="text-sm sm:text-base font-bold text-muted-foreground">
                  items in queue
                </span>
                <button
                  type="button"
                  onClick={() => setHideSensitive(!hideSensitive)}
                  className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
                  title={hideSensitive ? "Show numbers" : "Hide numbers"}
                >
                  {hideSensitive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom row: Action Buttons + Circular Jump Button */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/evaluate-marks">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-black text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <ClipboardList className="size-3.5 text-white/90" />
                  <span>Enter Marks</span>
                </button>
              </Link>
              <Link href="/attendance">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white hover:bg-secondary border border-border text-foreground text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                  <CalendarCheck className="size-3.5 text-primary" />
                  <span>Mark Attendance</span>
                </button>
              </Link>
              <Link href="/announcements">
                <button
                  type="button"
                  className="size-10 rounded-full bg-secondary/80 hover:bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  title="View Announcements"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </Link>
            </div>

            {/* Prominent Circular Jump Button (like reference image arrow) */}
            <Link href="/evaluate-marks" title="Go to Evaluation Grid">
              <div className="size-12 sm:size-13 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/95 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                <ArrowUpRight className="size-6 stroke-[2.5]" />
              </div>
            </Link>
          </div>
        </div>

        {/* Card 2: Right Card (~40% width - Solid Blue Card) */}
        <div className="lg:col-span-5 bg-[#184880] text-white rounded-[28px] p-6 sm:p-8 flex flex-col justify-between shadow-md relative overflow-hidden">
          <div>
            {/* Top row: Priority Pill Badge + More Button */}
            <div className="flex items-center justify-between pb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-extrabold tracking-wide">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>DUTY ACTIVE</span>
              </div>
              <Link href="/settings" className="size-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors">
                <MoreHorizontal className="size-4" />
              </Link>
            </div>

            {/* Middle: Big Metric */}
            <div className="pt-2 pb-6">
              <p className="text-xs sm:text-sm font-semibold text-white/80 uppercase tracking-wider mb-1">
                Completed Evaluations
              </p>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums">
                  {completedMarks}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold">
                  {completionRate}% rate
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Split Sub-Cards (2 boxes side by side) */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 p-3 sm:p-3.5 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] text-white/80 font-bold uppercase">
                  Classes
                </span>
                <Eye className="size-3 text-white/60" />
              </div>
              <p className="text-base sm:text-lg font-black text-white tabular-nums">
                {classesList.length} Batches
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 p-3 sm:p-3.5 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] text-white/80 font-bold uppercase">
                  Today
                </span>
                <Eye className="size-3 text-white/60" />
              </div>
              <p className="text-base sm:text-lg font-black text-white tabular-nums">
                {stats?.sessionsTodayCount ?? 0} Sessions
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          ROW 2: 3 EQUAL COLUMNS (Donut Gauge + Workload Breakdown + Tasks List)
         ========================================================================= */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
        {/* Col 1 (Bottom Left): Circular Gauge Card (Like "Spending" in reference) */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-[28px] p-6 flex flex-col justify-between shadow-xs">
          <div>
            {/* Header: Icon + Title + Date pill */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarCheck className="size-4" />
                </div>
                <h3 className="font-extrabold text-sm text-foreground">Attendance</h3>
              </div>
              <span className="text-xs font-bold text-muted-foreground px-2.5 py-0.5 rounded-full bg-secondary border border-border/60">
                Today
              </span>
            </div>

            {/* Circular SVG Donut Gauge */}
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative size-36 sm:size-40 flex items-center justify-center">
                <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background track circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#DDE8F8"
                    strokeWidth="10"
                    className="opacity-70 dark:opacity-30"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#184880"
                    strokeWidth="10"
                    strokeDasharray={`${(attendanceRate * 251.2) / 100} 251.2`}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-foreground tabular-nums">
                    {attendanceRate}%
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                    Active
                  </span>
                </div>
              </div>

              <div className="mt-2 text-center">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="size-3 text-primary" />
                  <span>Tracking {attendedToday} of {expectedToday} students</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4 Legend Grid Items at Bottom (2x2) */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold truncate">Present</p>
                <p className="text-xs font-extrabold text-foreground tabular-nums">{attendedToday}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30">
              <span className="size-2 rounded-full bg-rose-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold truncate">Absent</p>
                <p className="text-xs font-extrabold text-foreground tabular-nums">{overview?.absent ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30">
              <span className="size-2 rounded-full bg-amber-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold truncate">To Mark</p>
                <p className="text-xs font-extrabold text-foreground tabular-nums">{overview?.leftToMark ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/30">
              <span className="size-2 rounded-full bg-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-semibold truncate">Expected</p>
                <p className="text-xs font-extrabold text-foreground tabular-nums">{expectedToday}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Col 2 (Bottom Center): Workload Breakdown (Like "Earning" in reference) */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-[28px] p-6 flex flex-col justify-between shadow-xs">
          <div>
            {/* Header: Icon + Title + Target pill */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ClipboardList className="size-4" />
                </div>
                <h3 className="font-extrabold text-sm text-foreground">Workload</h3>
              </div>
              <span className="text-xs font-bold text-foreground px-2.5 py-0.5 rounded-full bg-secondary border border-border/60">
                🎯 All Active
              </span>
            </div>

            {/* Big Metric Display */}
            <div className="py-2 mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-foreground tabular-nums">
                  {totalWorkload}
                </span>
                <span className="text-xs font-bold text-muted-foreground">Assessments</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                +18% managed vs last month
              </span>
            </div>

            {/* Category list with progress bars */}
            <div className="space-y-3 pt-1">
              {/* Exams */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-foreground">Exams</span>
                  <span className="text-muted-foreground">{workload.exams} Items</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (workload.exams / (totalWorkload || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Tests */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-foreground">Tests</span>
                  <span className="text-muted-foreground">{workload.tests} Items</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${Math.min(100, (workload.tests / (totalWorkload || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Quizzes */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-foreground">Quizzes</span>
                  <span className="text-muted-foreground">{workload.quizzes} Items</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, (workload.quizzes / (totalWorkload || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Assignments */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-foreground">Assignments</span>
                  <span className="text-muted-foreground">{workload.assignments} Items</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${Math.min(100, (workload.assignments / (totalWorkload || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60">
            <Link
              href="/evaluate-marks"
              className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Evaluation Grid</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>

        {/* Col 3 (Bottom Right): Actionable Tasks List (Like "Transactions" in reference) */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-[28px] p-6 flex flex-col justify-between shadow-xs">
          <div>
            {/* Header: Icon + Title + More options */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Layers className="size-4" />
                </div>
                <h3 className="font-extrabold text-sm text-foreground">Active Tasks</h3>
              </div>
              <Link href="/evaluate-marks" className="size-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary">
                <MoreHorizontal className="size-4" />
              </Link>
            </div>

            {/* Items List (Transactions style) */}
            <div className="divide-y divide-border/50">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground space-y-1.5">
                  <CheckCircle2 className="size-8 mx-auto text-emerald-500 opacity-60" />
                  <p className="text-xs font-bold text-foreground">All Tasks Up to Date</p>
                  <p className="text-[11px]">No pending evaluation or session duties remaining.</p>
                </div>
              ) : (
                filteredTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-secondary/30 px-2 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0 border border-border/60">
                        {task.type === "assessment" ? (
                          <FileText className="size-4 text-primary" />
                        ) : (
                          <CalendarCheck className="size-4 text-emerald-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate" title={task.title}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {task.subject} • {task.date}
                        </p>
                      </div>
                    </div>

                    <Link href={task.href} className="shrink-0">
                      <button
                        type="button"
                        className={cn(
                          "px-3 py-1 rounded-full text-[11px] font-bold transition-all active:scale-95 cursor-pointer",
                          task.status === "completed"
                            ? "bg-secondary text-muted-foreground border border-border"
                            : "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90"
                        )}
                      >
                        {task.actionLabel}
                      </button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
            <span className="text-[11px] font-medium text-muted-foreground">
              {filteredTasks.length} total scheduled
            </span>
            <Link
              href="/evaluate-marks"
              className="font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
