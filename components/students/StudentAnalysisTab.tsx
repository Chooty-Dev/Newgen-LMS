"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Compass,
  Lightbulb,
  Lock,
  Printer,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataLoader } from "@/components/ui/data-loader";
import { ScoreHistoryLineChart } from "@/components/charts/ScoreHistoryLineChart";
import type { TeacherStudentInsightReport } from "@/modules/analysis/gemini-advisor";

interface TeacherInsightsApiResponse {
  student: {
    id: string;
    name: string;
    username: string;
    admissionNo: string;
    grade: string;
  };
  metrics: {
    overallScore: number;
    hasGradedScore: boolean;
    marksScore: number | null;
    attendanceScore: number | null;
    improvementScore: number;
    group: "weak" | "medium" | "excellent";
    groupLabel: string;
    attendanceBreakdown: {
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
      totalFinalized: number;
    };
    enrolledClassesCount: number;
    assessmentsCount: number;
  };
  subjectComparison: Array<{ subject: string; average: number; count: number }>;
  typeComparison: Array<{ type: string; average: number }>;
  insights: TeacherStudentInsightReport;
  refreshMeta?: {
    servedFromCacheDb: boolean;
    hasNewData: boolean;
    lastGeneratedAt: string;
    quota: {
      limit: number;
      used: number;
      remaining: number;
      isLocked: boolean;
      unlocksAt: string | null;
    };
  };
}

