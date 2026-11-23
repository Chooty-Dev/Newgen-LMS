"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Award,
  BookOpen,
  GraduationCap,
  TrendingUp,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  FileCheck,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface MarkRecord {
  id: string;
  title: string;
  date: string;
  subject: string;
  class: string;
  studentName: string;
  studentUsername: string;
  type: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
}

interface StudentItem {
  id: string;
  name: string;
  username: string;
  grade?: string;
  performanceScore?: number;
}

export function TeacherMarksView() {
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");

  // Fetch students list
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["students", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/students?limit=100");
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const studentsList: StudentItem[] = studentsData?.data || [];
  const activeStudentId = selectedStudentId || (studentsList.length > 0 ? studentsList[0].id : "");

  // Fetch marks
  const { data: marksData, isLoading: loadingMarks } = useQuery({
    queryKey: ["marks", activeStudentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeStudentId) params.append("studentId", activeStudentId);
      const res = await fetch(`/api/v1/marks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load marks");
      return res.json();
    },
    enabled: !!activeStudentId,
  });

  const marks: MarkRecord[] = marksData?.data || [];

  const filteredMarks = marks.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      (m.studentName && m.studentName.toLowerCase().includes(q))
    );
  });

  const totalMarksCount = marks.length;
  const avgPercentage =
    totalMarksCount > 0
      ? Math.round(marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / totalMarksCount)
      : 0;
  const aGradesCount = marks.filter((m) => m.grade === "A").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Marks & Evaluations
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Review detailed student marks, analyze term grading distributions, and monitor academic progress. Use the button below to record scores for completed tests.
            </p>
            <div className="pt-2">
              <Link
                href="/evaluate-marks"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <Award className="size-4" />
                <span>Enter New Marks</span>
              </Link>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/achivements.webp"
              alt="Achievements"
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
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileCheck className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {totalMarksCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Submissions
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {avgPercentage}%
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Average Score
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Award className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {aGradesCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Grade A Results
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {studentsList.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Students
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
                {marks.length} Marks Entries Logged
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href="/exams"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="size-3" />
                <span>Exams</span>
              </Link>
              <Link
                href="/analysis"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <TrendingUp className="size-3 text-primary" />
                <span>Analysis</span>
              </Link>
            </div>
          </div>

          {/* Search bar directly beneath cards */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search marks, assessments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* 2. Controls: Select Student */}
      <section className="bg-card border border-border rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-sm text-foreground">
            Filter by Student
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Select a student to inspect their individual assessment performance.
          </p>
        </div>

        <div className="w-full sm:w-80">
          <Select
            value={activeStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            {studentsList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.username}) - {st.grade || "No Grade"}
              </option>
            ))}
          </Select>
        </div>
      </section>

      {/* 4. Marks Records List */}
      <section className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Assessment Results
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Score breakdown for selected student across all term assessments.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
            {filteredMarks.length} Records
          </span>
        </div>

        {loadingMarks ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : filteredMarks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Award className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">No marks recorded yet</p>
            <p className="text-xs">
              This student has not had any assessment marks recorded in the system yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredMarks.map((m) => (
              <div
                key={m.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-4 hover:bg-secondary/30 px-3 rounded-2xl transition-colors gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-secondary text-primary border border-border">
                      {m.subject}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {m.date}
                    </span>
                  </div>
                  <p className="text-base font-extrabold text-foreground truncate">
                    {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">
                    {m.class || "Class Batch"}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end sm:self-center text-right">
                  <div>
                    <span className="text-sm font-bold tabular-nums text-foreground block">
                      {m.score} / {m.totalMarks}
                    </span>
                    <span className="text-xs text-muted-foreground">Raw Marks</span>
                  </div>

                  <div>
                    <span className="text-lg font-black text-primary tabular-nums block">
                      {m.percentage}%
                    </span>
                    <span className="text-xs text-muted-foreground">Percentage</span>
                  </div>

                  <span className="inline-flex size-9 rounded-full bg-secondary text-primary border border-border items-center justify-center font-black text-sm">
                    {m.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
