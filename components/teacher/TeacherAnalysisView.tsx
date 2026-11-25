"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  TrendingUp,
  Award,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Search,
  Sparkles,
  ArrowRight,
  BookOpen,
  Users,
  Target,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataLoader } from "@/components/ui/data-loader";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";

interface StudentAnalysisData {
  student: {
    id: string;
    name: string;
    username: string;
    admissionNo: string;
    grade: string;
    joinedAt: string;
  };
  score: number;
  group: "weak" | "medium" | "excellent";
  groupLabel: string;
  scoreBreakdown: {
    marksScore: number;
    attendanceScore: number;
    improvementScore: number;
  };
  explanation: {
    overallSummary: string;
    primaryReasons: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  bestSubject: string;
  worstSubject: string;
  subjectComparison: Array<{ subject: string; average: number; count: number }>;
  trendData: Array<{ period: string; score: number; marks?: number; attendance?: number }>;
}

export function TeacherAnalysisView() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlStudentId = searchParams.get("studentId");

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [studentSearch, setStudentSearch] = React.useState<string>("");

  // Fetch teacher classes for filter
  const { data: classesData } = useQuery({
    queryKey: ["classes", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });
  const classesList: Array<{ id: string; name: string }> = classesData?.data || [];

  // Fetch list of students
  const { data: studentsData, isLoading: loadingStudents } = useQuery<{
    data: Array<{ id: string; name: string; username: string; grade?: string; group?: string }>;
  }>({
    queryKey: ["students", "list", user?.centerId, selectedClassId, groupFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "150" });
      if (selectedClassId) params.append("classId", selectedClassId);
      if (groupFilter !== "all") params.append("group", groupFilter);
      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const students = studentsData?.data || [];
  const activeStudentId =
    selectedStudentId || urlStudentId || (students.length > 0 ? students[0].id : "");

  // Fetch selected student's analysis
  const { data: analysisData, isLoading: loadingAnalysis } = useQuery<{
    data: StudentAnalysisData;
  }>({
    queryKey: ["analysis", "student", activeStudentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analysis/student/${activeStudentId}`);
      if (!res.ok) throw new Error("Failed to load student analysis");
      return res.json();
    },
    enabled: !!activeStudentId,
  });

  const analysis = analysisData?.data;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + Quick Controls / Summary (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[240px] flex flex-col justify-between">
          <div className="relative z-10 max-w-md sm:max-w-lg space-y-3.5">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white/95 text-[11px] font-bold tracking-wider uppercase mb-2 backdrop-blur-xs">
                <Sparkles className="size-3 text-amber-300" />
                <span>Performance Intelligence</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Student Analysis
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
              Evaluate real-time student trajectories, diagnosis breakdown (75% marks weight, 25% attendance), subject-level strengths, and personalized recommendations for targeted academic support.
            </p>

            {/* Quick Informational Highlights */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-white/85">
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <Target className="size-3 text-emerald-300" />
                <span>Diagnostic Tiers</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <TrendingUp className="size-3 text-sky-300" />
                <span>Multi-Period Trends</span>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg backdrop-blur-xs">
                <Lightbulb className="size-3 text-amber-300" />
                <span>Action Plans</span>
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/students"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <Users className="size-3.5" />
                <span>All Students</span>
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/15 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition-all hover:scale-[1.02] active:scale-95"
              >
                <Award className="size-3.5 text-amber-300" />
                <span>Leaderboard</span>
              </Link>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-analysis-bg.webp"
                alt="Analytics"
                fill
                priority
                className="object-contain object-right drop-shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Right 4 cols: Search + Theme Swatches + Student Selector */}
        <div className="lg:col-span-4 bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex flex-col justify-between gap-3">
          {/* Search student on top */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student by name..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>

          {/* Quick Apple-style Color Palette Bar */}
          <CardThemeBar />

          <div className="border-t border-border/60 pt-2 space-y-2.5">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">
                Select Student
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Choose a student to view their performance analysis.
              </p>
            </div>

            {/* Class Filter */}
            <Select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedStudentId("");
              }}
            >
              <option value="">All Classes</option>
              {classesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            {/* Student Filter */}
            <Select
              value={activeStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students
                .filter(
                  (st) =>
                    !studentSearch ||
                    st.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    st.username.toLowerCase().includes(studentSearch.toLowerCase())
                )
                .map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.username})
                  </option>
                ))}
            </Select>

            {/* Group Filter Chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {(["all", "weak", "medium", "excellent"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroupFilter(g)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold capitalize transition-all",
                    groupFilter === g
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-secondary/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g === "all" ? "All Tiers" : g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Student Inspection Details */}
      {loadingAnalysis ? (
        <DataLoader text="Loading student performance analysis..." minHeight="min-h-[260px]" />
      ) : !analysis ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <BarChart3 className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No data available</h4>
          <p className="text-xs text-muted-foreground">Select a student above to view analysis.</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* Top 3 Score Cards for Selected Student */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-themed relative border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl shrink-0">
                  {analysis.score}%
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Overall Score
                  </p>
                  <p className="text-base font-extrabold text-foreground mt-0.5">
                    {analysis.groupLabel}
                  </p>
                </div>
              </div>
              <CardTypeFlag type={analysis.group} />
            </div>

            <div className="card-themed relative border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-xl shrink-0">
                  {analysis.scoreBreakdown.marksScore}%
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Academic Marks
                  </p>
                  <p className="text-base font-extrabold text-foreground mt-0.5">
                    Weight: 75%
                  </p>
                </div>
              </div>
              <CardTypeFlag type="exam" />
            </div>

            <div className="card-themed relative border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xl shrink-0">
                  {analysis.scoreBreakdown.attendanceScore}%
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Attendance Presence
                  </p>
                  <p className="text-base font-extrabold text-foreground mt-0.5">
                    Weight: 25%
                  </p>
                </div>
              </div>
              <CardTypeFlag type="regular" />
            </div>
          </div>

          {/* AI Guidance: Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-themed border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <h4 className="font-extrabold text-base text-foreground">
                  Observed Strengths
                </h4>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm font-medium text-foreground">
                {(analysis.explanation.strengths || ["Consistent performance in assessments"]).map(
                  (s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span>{s}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="card-themed border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <AlertCircle className="size-5 text-amber-500" />
                <h4 className="font-extrabold text-base text-foreground">
                  Areas Needing Improvement
                </h4>
              </div>
              <ul className="space-y-2 text-xs sm:text-sm font-medium text-foreground">
                {(analysis.explanation.weaknesses || ["Revise lower-scoring subject topics"]).map(
                  (w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="size-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <span>{w}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          {/* Recommendations Banner */}
          <div className="card-themed border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-5 text-primary" />
              <h4 className="font-extrabold text-base text-foreground">
                Recommended Action Plan
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(analysis.explanation.recommendations || ["Continue positive study momentum"]).map(
                (r, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl bg-card border border-border text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2.5"
                  >
                    <Target className="size-4 text-primary shrink-0" />
                    <span>{r}</span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-themed border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
              <h4 className="font-extrabold text-base text-foreground">
                Subject Comparison
              </h4>
              <SubjectBarChart data={analysis.subjectComparison || []} />
            </div>

            <div className="card-themed border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
              <h4 className="font-extrabold text-base text-foreground">
                Historical Score Trend
              </h4>
              <AreaTrendChart data={analysis.trendData || []} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
