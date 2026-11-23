"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { ScoreInfoDialog } from "@/components/shared/ScoreInfoDialog";
import { ScoreHistoryLineChart } from "@/components/charts/ScoreHistoryLineChart";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";
import { AttendanceDots } from "./AttendanceDots";
import {
  Printer,
  Award,
  TrendingUp,
  Target,
  Calendar,
  CheckCircle2,
  Lightbulb,
  BookOpen,
  Crown,
  Medal,
  Trophy,
  Sparkles,
} from "lucide-react";

interface AnalysisStories {
  student: {
    id: string;
    name: string;
    admissionNo: string;
    grade: string;
  };
  score: number | null;
  lmsRank?: number | null;
  dailyMessage?: string;
  stories: {
    overall: {
      title: string;
      score: number;
      groupLabel: string;
      summary: string;
    };
    bestSubject: {
      title: string;
      subject: string;
      score: number;
      message: string;
    };
    worstSubject: {
      title: string;
      subject: string;
      score: number;
      message: string;
    };
    scoreBreakdown: {
      title: string;
      items: Array<{ label: string; score: number; weight: number }>;
    };
    trend: {
      title: string;
      points: Array<{ testName: string; score: number; date: string }>;
      summary: string;
    };
    subjects: {
      title: string;
      list: Array<{ name: string; average: number; count: number }>;
    };
    examsVsTests: {
      title: string;
      examAvg: number;
      regularAvg: number;
      tip: string;
    };
    attendance: {
      title: string;
      percentage: number;
      dots: Array<{ date: string; status: string }>;
      message: string;
    };
    classStanding: {
      title: string;
      label: string;
      message: string;
    };
    actionPlan: {
      title: string;
      tasks: string[];
    };
  };
}

export function StudentAnalysisView() {
  const { data, isLoading } = useQuery<{ data: AnalysisStories }>({
    queryKey: ["student-analysis"],
    queryFn: async () => {
      const res = await fetch("/api/v1/student/analysis");
      if (!res.ok) throw new Error("Failed to load analysis stories");
      return res.json();
    },
  });

  if (isLoading || !data?.data) {
    return <FriendlySkeletons />;
  }

  const { stories, student, score, lmsRank, dailyMessage } = data.data;

  // Prepare chart formats
  const barChartData = stories.subjects.list.map((s) => ({
    subject: s.name,
    average: s.average,
  }));

  const overallScoreVal = score ?? stories.overall.score ?? 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, overallScoreVal)) / 100) * circumference;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <section className="bg-secondary border border-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] relative overflow-hidden min-h-[220px]">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
            How I&apos;m Doing
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Your strengths, growth areas, and tips to keep improving.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-card border border-border text-foreground hover:bg-secondary font-semibold text-xs shadow-xs transition-all print:hidden"
            >
              <Printer className="size-4 text-primary" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="relative w-full h-44 sm:h-52 md:h-full md:absolute md:right-4 md:top-0 md:bottom-0 md:w-56 lg:w-64 flex items-center justify-center md:justify-end shrink-0 z-10">
          <Image
            src="/images/bulb-on-books.webp"
            alt="Learning Insights"
            fill
            priority
            className="object-contain w-full h-full drop-shadow-sm"
            sizes="(max-width: 768px) 100vw, 256px"
          />
        </div>
      </section>

      {/* 2. Overall Score Card */}
      <section className="relative overflow-hidden bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)]">
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Circular Progress Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="120" height="120" className="rotate-[-90deg]">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="currentColor"
                strokeWidth="11"
                fill="transparent"
                className="text-border"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="currentColor"
                strokeWidth="11"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="text-primary transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight tabular-nums">
                {overallScoreVal}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-primary">
                {stories.overall.groupLabel}
              </h3>
              <ScoreInfoDialog studentId={student.id} />
            </div>

            {lmsRank && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                {lmsRank === 1 ? (
                  <Crown className="size-5 text-amber-500 fill-amber-500 stroke-[2]" />
                ) : lmsRank === 2 ? (
                  <Medal className="size-5 text-slate-400 stroke-[2]" />
                ) : lmsRank === 3 ? (
                  <Medal className="size-5 text-amber-600 stroke-[2]" />
                ) : (
                  <Trophy className="size-4 text-muted-foreground stroke-[2]" />
                )}
                <span className="font-bold text-sm text-foreground">
                  #{lmsRank} in LMS
                </span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              {dailyMessage || stories.overall.summary}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Story Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Story: Top Subject */}
        <div className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider pb-1.5">
              <Award className="size-4" />
              <span>Strongest Area</span>
            </div>
            <h4 className="text-base font-bold text-foreground pb-2">
              {stories.bestSubject.title}
            </h4>
            <div className="p-3.5 rounded-2xl bg-secondary border border-border flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  Top Subject
                </span>
                <span className="text-sm font-bold text-foreground">
                  {stories.bestSubject.subject}
                </span>
              </div>
              <span className="text-xl font-black text-primary tabular-nums">
                {stories.bestSubject.score}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {stories.bestSubject.message}
          </p>
        </div>

        {/* Story: Subject to Focus On */}
        <div className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider pb-1.5">
              <Target className="size-4" />
              <span>Opportunity to Grow</span>
            </div>
            <h4 className="text-base font-bold text-foreground pb-2">
              {stories.worstSubject.title}
            </h4>
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground block">
                  Focus Subject
                </span>
                <span className="text-sm font-bold text-foreground">
                  {stories.worstSubject.subject}
                </span>
              </div>
              <span className="text-xl font-black text-amber-700 tabular-nums">
                {stories.worstSubject.score}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {stories.worstSubject.message}
          </p>
        </div>

        {/* Story: Attendance Habit */}
        <div className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider pb-1.5">
              <Calendar className="size-4" />
              <span>Attendance</span>
            </div>
            <h4 className="text-base font-bold text-foreground pb-2">
              {stories.attendance.title}
            </h4>
            <AttendanceDots
              dots={stories.attendance.dots}
              attendedCount={Math.round((stories.attendance.percentage / 100) * 14)}
              totalCount={14}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {stories.attendance.message}
          </p>
        </div>
      </section>

      {/* 4. Score History Line Chart */}
      <section className="relative overflow-hidden bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <TrendingUp className="size-4" />
          <span>Score Progression</span>
        </div>
        <h4 className="text-lg font-bold text-foreground">
          Score History &amp; Trend
        </h4>
        <div className="pt-1">
          <ScoreHistoryLineChart studentId={student.id} height={260} />
        </div>
      </section>

      {/* 5. Subject Breakdown Bar Chart */}
      <section className="relative overflow-hidden bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-3">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <BookOpen className="size-4" />
          <span>Subject Comparison</span>
        </div>
        <h4 className="text-lg font-bold text-foreground">
          {stories.subjects.title}
        </h4>
        <div className="h-64 pt-1">
          <SubjectBarChart data={barChartData} />
        </div>
      </section>

      {/* 6. Action Plan Checklist */}
      <section className="relative overflow-hidden bg-secondary border border-border rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-3">
        <h4 className="text-lg font-bold text-foreground">
          {stories.actionPlan.title}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {stories.actionPlan.tasks.map((task, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border shadow-xs"
            >
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                {task}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
