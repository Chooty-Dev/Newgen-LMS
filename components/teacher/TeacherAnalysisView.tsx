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
import { Skeleton } from "@/components/ui/skeleton";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";

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

  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(urlStudentId || "");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [groupFilter, setGroupFilter] = React.useState<string>("all");
  const [studentSearch, setStudentSearch] = React.useState<string>("");

  React.useEffect(() => {
    if (urlStudentId) {
      setSelectedStudentId(urlStudentId);
    }
  }, [urlStudentId]);

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
    selectedStudentId || (students.length > 0 ? students[0].id : "");

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
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Student Performance Analysis
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Gain deep AI insights into individual student learning patterns, pinpoint academic weaknesses, and review personalized guidance action plans.
            </p>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/analytics.webp"
              alt="Analytics"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        {/* Right 4 cols: Student Selector & Quick Search */}
        <div className="lg:col-span-4 bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex flex-col justify-between gap-2.5">
          <div>
            <h3 className="font-extrabold text-sm text-foreground">
              Select Student to Inspect
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Choose a student to review scores and AI recommendations.
            </p>
          </div>

          <div className="space-y-3">
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
            <div className="flex items-center gap-1.5 pt-1">
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

          {/* Quick search input right beneath selector */}
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
        </div>
      </section>

      {/* 3. Student Inspection Details */}
      {loadingAnalysis ? (
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
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
            <div className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-4">
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

            <div className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-4">
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

            <div className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-4">
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
          </div>

          {/* AI Guidance: Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
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

            <div className="bg-card border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
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
          <div className="bg-secondary/70 border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-3">
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
            <div className="bg-card border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
              <h4 className="font-extrabold text-base text-foreground">
                Subject Comparison
              </h4>
              <SubjectBarChart data={analysis.subjectComparison || []} />
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
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