function formatCountdown(unlocksAt: string | null, nowMs: number | null): string {
  if (!unlocksAt || nowMs === null) return "24h";
  const diffMs = Math.max(0, new Date(unlocksAt).getTime() - nowMs);
  if (diffMs === 0) return "Soon";
  const totalMinutes = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function StudentAnalysisTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [confirmStage, setConfirmStage] = React.useState<"yellow" | "red" | null>(null);
  const [nowMs, setNowMs] = React.useState<number | null>(null);

  React.useEffect(() => {
    const initTimer = window.setTimeout(() => {
      setNowMs(Date.now());
    }, 0);
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(interval);
    };
  }, []);

  const { data, isLoading, error } = useQuery<{ data: TeacherInsightsApiResponse }>({
    queryKey: ["student-teacher-insights", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/students/${studentId}/teacher-insights`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to analyze student profile");
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000,
  });

  const runRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/v1/students/${studentId}/teacher-insights?refresh=1`);
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = json?.error?.message || "Failed to refresh analysis";
        if (res.status === 429) {
          toast.error(msg);
          queryClient.setQueryData<{ data: TeacherInsightsApiResponse }>(
            ["student-teacher-insights", studentId],
            (prev) => {
              if (!prev?.data) return prev;
              const fallbackQuota = json?.error?.quota ?? {
                limit: 3,
                used: 3,
                remaining: 0,
                isLocked: true,
                unlocksAt: json?.error?.unlocksAt ?? prev.data.refreshMeta?.quota.unlocksAt ?? null,
              };
              return {
                data: {
                  ...prev.data,
                  refreshMeta: {
                    servedFromCacheDb: prev.data.refreshMeta?.servedFromCacheDb ?? true,
                    hasNewData: prev.data.refreshMeta?.hasNewData ?? false,
                    lastGeneratedAt: prev.data.refreshMeta?.lastGeneratedAt ?? "",
                    quota: fallbackQuota,
                  },
                },
              };
            }
          );
          await queryClient.invalidateQueries({
            queryKey: ["student-teacher-insights"],
          });
        } else {
          toast.error(msg);
        }
        return;
      }
      queryClient.setQueryData(["student-teacher-insights", studentId], json);
      queryClient.invalidateQueries({
        queryKey: ["student-teacher-insights"],
        predicate: (query) => query.queryKey[1] !== studentId,
      });
      toast.success("Analysis updated");
    } catch {
      toast.error("Failed to refresh analysis");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <DataLoader
        text="Analyzing attendance, marks, and performance trajectory..."
        minHeight="min-h-[300px]"
      />
    );
  }

  if (error || !data?.data) {
    return (
      <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-10 text-center space-y-2">
        <AlertTriangle className="size-10 mx-auto text-amber-600" />
        <p className="text-sm font-extrabold text-[#0F172A]">Analysis Unavailable</p>
        <p className="text-xs text-[#627D98]">
          {error instanceof Error ? error.message : "Could not generate student analysis."}
        </p>
      </div>
    );
  }

  const { metrics, subjectComparison, typeComparison, insights, refreshMeta } = data.data;
  const att = metrics.attendanceBreakdown;

  const quota = refreshMeta?.quota ?? {
    limit: 3,
    used: 0,
    remaining: 3,
    isLocked: false,
    unlocksAt: null,
  };
  const hasNewData = refreshMeta?.hasNewData ?? false;
  const unlocksAtMs = quota.unlocksAt ? new Date(quota.unlocksAt).getTime() : null;
  const countdownExpired =
    quota.isLocked && nowMs !== null && unlocksAtMs !== null && unlocksAtMs <= nowMs;
  const effectiveLocked = quota.isLocked && !countdownExpired;
  const effectiveUsed = countdownExpired ? 0 : quota.used;
  const effectiveRemaining = countdownExpired ? quota.limit : quota.remaining;

  const handleRefreshClick = () => {
    if (effectiveLocked) {
      toast.error(
        `All 3 refresh chances used. Locked for your session & IP until ${formatCountdown(quota.unlocksAt, nowMs)}.`
      );
      return;
    }

    if (effectiveUsed === 1) {
      setConfirmStage("yellow");
      return;
    }

    if (effectiveUsed >= 2) {
      setConfirmStage("red");
      return;
    }

    void runRefresh();
  };

  const refreshButtonStyle = effectiveLocked
    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50 hover:text-rose-700 opacity-85 cursor-not-allowed"
    : effectiveUsed >= 2
      ? "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:text-white"
      : effectiveUsed === 1
        ? "bg-amber-400 text-[#0F172A] border-amber-500 hover:bg-amber-500 hover:text-[#0F172A]"
        : "bg-white text-[#184880] border-[#DDE8F8] hover:bg-[#EBF3FE] hover:text-[#184880]";

  const refreshButtonLabel = isRefreshing
    ? "Updating..."
    : effectiveLocked
      ? `Locked (${formatCountdown(quota.unlocksAt, nowMs)})`
      : effectiveUsed >= 2
        ? `Last Refresh (${effectiveRemaining} left)`
        : `Refresh (${effectiveRemaining} left)`;

  const trajectoryUi =
    insights.futureOutlook.trajectory === "rising"
      ? { label: "Getting Better", icon: TrendingUp }
      : insights.futureOutlook.trajectory === "at_risk"
      ? { label: "Needs Extra Help", icon: TrendingDown }
      : { label: "Doing Steady", icon: Compass };
  const TrajectoryIcon = trajectoryUi.icon;

  return (
    <>
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Top Insight Header Bar */}
        <section className="bg-white border border-[#DDE8F8] rounded-[26px] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8]">
                <Sparkles className="size-3.5" />
                <span>
                  {insights.source === "gemini" ? "AI Summary" : "Smart Summary"}
                </span>
              </span>
              <span className="text-[11px] font-semibold text-[#627D98]">
                Based on {metrics.assessmentsCount} test(s) & {att.totalFinalized} class days
              </span>
              {hasNewData ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8]">
                  New data ready
                </span>
              ) : insights.source === "gemini" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F4F8FD] text-[#627D98] border border-[#DDE8F8]">
                  Saved · Up to date
                </span>
              ) : null}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#0F172A] leading-snug">
              {insights.headline}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0 no-print">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshClick}
              disabled={isRefreshing || effectiveLocked}
              title={
                effectiveLocked
                  ? `All 3 chances used. Unlocks in ${formatCountdown(quota.unlocksAt, nowMs)}.`
                  : `${effectiveRemaining} of ${quota.limit} refreshes left for your session & IP (24h).`
              }
              className={cn(
                "rounded-full h-9 px-4 text-xs font-bold border gap-1.5 transition-colors",
                refreshButtonStyle
              )}
            >
              {effectiveLocked ? (
                <Lock className="size-3.5" />
              ) : (
                <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
              )}
              <span>{refreshButtonLabel}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-full h-9 px-4 text-xs font-bold border-[#DDE8F8] gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </section>

      {/* Row 1: What Comes Next (Solid #184880) + Marks & Attendance Simple Cards */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 bg-[#184880] text-white rounded-[26px] p-6 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold">
                <TrajectoryIcon className="size-3.5" />
                <span>{trajectoryUi.label}</span>
              </span>
              <span className="text-xs font-bold text-white/80 tabular-nums">
                Goal ~{insights.futureOutlook.targetScoreEstimate}%
              </span>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-white/75">
                What Comes Next
              </p>
              <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed mt-1">
                {insights.futureOutlook.prediction}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
            <span className="text-white/80 font-semibold">Right Now</span>
            <span className="font-black tabular-nums">
              {metrics.hasGradedScore ? `${metrics.overallScore}% (${metrics.groupLabel})` : metrics.groupLabel}
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#DDE8F8] rounded-[26px] p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#627D98]">
                <Award className="size-4 text-[#184880]" />
                <span>Marks Check</span>
              </span>
              <span className="text-lg font-black text-[#184880] tabular-nums">
                {metrics.marksScore !== null ? `${metrics.marksScore}%` : "—"}
              </span>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed font-medium">
              {insights.marksInsight}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-[#DDE8F8]">
            {typeComparison.length === 0 ? (
              <span className="text-[11px] text-[#627D98]">No marks yet</span>
            ) : (
              typeComparison.map((t) => (
                <span
                  key={t.type}
                  className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F4F8FD] text-[#184880] border border-[#DDE8F8] tabular-nums"
                >
                  {t.type}: {t.average}%
                </span>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#DDE8F8] rounded-[26px] p-6 flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#627D98]">
                <UserCheck className="size-4 text-[#184880]" />
                <span>Attendance Check</span>
              </span>
              <span className="text-lg font-black text-[#184880] tabular-nums">
                {metrics.attendanceScore !== null ? `${metrics.attendanceScore}%` : "—"}
              </span>
            </div>
            <p className="text-xs text-[#0F172A] leading-relaxed font-medium">
              {insights.attendanceInsight}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#DDE8F8] text-center text-[11px]">
            <div className="p-1.5 rounded-xl bg-[#F4F8FD]">
              <span className="font-black text-[#0F172A] block tabular-nums">{att.presentCount}</span>
              <span className="text-[#627D98]">Present</span>
            </div>
            <div className="p-1.5 rounded-xl bg-[#F4F8FD]">
              <span className="font-black text-amber-700 block tabular-nums">{att.lateCount}</span>
              <span className="text-[#627D98]">Late</span>
            </div>
            <div className="p-1.5 rounded-xl bg-[#F4F8FD]">
              <span className="font-black text-rose-700 block tabular-nums">{att.absentCount}</span>
              <span className="text-[#627D98]">Absent</span>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Plus Points, Weak Points, What to Do Next */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#DDE8F8]">
            <div className="size-7 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="size-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">Good Points</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.plusPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#0F172A] leading-relaxed">
                <span className="size-1.5 rounded-full bg-emerald-600 shrink-0 mt-1.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#DDE8F8]">
            <div className="size-7 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="size-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">Weak Points</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.weakPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#0F172A] leading-relaxed">
                <span className="size-1.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#F4F8FD] border border-[#DDE8F8] rounded-[26px] p-6 space-y-3.5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-[#DDE8F8]">
            <div className="size-7 rounded-xl bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8] flex items-center justify-center">
              <Lightbulb className="size-4" />
            </div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">What to Do Next</h3>
          </div>
          <ul className="space-y-2.5">
            {insights.howToImproveOrSustain.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-[#0F172A] leading-relaxed">
                <span className="text-[11px] font-black text-[#184880] shrink-0 mt-0.2">
                  {idx + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Row 3: Subject Mastery + Score History Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DDE8F8]">
            <h3 className="text-sm font-extrabold text-[#0F172A]">Subject Breakdown</h3>
            <span className="text-xs font-semibold text-[#627D98]">Average %</span>
          </div>
          {subjectComparison.length === 0 ? (
            <p className="text-xs text-[#627D98] py-8 text-center">No graded subjects yet.</p>
          ) : (
            <div className="space-y-3.5">
              {subjectComparison.map((sub) => (
                <div key={sub.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#0F172A]">
                      {sub.subject}{" "}
                      <span className="text-[#627D98] font-medium">({sub.count})</span>
                    </span>
                    <span className="text-[#184880] tabular-nums">{sub.average}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#EBF3FE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#184880] rounded-full"
                      style={{ width: `${Math.min(100, sub.average)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-[#DDE8F8] rounded-[26px] p-6">
          <ScoreHistoryLineChart studentId={studentId} height={220} />
        </div>
      </section>
      </div>

      <ConfirmDialog
        open={confirmStage === "yellow"}
        onOpenChange={(open) => {
          if (!open) setConfirmStage(null);
        }}
        title="Warning: Only 2 Refreshes Left Today"
        description="You only have 2 refresh chances left for your account and IP in the next 24 hours. Are you sure you want to use one now?"
        confirmLabel="Yes, Refresh Now"
        cancelLabel="Cancel"
        isDestructive={false}
        onConfirm={runRefresh}
      />

      <ConfirmDialog
        open={confirmStage === "red"}
        onOpenChange={(open) => {
          if (!open) setConfirmStage(null);
        }}
        title="Final Warning: All 3 Chances Will Finish"
        description="If you use this refresh, all 3 chances for your logged-in session and IP will finish and AI Refresh will stay locked for 24 hours before unlocking again. Do you want to continue?"
        confirmLabel="Yes, Use Final Refresh"
        cancelLabel="Keep Saved Report"
        isDestructive={true}
        onConfirm={runRefresh}
      />
    </>
  );
}
