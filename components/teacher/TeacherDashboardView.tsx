"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen,
  CheckCircle2,
  Users,
  Trophy,
  ArrowRight,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  FileText,
  Star,
  Bookmark,
  Layers,
  Code2,
  Target,
  Sparkles,
  Laptop,
  GraduationCap,
  Calendar as CalendarIcon,
  PlusCircle,
  HelpCircle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassScheduleRegular {
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
}

interface ClassScheduleSpecialSession {
  date: string;
  startTime: string;
  endTime: string;
}

interface ClassItem {
  id: string;
  name: string;
  subject?: string;
  enrolledCount?: number;
  capacity?: number;
  status?: string;
  schedule?: {
    type?: "regular" | "special";
    regular?: ClassScheduleRegular;
    special?: {
      sessions?: ClassScheduleSpecialSession[];
    };
  };
}

interface ExamItem {
  id: string;
  title: string;
  subject?: string;
  status?: string;
  totalMarks?: number;
  passMark?: number;
  date?: string;
  createdAt?: string;
  sessions?: Array<{ date?: string; startTime?: string; endTime?: string }>;
}

interface AnalyticsData {
  groupDistribution?: Array<{ name: string; count: number; color?: string }>;
  topStudents?: Array<{ id: string; name: string; username: string; score: number }>;
  lowPerformers?: Array<{ id: string; name: string; username: string; score: number }>;
}

function calculateClassDuration(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 1.5;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(eh)) return 1.5;
  const diffMinutes = eh * 60 + (em || 0) - (sh * 60 + (sm || 0));
  return diffMinutes > 0 ? diffMinutes / 60 : 1.5;
}

