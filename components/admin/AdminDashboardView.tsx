"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  UserCheck,
  School,
  SlidersHorizontal,
  MoreVertical,
  ArrowUpRight,
  Star,
  BookOpen,
  ClipboardList,
  Activity,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminSectionHeader,
  AdminStatusPill,
  AdminSurface,
} from "./AdminUI";

interface AdminDashResponse {
  data: {
    stats: {
      totalStudents: number;
      totalTeachers: number;
      classesToday: number;
      marksWaiting: number;
      staffCount: number;
      centersCount: number;
      examsCount: number;
      averageScore: number;
      attendanceRateToday: number;
      expectedToday: number;
      attendedToday: number;
    };
    treemapData: Array<{ name: string; size: number; count: number }>;
    trendData: Array<{ period: string; score: number }>;
    classBreakdown: Array<{
      id: string;
      slug: string;
      name: string;
      subject: string;
      teacher: string;
      enrolledCount: number;
      capacity: number;
      occupancy: number;
      status: string;
    }>;
    assessmentBreakdown: Array<{
      id: string;
      slug: string;
      title: string;
      type: string;
      subject: string;
      totalMarks: number;
      status: string;
      date: string;
    }>;
    recentActivities: Array<{
      id: string;
      actorName: string;
      summary: string;
      result: string;
      time: string;
    }>;
  };
}

