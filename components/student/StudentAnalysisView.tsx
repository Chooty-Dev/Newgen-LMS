"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BentoCard } from "./BentoCard";
import { ScoreRing } from "./ScoreRing";
import { AttendanceDots } from "./AttendanceDots";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { ScoreInfoDialog } from "@/components/shared/ScoreInfoDialog";
import { ScoreHistoryLineChart } from "@/components/charts/ScoreHistoryLineChart";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";
import {
  Printer,
  Award,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  CheckCircle2,
  Users,
  Lightbulb,
  BookOpen,
  Crown,
  Medal,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header with Round Print Button */}
      <div className="flex items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            How I&apos;m Doing
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Your personal learning story and tips to keep growing.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Print Report"
          className="print:hidden flex size-12 shrink-0 items-center justify-center rounded-full bg-card text-foreground border border-border shadow-sm hover:bg-muted hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Printer className="size-5 stroke-[2]" />
        </button>
      </div>

      {/* 2. Top Card: Score, Info Dialog, #N in LMS, Daily Message */}
      <BentoCard variant="hero" className="p-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative flex items-center justify-center">
              <ScoreRing score={score ?? stories.overall.score} label={stories.overall.groupLabel} />
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  {stories.overall.groupLabel}
                </h2>
                <ScoreInfoDialog studentId={student.id} />
              </div>

              {lmsRank && (
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-0.5">
                  {lmsRank === 1 ? (
                    <Crown className="size-6 text-yellow-600 dark:text-yellow-400 stroke-[2.2]" />
                  ) : lmsRank === 2 ? (
                    <Medal className="size-6 text-slate-600 dark:text-slate-300 stroke-[2.2]" />
                  ) : lmsRank === 3 ? (
                    <Medal className="size-6 text-amber-700 dark:text-amber-400 stroke-[2.2]" />
                  ) : (
                    <Trophy className="size-5 text-muted-foreground stroke-[2.2]" />
                  )}
                  <span
                    className={cn(
                      "font-black tracking-tight",
                      lmsRank === 1
                        ? "text-xl text-yellow-600 dark:text-yellow-400"
                        : lmsRank === 2
                        ? "text-xl text-slate-600 dark:text-slate-300"
                        : lmsRank === 3
                        ? "text-xl text-amber-700 dark:text-amber-400"
                        : "text-lg text-foreground"
                    )}
                  >
                    #{lmsRank} in LMS
                  </span>
                </div>
              )}

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
                {dailyMessage || stories.overall.summary}
              </p>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* 3. Story Cards Grid: 1 col on mobile, 6 on md, 12 on lg */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
        {/* Story 2: What am I best at? (6 cols on lg, 3 on md) */}
        <BentoCard variant="soft" className="md:col-span-3 lg:col-span-6 justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <Award className="size-5" />
              <span>Story 1</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-4">
              {stories.bestSubject.title}
            </h2>
            <div className="p-6 rounded-[2rem] bg-card border border-border flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-muted-foreground block">
                  Top Subject
                </span>
                <span className="text-2xl font-extrabold text-foreground">
                  {stories.bestSubject.subject}
                </span>
              </div>
              <div className="text-3xl font-extrabold text-primary tabular-nums">
                {stories.bestSubject.score}%
              </div>
            </div>
          </div>
          <p className="text-base text-muted-foreground pt-4">
            {stories.bestSubject.message}
          </p>
        </BentoCard>

        {/* Story 3: Where can I get better? (6 cols on lg, 3 on md) */}
        <BentoCard variant="soft" className="md:col-span-3 lg:col-span-6 justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <Target className="size-5" />
              <span>Story 2</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-4">
              {stories.worstSubject.title}
            </h2>
            <div className="p-6 rounded-[2rem] bg-card border border-border flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-muted-foreground block">
                  Subject to Focus On
                </span>
                <span className="text-2xl font-extrabold text-foreground">
                  {stories.worstSubject.subject}
                </span>
              </div>
              <div className="text-3xl font-extrabold text-foreground tabular-nums">
                {stories.worstSubject.score}%
              </div>
            </div>
          </div>
          <p className="text-base text-muted-foreground pt-4">
            {stories.worstSubject.message}
          </p>
        </BentoCard>

        {/* Story 4: How is my score calculated? (2-bar visual: Marks and Coming to class) */}
        <BentoCard variant="soft" className="md:col-span-6 lg:col-span-12">
          <div className="flex items-center justify-between pb-2">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
              <BarChart3 className="size-5" />
              <span>Story 3</span>
            </div>
            <ScoreInfoDialog studentId={student.id} />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground pb-4">
            {stories.scoreBreakdown.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {stories.scoreBreakdown.items.map((item) => (
              <div key={item.label} className="p-6 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg text-foreground">
                    {item.label}
                  </span>
                  <span className="font-extrabold text-2xl text-primary tabular-nums">
                    {item.score}%
                  </span>
                </div>
                <div className="h-4 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.max(5, item.score))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Contributes {item.weight}% to your total performance score.
                </p>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Story 5: Score History Line Chart with Segmented Filter (Last Week / Month / 3 Months) */}
        <BentoCard variant="soft" className="md:col-span-6 lg:col-span-12">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
            <TrendingUp className="size-5" />
            <span>Story 4</span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground pb-2">
            Score History & Trend
          </h2>
          <div className="pt-2">
            <ScoreHistoryLineChart studentId={student.id} height={260} />
          </div>
        </BentoCard>

        {/* Story 6: My subjects side by side (6 cols on lg, 3 on md) */}
        <BentoCard variant="soft" className="md:col-span-3 lg:col-span-6 justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <BookOpen className="size-5" />
              <span>Story 5</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-2">
              {stories.subjects.title}
            </h2>
            <div className="h-64 pt-2">
              <SubjectBarChart data={barChartData} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground pt-3">
            Comparison of your average percentage scores across each subject.
          </p>
        </BentoCard>

        {/* Story 7: Exams vs Regular Tests (6 cols on lg, 3 on md) */}
        <BentoCard variant="soft" className="md:col-span-3 lg:col-span-6 justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <Award className="size-5" />
              <span>Story 6</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-4">
              {stories.examsVsTests.title}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-card border border-border text-center">
                <span className="text-xs uppercase font-bold text-muted-foreground block">
                  Regular Tests
                </span>
                <span className="text-3xl md:text-4xl font-extrabold text-primary tabular-nums">
                  {stories.examsVsTests.regularAvg}%
                </span>
              </div>
              <div className="p-5 rounded-2xl bg-card border border-border text-center">
                <span className="text-xs uppercase font-bold text-muted-foreground block">
                  Major Exams
                </span>
                <span className="text-3xl md:text-4xl font-extrabold text-foreground tabular-nums">
                  {stories.examsVsTests.examAvg}%
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm md:text-base text-muted-foreground pt-4 leading-relaxed">
            {stories.examsVsTests.tip}
          </p>
        </BentoCard>

        {/* Story 8: Do I come to class? (4 cols on lg, 2 on md) */}
        <BentoCard variant="soft" className="md:col-span-2 lg:col-span-4 justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <Calendar className="size-5" />
              <span>Story 7</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-4">
              {stories.attendance.title}
            </h2>
            <AttendanceDots
              dots={stories.attendance.dots}
              attendedCount={Math.round((stories.attendance.percentage / 100) * 14)}
              totalCount={14}
            />
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            {stories.attendance.message}
          </p>
        </BentoCard>

        {/* Story 9: Leaderboard place card (4 cols on lg, 2 on md) */}
        <BentoCard variant="soft" className="md:col-span-2 lg:col-span-4 justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <Users className="size-5" />
              <span>Story 8</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-4">
              {stories.classStanding.title}
            </h2>
            <div className="p-6 rounded-[2rem] bg-card border border-border text-center space-y-1">
              <span className="text-2xl md:text-3xl font-extrabold text-primary">
                {stories.classStanding.label}
              </span>
              <p className="text-xs text-muted-foreground font-medium">
                Center standings
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            {stories.classStanding.message}
          </p>
        </BentoCard>

        {/* Story 10: What can I do next? (4 cols on lg, 2 on md) */}
        <BentoCard variant="soft" className="md:col-span-2 lg:col-span-4 justify-between bg-primary/5 border-primary/20">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider pb-2">
              <Lightbulb className="size-5" />
              <span>Story 9</span>
            </div>
            <h2 className="text-2xl font-extrabold text-foreground pb-4">
              {stories.actionPlan.title}
            </h2>
            <div className="space-y-3">
              {stories.actionPlan.tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border"
                >
                  <CheckCircle2 className="size-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-foreground">
                    {task}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-4 font-medium">
            Student: {student.name} • {student.admissionNo} • {student.grade}
          </p>
        </BentoCard>
      </div>
    </div>
  );
}