export function TeacherDashboardView() {
  const { user } = useAuth();

  // 1. Fetch teacher analytics
  const { data: analyticsRes, isLoading: loadingAnalytics } = useQuery<{ data: AnalyticsData }>({
    queryKey: ["analysis", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/analysis/teacher");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
  });

  // 2. Fetch teacher assigned classes
  const { data: classesRes, isLoading: loadingClasses } = useQuery<{ data: ClassItem[] }>({
    queryKey: ["classes", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json();
    },
  });

  // 3. Fetch teacher exams / assignments
  const { data: examsRes } = useQuery<{ data: ExamItem[] }>({
    queryKey: ["exams", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/exams");
      if (!res.ok) throw new Error("Failed to load exams");
      return res.json();
    },
  });

  // Data bindings
  const analytics = analyticsRes?.data;
  const rawClasses: ClassItem[] = classesRes?.data || [];
  const rawExams: ExamItem[] = examsRes?.data || [];

  // Full Month Calendar State & Hooks
  const today = React.useMemo(() => new Date(), []);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMonth, setViewMonth] = React.useState<Date>(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = React.useState<Date>(today);

  const prevMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Build Full Month Calendar Grid unconditionally
  const calendarDays = React.useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateNumber: number;
      fullDate: Date;
      dayOfWeek: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasClass: boolean;
    }> = [];

    // Blank slots for previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const prevDate = new Date(year, month, -firstDayOfWeek + i + 1);
      days.push({
        dateNumber: prevDate.getDate(),
        fullDate: prevDate,
        dayOfWeek: prevDate.getDay(),
        isCurrentMonth: false,
        isToday: prevDate.toDateString() === today.toDateString(),
        hasClass: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const current = new Date(year, month, d);
      const dayOfWeek = current.getDay();
      const dateStr = current.toISOString().slice(0, 10);

      const hasClass = rawClasses.some((c) => {
        if (c.schedule?.type === "regular" && c.schedule?.regular?.daysOfWeek) {
          return c.schedule.regular.daysOfWeek.includes(dayOfWeek);
        }
        if (c.schedule?.type === "special" && c.schedule?.special?.sessions) {
          return c.schedule.special.sessions.some((s) => s.date === dateStr);
        }
        return false;
      });

      days.push({
        dateNumber: d,
        fullDate: current,
        dayOfWeek,
        isCurrentMonth: true,
        isToday: current.toDateString() === today.toDateString(),
        hasClass,
      });
    }

    return days;
  }, [viewMonth, rawClasses, today]);

  const filteredDashboardClasses = rawClasses.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.subject && c.subject.toLowerCase().includes(q));
  });

  // Today's classes and next class today for live status
  const todayDayOfWeek = today.getDay();
  const todayDateStr = today.toISOString().slice(0, 10);
  const todaysClasses = rawClasses.filter((c) => {
    if (c.schedule?.type === "regular" && c.schedule?.regular?.daysOfWeek) {
      return c.schedule.regular.daysOfWeek.includes(todayDayOfWeek);
    }
    if (c.schedule?.type === "special" && c.schedule?.special?.sessions) {
      return c.schedule.special.sessions.some((s) => s.date === todayDateStr);
    }
    return false;
  });
  const nextClassToday = todaysClasses[0];

  // Real statistics computation
  const totalStudents = rawClasses.reduce((acc, c) => acc + (c.enrolledCount || 0), 0);
  const activeClassesCount = rawClasses.filter((c) => c.status !== "ended").length;
  const totalAssessments = rawExams.length;
  const topStudentsCount = analytics?.topStudents?.length || 0;

  // Real Weekly Teaching Hours calculation from class schedules
  const dayHoursMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  rawClasses.forEach((cls) => {
    if (cls.schedule?.type === "regular" && cls.schedule?.regular?.daysOfWeek) {
      const dur = calculateClassDuration(
        cls.schedule.regular.startTime,
        cls.schedule.regular.endTime
      );
      cls.schedule.regular.daysOfWeek.forEach((d) => {
        if (dayHoursMap[d] !== undefined) {
          dayHoursMap[d] += dur;
        }
      });
    }
  });

  const totalWeeklyTeachingHours = Object.values(dayHoursMap).reduce((acc, h) => acc + h, 0);

  // Bar data for study/teaching hours
  const weekdayBars = [
    { day: "Mon", dayIndex: 1, hours: dayHoursMap[1] || 0 },
    { day: "Tue", dayIndex: 2, hours: dayHoursMap[2] || 0 },
    { day: "Wed", dayIndex: 3, hours: dayHoursMap[3] || 0 },
    { day: "Thu", dayIndex: 4, hours: dayHoursMap[4] || 0 },
    { day: "Fri", dayIndex: 5, hours: dayHoursMap[5] || 0 },
    { day: "Sat", dayIndex: 6, hours: dayHoursMap[6] || 0 },
    { day: "Sun", dayIndex: 0, hours: dayHoursMap[0] || 0 },
  ];

  const maxDailyHours = Math.max(...weekdayBars.map((b) => b.hours), 4);
  const currentDayIndex = today.getDay();

  // Real Group Distribution for Concentric Ring Chart
  const excellentCount =
    analytics?.groupDistribution?.find((g) => g.name === "Excellent")?.count || 0;
  const goodCount =
    analytics?.groupDistribution?.find((g) => g.name === "Good")?.count || 0;
  const needsHelpCount =
    analytics?.groupDistribution?.find((g) => g.name === "Needs Help")?.count || 0;
  const totalEvaluated = excellentCount + goodCount + needsHelpCount;

  const pExcellent = totalEvaluated > 0 ? Math.round((excellentCount / totalEvaluated) * 100) : 0;
  const pGood = totalEvaluated > 0 ? Math.round((goodCount / totalEvaluated) * 100) : 0;
  const pNeedsHelp =
    totalEvaluated > 0 ? Math.round((needsHelpCount / totalEvaluated) * 100) : 0;

  const overallRate =
    totalEvaluated > 0
      ? Math.round(((excellentCount + goodCount) / totalEvaluated) * 100)
      : totalStudents > 0
      ? 100
      : 0;

  // SVG Concentric Rings
  const r1 = 48;
  const c1 = 2 * Math.PI * r1;
  const o1 = c1 - (pExcellent / 100) * c1;

  const r2 = 36;
  const c2 = 2 * Math.PI * r2;
  const o2 = c2 - (pGood / 100) * c2;

  const r3 = 24;
  const c3 = 2 * Math.PI * r3;
  const o3 = c3 - (pNeedsHelp / 100) * c3;


  // Real Sessions for Selected Day in Calendar
  const selectedDayOfWeek = selectedDate.getDay();
  const selectedDateString = selectedDate.toISOString().slice(0, 10);

  const scheduledSessionsOnDay = rawClasses.filter((c) => {
    if (c.schedule?.type === "regular" && c.schedule?.regular?.daysOfWeek) {
      return c.schedule.regular.daysOfWeek.includes(selectedDayOfWeek);
    }
    if (c.schedule?.type === "special" && c.schedule?.special?.sessions) {
      return c.schedule.special.sessions.some((s) => s.date === selectedDateString);
    }
    return false;
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER SECTION: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3)   */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Keep teaching, {user?.name || "Teacher"}!
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Welcome to your teaching hub. Manage course schedules, track student performance, and monitor session attendance in real time.
            </p>
            <div className="pt-2">
              <Link
                href="/classes"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <span>Manage Classes</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Large Right Illustration filling the section */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/bulb-on-books.webp"
              alt="Teacher Welcome"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        {/* 4 Stats Cards + Search Bar: 4 cols on lg (1/3 width) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* 4 Stats Cards tightly grouped in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Card 1: Active Classes */}
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {activeClassesCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Active Classes
                </p>
              </div>
            </div>

            {/* Card 2: Total Assessments */}
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {totalAssessments}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Assessments
                </p>
              </div>
            </div>

            {/* Card 3: Total Enrolled Students */}
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {totalStudents}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Students
                </p>
              </div>
            </div>

            {/* Card 4: Top Achievers */}
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Trophy className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {topStudentsCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Top Performers
                </p>
              </div>
            </div>
          </div>

          {/* Combined Option 01 (Quick Actions) + Option 02 (Live Status Widget) */}
          <div className="bg-card border border-border/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-foreground truncate">
                {nextClassToday
                  ? `Next: ${nextClassToday.name} (${nextClassToday.schedule?.regular?.startTime || "Today"})`
                  : "All classes up to date"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {nextClassToday ? (
                <Link
                  href={`/attendance?classId=${nextClassToday.id}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95"
                  title="Take Attendance"
                >
                  <Laptop className="size-3" />
                  <span>Attend</span>
                </Link>
              ) : null}
              <Link
                href="/classes"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-[10px] sm:text-xs font-bold transition-all active:scale-95"
                title="Manage Classes"
              >
                <PlusCircle className="size-3 text-primary" />
                <span>Classes</span>
              </Link>
            </div>
          </div>

          {/* Search bar directly beneath cards */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search classes or subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. MAIN DASHBOARD CONTENT: Left (8 cols) & Right (4 cols)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Assigned Classes, Assessments, Teaching Hours Chart         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Middle Section: "Assigned Classes" (100% Real Live Classes) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-foreground tracking-tight">
                Assigned Classes
              </h3>
              <Link
                href="/classes"
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>View all ({rawClasses.length})</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {rawClasses.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-3xl p-8 text-center space-y-3">
                <BookOpen className="size-10 mx-auto text-muted-foreground/40" />
                <h4 className="font-extrabold text-base text-foreground">
                  No Classes Assigned Yet
                </h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  You have not been assigned to any classes yet. Create a new class to start enrolling students and scheduling lessons.
                </p>
                <div className="pt-2">
                  <Link
                    href="/classes"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:bg-primary/90 transition-all"
                  >
                    <PlusCircle className="size-4" />
                    <span>Create Class</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {filteredDashboardClasses.slice(0, 3).map((cls, idx) => {
                  const capacity = cls.capacity || 50;
                  const enrolled = cls.enrolledCount || 0;
                  const fillPercent = Math.min(100, Math.round((enrolled / capacity) * 100));

                  const gradientClass =
                    idx === 0
                      ? "from-primary to-indigo-500"
                      : idx === 1
                      ? "from-emerald-600 to-teal-400"
                      : "from-amber-500 to-orange-400";

                  const tagColor =
                    idx === 0
                      ? "text-primary"
                      : idx === 1
                      ? "text-emerald-600"
                      : "text-amber-600";

                  const barColor =
                    idx === 0
                      ? "bg-primary"
                      : idx === 1
                      ? "bg-emerald-500"
                      : "bg-amber-500";

                  const IconComp = idx === 0 ? Layers : idx === 1 ? Code2 : Target;

                  return (
                    <div
                      key={cls.id}
                      className="bg-card border border-border rounded-3xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-4 group"
                    >
                      <div
                        className={cn(
                          "relative h-28 w-full rounded-2xl bg-gradient-to-tr p-3 flex flex-col justify-between overflow-hidden",
                          gradientClass
                        )}
                      >
                        <div className="flex items-center justify-between z-10">
                          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                            {cls.status || "Active"}
                          </span>
                          <span className="text-[10px] font-bold text-white/90 bg-black/20 px-2 py-0.5 rounded-md backdrop-blur-xs">
                            {enrolled}/{capacity}
                          </span>
                        </div>
                        <div className="size-12 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white mx-auto z-10">
                          <IconComp className="size-6 stroke-[2.2]" />
                        </div>
                        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("text-[10px] font-bold uppercase tracking-wider truncate", tagColor)}>
                            {cls.subject || "General Class"}
                          </span>
                          <span className="text-amber-500 font-extrabold flex items-center gap-0.5 text-xs">
                            <Star className="size-3 fill-amber-400" />
                            <span>Active</span>
                          </span>
                        </div>
                        <h4 className="font-extrabold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                          {cls.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>{enrolled} Enrolled</span>
                          <span>•</span>
                          <span>
                            {cls.schedule?.type === "regular" && cls.schedule?.regular
                              ? `${cls.schedule.regular.startTime || "09:00"} - ${cls.schedule.regular.endTime || "10:30"}`
                              : "Special Sessions"}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            style={{ width: `${fillPercent}%` }}
                            className={cn("h-full rounded-full transition-all duration-300", barColor)}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-muted-foreground">Capacity Filled</span>
                          <span className="text-foreground">{fillPercent}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Bottom Row: Lesson List / Recent Assessments (Left) & Study Hours (Right) */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Left 7 cols: Real Lesson List / Assessments */}
            <div className="md:col-span-7 bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="font-extrabold text-base text-foreground">
                  Recent Assessments
                </h3>
                <Link
                  href="/exams"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  See all ({rawExams.length})
                </Link>
              </div>

              {rawExams.length === 0 ? (
                <div className="p-8 text-center space-y-2 border border-dashed border-border rounded-2xl">
                  <CheckCircle2 className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-bold text-foreground">No assessments yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Create quizzes and exams to evaluate student learning progress.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/exams"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold"
                    >
                      <span>New Assessment</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {rawExams.slice(0, 4).map((item, idx) => {
                    const statusStr = (item.status || "scheduled").toLowerCase();
                    const isDone = statusStr === "completed" || statusStr === "evaluated";
                    const inProgress = statusStr.includes("progress") || statusStr === "waiting_marks";
                    const sessionDate = item.sessions?.[0]?.date || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-");

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={cn(
                              "size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold",
                              idx === 0
                                ? "bg-primary/10 text-primary"
                                : idx === 1
                                ? "bg-indigo-500/10 text-indigo-600"
                                : idx === 2
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-amber-500/10 text-amber-600"
                            )}
                          >
                            <Play className="size-3.5 fill-current" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.subject || "General Class"} • Max: {item.totalMarks || 100}m
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">
                            {sessionDate}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize",
                              isDone
                                ? "bg-emerald-100 text-emerald-700"
                                : inProgress
                                ? "bg-amber-100 text-amber-700"
                                : "bg-secondary text-primary border border-border"
                            )}
                          >
                            {statusStr.replace("_", " ")}
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right 5 cols: Real Weekly Teaching Hours Bar Chart */}
            <div className="md:col-span-5 bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-foreground">
                    Teaching hours
                  </h3>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-black text-foreground">
                      {totalWeeklyTeachingHours.toFixed(1)}h
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      Weekly total
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border">
                  Timetable
                </span>
              </div>

              {/* Weekly Vertical Bars dynamically computed from scheduled classes */}
              <div className="flex items-end justify-between gap-2 h-44 pt-6 px-2">
                {weekdayBars.map((bar) => {
                  const isCurrentDay = currentDayIndex === bar.dayIndex;
                  const barHeightPercent =
                    maxDailyHours > 0
                      ? Math.max(12, Math.round((bar.hours / maxDailyHours) * 100))
                      : 12;

                  return (
                    <div
                      key={bar.day}
                      className="flex flex-col items-center gap-2 h-full justify-end flex-1 group"
                    >
                      {bar.hours > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground shadow-xs mb-1">
                          {bar.hours.toFixed(1)}h
                        </span>
                      )}
                      <div
                        style={{ height: `${barHeightPercent}%` }}
                        className={cn(
                          "w-full max-w-[24px] rounded-full transition-all duration-300",
                          isCurrentDay
                            ? "bg-primary shadow-sm"
                            : bar.hours > 0
                            ? "bg-primary/40 group-hover:bg-primary/60"
                            : "bg-secondary"
                        )}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          isCurrentDay ? "text-primary font-bold" : "text-muted-foreground"
                        )}
                      >
                        {bar.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Progress Donut & FULL MONTH Class Schedule Calendar         */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          {/* 1. Student Progress (Concentric Radial Rings Card - 100% Real Live Distribution) */}
          <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-extrabold text-base text-foreground">
                Class Progress
              </h3>
              <Link
                href="/analysis"
                className="text-muted-foreground hover:text-foreground text-xs font-semibold"
              >
                <MoreHorizontal className="size-4" />
              </Link>
            </div>

            {/* Concentric Donut SVG + Real Group Breakdown */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative size-32 shrink-0 flex items-center justify-center">
                <svg width="128" height="128" className="rotate-[-90deg]">
                  {/* Outer Ring: Excellent */}
                  <circle
                    cx="64"
                    cy="64"
                    r={r1}
                    stroke="currentColor"
                    strokeWidth="7"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={r1}
                    stroke="#184880"
                    strokeWidth="7"
                    strokeDasharray={c1}
                    strokeDashoffset={o1}
                    strokeLinecap="round"
                    fill="transparent"
                  />

                  {/* Middle Ring: Good */}
                  <circle
                    cx="64"
                    cy="64"
                    r={r2}
                    stroke="currentColor"
                    strokeWidth="7"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={r2}
                    stroke="#0284c7"
                    strokeWidth="7"
                    strokeDasharray={c2}
                    strokeDashoffset={o2}
                    strokeLinecap="round"
                    fill="transparent"
                  />

                  {/* Inner Ring: Needs Help */}
                  <circle
                    cx="64"
                    cy="64"
                    r={r3}
                    stroke="currentColor"
                    strokeWidth="7"
                    fill="transparent"
                    className="text-secondary"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={r3}
                    stroke="#f59e0b"
                    strokeWidth="7"
                    strokeDasharray={c3}
                    strokeDashoffset={o3}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Center Percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-foreground">
                    {overallRate}%
                  </span>
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase">
                    Pass
                  </span>
                </div>
              </div>

              {/* Real Legend */}
              <div className="space-y-2.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="size-2 rounded-full bg-primary" />
                    <span>Excellent</span>
                  </span>
                  <span className="font-extrabold text-foreground">
                    {pExcellent}% ({excellentCount})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="size-2 rounded-full bg-sky-500" />
                    <span>Good</span>
                  </span>
                  <span className="font-extrabold text-foreground">
                    {pGood}% ({goodCount})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="size-2 rounded-full bg-amber-500" />
                    <span>Needs Help</span>
                  </span>
                  <span className="font-extrabold text-foreground">
                    {pNeedsHelp}% ({needsHelpCount})
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                {totalEvaluated > 0
                  ? `${totalEvaluated} students evaluated`
                  : "No evaluations yet"}
              </span>
              <Link
                href="/analysis"
                className="font-bold text-primary hover:underline"
              >
                Details →
              </Link>
            </div>
          </div>

          {/* 2. Full Month Class Schedule Calendar */}
          <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
            {/* Month & Navigation Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-foreground">
                  Class Schedule
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="size-7 rounded-full hover:bg-secondary flex items-center justify-center text-foreground transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="size-7 rounded-full hover:bg-secondary flex items-center justify-center text-foreground transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels Header (Su Mo Tu We Th Fr Sa) */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-bold text-muted-foreground uppercase"
                >
                  {dayName}
                </span>
              ))}
            </div>

            {/* Days Grid: Class Day color vs Free Day color */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, idx) => {
                const isSelected =
                  selectedDate.toDateString() === item.fullDate.toDateString();

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!item.isCurrentMonth}
                    onClick={() => {
                      if (item.isCurrentMonth) setSelectedDate(item.fullDate);
                    }}
                    className={cn(
                      "size-8 sm:size-9 mx-auto rounded-xl flex flex-col items-center justify-center text-xs transition-all relative",
                      !item.isCurrentMonth && "opacity-20 pointer-events-none text-muted-foreground",
                      item.isCurrentMonth && isSelected && "bg-primary text-white font-black shadow-sm scale-105 z-10",
                      item.isCurrentMonth &&
                        !isSelected &&
                        item.hasClass &&
                        "bg-[#EBF3FE] text-primary border border-primary/25 font-bold hover:bg-primary/15",
                      item.isCurrentMonth &&
                        !isSelected &&
                        !item.hasClass &&
                        "text-muted-foreground/80 hover:bg-secondary hover:text-foreground font-medium",
                      item.isToday && !isSelected && "ring-1 ring-primary/50"
                    )}
                  >
                    <span>{item.dateNumber}</span>
                    {/* Small colored indicator dot for class days */}
                    {item.isCurrentMonth && item.hasClass && !isSelected && (
                      <span className="size-1 rounded-full bg-primary absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend: Class Day vs Free Day */}
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground pt-1 border-t border-border/40">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                <span>Class Day</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground/30" />
                <span>Free Day</span>
              </span>
            </div>

            {/* Real Sessions on Selected Day (Displayed below the Calendar) */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-foreground">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {scheduledSessionsOnDay.length} Session{scheduledSessionsOnDay.length !== 1 ? "s" : ""}
                </span>
              </div>

              {scheduledSessionsOnDay.length === 0 ? (
                <div className="p-4 text-center space-y-1.5 border border-dashed border-border rounded-2xl bg-secondary/20">
                  <CalendarIcon className="size-5 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-bold text-foreground">
                    Free Day
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    No classes scheduled for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledSessionsOnDay.map((session, i) => {
                    const startTime = session.schedule?.regular?.startTime || "09:00";
                    const endTime = session.schedule?.regular?.endTime || "10:30";

                    return (
                      <div
                        key={session.id || i}
                        className="p-3 rounded-2xl border-l-4 border-primary border bg-secondary/50 text-primary transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                            {startTime} - {endTime}
                          </p>
                          <h4 className="text-xs sm:text-sm font-extrabold truncate text-foreground">
                            {session.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {session.subject || "General Subject"}
                          </p>
                        </div>
                        <Link
                          href={`/attendance?classId=${session.id}`}
                          className="size-7 rounded-xl bg-white/80 dark:bg-black/20 hover:bg-white text-primary flex items-center justify-center shrink-0 shadow-xs"
                          title="Mark Attendance"
                        >
                          <Laptop className="size-3.5" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
