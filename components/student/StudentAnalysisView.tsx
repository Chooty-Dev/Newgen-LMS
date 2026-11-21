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
      <section className="bg-sky-400/20 border border-blue-100/80 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] relative overflow-hidden">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#184880] tracking-tight leading-tight">
            How I&apos;m Doing
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Your strengths, growth areas, and tips to keep improving.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-xs transition-all print:hidden"
            >
              <Printer className="size-4 text-slate-600" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 shrink-0 z-10">
          <Image
            src="/images/bulb-on-books.webp"
            alt="Learning Insights"
            fill
            priority
            className="object-contain drop-shadow-sm"
            sizes="(max-width: 768px) 160px, 192px"
          />
        </div>
      </section>

      {/* 2. Overall Score Card */}
      <section className="relative overflow-hidden bg-gradient-to-br from-white via-white to-[#F0F6FF]/70 rounded-3xl p-6 sm:p-7 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)]">
        <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-blue-100/30 pointer-events-none blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          {/* Circular Progress Ring */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width="120" height="120" className="rotate-[-90deg]">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#E2E8F0"
                strokeWidth="11"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="#184880"
                strokeWidth="11"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight tabular-nums">
                {overallScoreVal}%
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#184880]">
                {stories.overall.groupLabel}
              </h3>
              <ScoreInfoDialog studentId={student.id} />
            </div>

            {lmsRank && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                {lmsRank === 1 ? (
                  <Crown className="size-5 text-yellow-500 fill-yellow-500 stroke-[2]" />
                ) : lmsRank === 2 ? (
                  <Medal className="size-5 text-slate-400 stroke-[2]" />
                ) : lmsRank === 3 ? (
                  <Medal className="size-5 text-amber-600 stroke-[2]" />
                ) : (
                  <Trophy className="size-4 text-slate-400 stroke-[2]" />
                )}
                <span className="font-bold text-sm text-slate-800">
                  #{lmsRank} in LMS
                </span>
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
              {dailyMessage || stories.overall.summary}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Story Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Story: Top Subject */}
        <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F0F6FF]/60 rounded-3xl p-5 sm:p-6 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] transition-all flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-[#184880] font-bold text-xs uppercase tracking-wider pb-1.5">
              <Award className="size-4" />
              <span>Strongest Area</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 pb-2">
              {stories.bestSubject.title}
            </h4>
            <div className="p-3.5 rounded-2xl bg-[#EBF3FE] border border-blue-100/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Top Subject
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {stories.bestSubject.subject}
                </span>
              </div>
              <span className="text-xl font-black text-[#184880] tabular-nums">
                {stories.bestSubject.score}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            {stories.bestSubject.message}
          </p>
        </div>

        {/* Story: Subject to Focus On */}
        <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#FFF9EE]/80 rounded-3xl p-5 sm:p-6 border border-amber-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] transition-all flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-[#184880] font-bold text-xs uppercase tracking-wider pb-1.5">
              <Target className="size-4" />
              <span>Opportunity to Grow</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 pb-2">
              {stories.worstSubject.title}
            </h4>
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  Focus Subject
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {stories.worstSubject.subject}
                </span>
              </div>
              <span className="text-xl font-black text-amber-700 tabular-nums">
                {stories.worstSubject.score}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            {stories.worstSubject.message}
          </p>
        </div>

        {/* Story: Attendance Habit */}
        <div className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F0F6FF]/60 rounded-3xl p-5 sm:p-6 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] transition-all flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-2 text-[#184880] font-bold text-xs uppercase tracking-wider pb-1.5">
              <Calendar className="size-4" />
              <span>Attendance</span>
            </div>
            <h4 className="text-base font-bold text-slate-900 pb-2">
              {stories.attendance.title}
            </h4>
            <AttendanceDots
              dots={stories.attendance.dots}
              attendedCount={Math.round((stories.attendance.percentage / 100) * 14)}
              totalCount={14}
            />
          </div>
          <p className="text-xs text-slate-600">
            {stories.attendance.message}
          </p>
        </div>
      </section>

      {/* 4. Score History Line Chart */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F0F6FF]/40 rounded-3xl p-6 sm:p-7 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] space-y-3">
        <div className="flex items-center gap-2 text-[#184880] font-bold text-xs uppercase tracking-wider">
          <TrendingUp className="size-4" />
          <span>Score Progression</span>
        </div>
        <h4 className="text-lg font-bold text-slate-900">
          Score History &amp; Trend
        </h4>
        <div className="pt-1">
          <ScoreHistoryLineChart studentId={student.id} height={260} />
        </div>
      </section>

      {/* 5. Subject Breakdown Bar Chart */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-[#F0F6FF]/40 rounded-3xl p-6 sm:p-7 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] space-y-3">
        <div className="flex items-center gap-2 text-[#184880] font-bold text-xs uppercase tracking-wider">
          <BookOpen className="size-4" />
          <span>Subject Comparison</span>
        </div>
        <h4 className="text-lg font-bold text-slate-900">
          {stories.subjects.title}
        </h4>
        <div className="h-64 pt-1">
          <SubjectBarChart data={barChartData} />
        </div>
      </section>

      {/* 6. Action Plan Checklist */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF3FE] to-[#DFEEFE] border border-blue-100/80 rounded-3xl p-6 sm:p-7 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] space-y-3">
        <h4 className="text-lg font-bold text-slate-900">
          {stories.actionPlan.title}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {stories.actionPlan.tasks.map((task, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-blue-100/60 shadow-xs"
            >
              <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                {task}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