export function AdminDashboardView() {
  const { user } = useAuth();
  const [rangeLimit, setRangeLimit] = React.useState<"4" | "8" | "all">("all");
  const [tableScope, setTableScope] = React.useState<"classes" | "assessments" | "activity">("classes");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active">("all");

  const { data: dashRes, isLoading } = useQuery<AdminDashResponse>({
    queryKey: ["dashboard", "admin", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/dashboard");
      if (!res.ok) throw new Error("Failed to load overview");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="lg:col-span-5 h-60 rounded-[24px]" />
          <div className="lg:col-span-7 grid grid-cols-3 gap-3.5">
            <Skeleton className="h-60 rounded-[24px]" />
            <Skeleton className="h-60 rounded-[24px]" />
            <Skeleton className="h-60 rounded-[24px]" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="lg:col-span-8 h-72 rounded-[24px]" />
          <Skeleton className="lg:col-span-4 h-72 rounded-[24px]" />
        </div>
      </div>
    );
  }

  const data = dashRes?.data;
  const stats = data?.stats;
  const allTrend = data?.trendData || [];
  const slicedTrend =
    rangeLimit === "4"
      ? allTrend.slice(-4)
      : rangeLimit === "8"
        ? allTrend.slice(-8)
        : allTrend;

  const latestPoint = slicedTrend[slicedTrend.length - 1];
  const displayHeadlineScore = stats?.averageScore || latestPoint?.score || 0;

  const classes = (data?.classBreakdown || []).filter((c) =>
    statusFilter === "active" ? c.status === "active" : true
  );
  const assessments = (data?.assessmentBreakdown || []).filter((a) =>
    statusFilter === "active" ? a.status !== "completed" : true
  );
  const activities = data?.recentActivities || [];

  const isSuperAdmin = user?.role === "super_admin";

  return (
    <div className="space-y-7 animate-in fade-in duration-200">
      {/* =====================================================================
          ROW 1: PORTFOLIO-STYLE PERFORMANCE CHART + 3 ASSET METRIC TILES
         ===================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Performance Sparkline Card */}
        <div className="lg:col-span-5">
          <AdminSectionHeader title="Performance" />
          <AdminSurface tinted className="p-5 sm:p-6 relative overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-3xl font-bold tracking-tight text-[var(--foreground)] tabular-nums">
                  {displayHeadlineScore}%
                </p>
                <p className="text-xs font-medium text-[var(--muted-foreground)] mt-0.5">
                  Center average
                </p>
              </div>
              <Link
                href="/analysis"
                className="size-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/70 transition-colors"
                title="View Analysis"
              >
                <MoreVertical className="size-4" />
              </Link>
            </div>

            {/* Clean Sparkline Chart (Flat fill, NO gradients) */}
            <div className="h-32 w-full mt-3 relative">
              {slicedTrend.length > 0 ? (
                <>
                  {latestPoint && (
                    <div className="absolute right-3 top-1 z-10 px-2.5 py-1 rounded-full bg-[var(--foreground)] text-white text-[11px] font-bold shadow-xs tabular-nums">
                      {latestPoint.score} pts
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={slicedTrend} margin={{ top: 18, right: 6, left: 6, bottom: 0 }}>
                      <XAxis dataKey="period" hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "none",
                          borderRadius: "9999px",
                          color: "#FFFFFF",
                          fontSize: "11px",
                          padding: "4px 10px",
                        }}
                        itemStyle={{ color: "#FFFFFF" }}
                        labelStyle={{ display: "none" }}
                        formatter={(val: unknown) => [`${val}%`, "Avg"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="var(--accent)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-medium text-[var(--muted-foreground)]">
                  No evaluation data yet
                </div>
              )}
            </div>

            {/* Bottom Period Switcher (matches 1H 24H 1W 1M 1Y ALL) */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--admin-border)]/70">
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "4", label: "4P" },
                    { id: "8", label: "8P" },
                    { id: "all", label: "ALL" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRangeLimit(item.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer",
                      rangeLimit === item.id
                        ? "bg-[var(--primary)] text-white"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
                {stats?.attendanceRateToday ?? 0}% attendance today
              </span>
            </div>
          </AdminSurface>
        </div>

        {/* Right: 3 Minimal Tinted Asset Tiles */}
        <div className="lg:col-span-7">
          <AdminSectionHeader
            title={isSuperAdmin ? "System Assets" : "Center Assets"}
            action={
              <Link
                href="/system-settings"
                className="size-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--admin-surface)] transition-colors"
                title="System Settings"
              >
                <SlidersHorizontal className="size-4" />
              </Link>
            }
          />
          <AdminAssetTiles
            columns={3}
            className="[&>a>div]:min-h-[214px] [&>div>div]:min-h-[214px]"
            items={[
              {
                label: "Students",
                value: stats?.totalStudents ?? 0,
                icon: Users,
                badge: `${stats?.attendedToday ?? 0} present today`,
                href: "/students",
                tone: 1,
              },
              {
                label: "Teachers",
                value: stats?.totalTeachers ?? 0,
                icon: UserCheck,
                badge: `${stats?.staffCount ?? 0} staff`,
                href: "/teachers",
                tone: 2,
              },
              {
                label: "Active Classes",
                value: stats?.classesToday ?? 0,
                icon: School,
                badge: `${stats?.marksWaiting ?? 0} drafts`,
                href: "/classes",
                tone: 3,
              },
            ]}
          />
        </div>
      </section>

      {/* =====================================================================
          ROW 2: REAL SUMMARY TABLE + HIGHLIGHT GOVERNANCE CARD
         ===================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Bottom-Left: Minimal 5-column Table */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
              {tableScope === "classes"
                ? `${stats?.classesToday ?? 0} active batches`
                : tableScope === "assessments"
                  ? `${stats?.examsCount ?? 0} total assessments`
                  : `${activities.length} recent events`}
            </h2>

            <div className="flex items-center gap-2">
              <AdminFilterSelect
                value={tableScope}
                onChange={(v) => setTableScope(v as "classes" | "assessments" | "activity")}
              >
                <option value="classes">Classes</option>
                <option value="assessments">Exams & Tests</option>
                <option value="activity">Recent Logs</option>
              </AdminFilterSelect>

              {tableScope !== "activity" && (
                <AdminFilterSelect
                  value={statusFilter}
                  onChange={(v) => setStatusFilter(v as "all" | "active")}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                </AdminFilterSelect>
              )}
            </div>
          </div>

          <AdminSurface className="overflow-hidden flex-1">
            <div className="overflow-x-auto">
              {tableScope === "classes" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-semibold text-[var(--muted-foreground)]">
                      <th className="py-3.5 px-5">Class</th>
                      <th className="py-3.5 px-4">Enrolled</th>
                      <th className="py-3.5 px-4">Fill Rate</th>
                      <th className="py-3.5 px-4">Teacher</th>
                      <th className="py-3.5 px-5 text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]/60 text-xs">
                    {classes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[var(--muted-foreground)]">
                          No classes found.
                        </td>
                      </tr>
                    ) : (
                      classes.map((cls) => (
                        <tr
                          key={cls.id}
                          className="hover:bg-[var(--admin-surface)]/70 transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
                                <BookOpen className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[var(--foreground)] truncate">
                                  {cls.name}
                                </p>
                                <p className="text-[11px] text-[var(--muted-foreground)] uppercase">
                                  {cls.subject}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold tabular-nums">
                            {cls.enrolledCount} / {cls.capacity}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[var(--primary)] tabular-nums">
                            {cls.occupancy}%
                          </td>
                          <td className="py-3.5 px-4 text-[var(--muted-foreground)] font-medium truncate max-w-[140px]">
                            {cls.teacher}
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <Link
                              href={`/classes/${cls.slug}`}
                              className="inline-flex size-8 rounded-full items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--secondary)] transition-colors"
                            >
                              <Star className="size-4" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tableScope === "assessments" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-semibold text-[var(--muted-foreground)]">
                      <th className="py-3.5 px-5">Assessment</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Marks</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-5 text-right">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]/60 text-xs">
                    {assessments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-[var(--muted-foreground)]">
                          No assessments scheduled.
                        </td>
                      </tr>
                    ) : (
                      assessments.map((asm) => (
                        <tr
                          key={asm.id}
                          className="hover:bg-[var(--admin-surface)]/70 transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
                                <ClipboardList className="size-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[var(--foreground)] truncate">
                                  {asm.title}
                                </p>
                                <p className="text-[11px] text-[var(--muted-foreground)]">
                                  {asm.subject}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold uppercase text-[11px] text-[var(--muted-foreground)]">
                            {asm.type.replace(/_/g, " ")}
                          </td>
                          <td className="py-3.5 px-4 font-bold tabular-nums">{asm.totalMarks}</td>
                          <td className="py-3.5 px-4">
                            <AdminStatusPill label={asm.status.replace(/_/g, " ")} />
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <Link
                              href={`/exams/${asm.slug}`}
                              className="inline-flex size-8 rounded-full items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--secondary)] transition-colors"
                            >
                              <ArrowUpRight className="size-4" />
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {tableScope === "activity" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[11px] font-semibold text-[var(--muted-foreground)]">
                      <th className="py-3.5 px-5">Event</th>
                      <th className="py-3.5 px-4">Actor</th>
                      <th className="py-3.5 px-4">Result</th>
                      <th className="py-3.5 px-5 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]/60 text-xs">
                    {activities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center text-[var(--muted-foreground)]">
                          No recent logs.
                        </td>
                      </tr>
                    ) : (
                      activities.map((act) => (
                        <tr
                          key={act.id}
                          className="hover:bg-[var(--admin-surface)]/70 transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-xl bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center shrink-0">
                                <Activity className="size-4" />
                              </div>
                              <p className="font-semibold text-[var(--foreground)] line-clamp-1">
                                {act.summary}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-[var(--muted-foreground)] font-medium">
                            {act.actorName}
                          </td>
                          <td className="py-3.5 px-4">
                            <AdminStatusPill
                              label={act.result}
                              tone={act.result === "success" ? "primary" : "danger"}
                            />
                          </td>
                          <td className="py-3.5 px-5 text-right text-[var(--muted-foreground)] tabular-nums">
                            {act.time}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </AdminSurface>
        </div>

        {/* Bottom-Right: Deep Navy Highlight Action Card (Zero Gradients) */}
        <div className="lg:col-span-4 rounded-[24px] bg-[var(--admin-highlight)] text-[var(--admin-highlight-fg)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden min-h-[260px]">
          {/* Subtle crisp border geometric line accent (solid color, zero gradient) */}
          <div className="pointer-events-none absolute -right-10 -bottom-10 size-44 rounded-3xl border border-white/15 rotate-12" />
          <div className="pointer-events-none absolute -right-4 -bottom-14 size-36 rounded-3xl border border-white/10 -rotate-6" />

          <div className="relative z-10 space-y-3">
            <h3 className="text-xl sm:text-2xl font-bold leading-snug tracking-tight">
              {isSuperAdmin ? (
                <>
                  Manage{" "}
                  <span className="inline-block px-2.5 py-0.5 rounded-lg border border-white/40 text-sm font-semibold align-middle">
                    System
                  </span>{" "}
                  Access & Centers
                </>
              ) : (
                <>
                  Manage{" "}
                  <span className="inline-block px-2.5 py-0.5 rounded-lg border border-white/40 text-sm font-semibold align-middle">
                    Center
                  </span>{" "}
                  Classes & Exams
                </>
              )}
            </h3>

            <p className="text-xs text-white/75 leading-relaxed max-w-[240px]">
              {isSuperAdmin
                ? `${stats?.centersCount ?? 0} centers online. Review audit logs and role permissions.`
                : `${stats?.marksWaiting ?? 0} draft marks waiting. Track batches and attendance.`}
            </p>
          </div>

          <div className="relative z-10 pt-6">
            <Link
              href={isSuperAdmin ? "/audit-trail" : "/classes"}
              className="inline-flex items-center justify-center px-6 h-10 rounded-full bg-[var(--secondary)] text-[var(--primary)] hover:bg-white font-bold text-xs transition-colors shadow-xs"
            >
              {isSuperAdmin ? "Open Audit Trail" : "Manage Classes"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
