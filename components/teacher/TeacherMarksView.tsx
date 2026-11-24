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
  LayoutGrid,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";

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
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
  const [typeTab, setTypeTab] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  // Fetch teacher classes
  const { data: classesData } = useQuery({
    queryKey: ["classes", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const classesList: Array<{ id: string; name: string }> = classesData?.data || [];

  // Fetch students list
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["students", "teacher", user?.centerId, selectedClassId],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "150" });
      if (selectedClassId) params.append("classId", selectedClassId);
      const res = await fetch(`/api/v1/students?${params.toString()}`);
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
    if (typeTab !== "all" && m.type?.toLowerCase() !== typeTab.toLowerCase()) {
      return false;
    }
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
              Student Marks
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Review student marks and exam scores. You can also jump to assessments to evaluate test papers.
            </p>
            <div className="pt-2">
              <Link
                href="/exams"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <Award className="size-4" />
                <span>View Assessments</span>
              </Link>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-exam-bg.webp"
                alt="Student Marks"
                fill
                priority
                className="object-contain object-right drop-shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Search Bar + Theme Swatches + 4 Stats Cards */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* Search bar on top */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search marks by exam or student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>

          {/* Quick Apple-style Color Palette Bar */}
          <CardThemeBar />

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
        </div>
      </section>

      {/* 2. Controls: Select Class & Student + Type Tabs */}
      <section className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-foreground">
              Filter Marks
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Choose a class, student, or assessment type.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Class Filter */}
            <div className="w-full sm:w-48">
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
            </div>

            {/* Student Filter */}
            <div className="w-full sm:w-64">
              <Select
                value={activeStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {studentsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.username})
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Assessment Type Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          {(["all", "exam", "quiz", "test"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeTab(t)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all",
                typeTab === t
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "all" ? "All Assessments" : `${t}s`}
            </button>
          ))}
        </div>
      </section>

      {/* 4. Marks Records List */}
      <section className="card-themed rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4 border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Marks List
            </h3>
            <p className="text-xs card-themed-sub mt-0.5">
              Scores recorded for the selected student.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold card-themed-sub px-3 py-1 card-themed-tag rounded-full border border-border/70">
              {filteredMarks.length} Records
            </span>

            {/* View Mode Toggle: Cards (Default) vs Table */}
            <div className="flex items-center bg-secondary/80 border border-border rounded-full p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                  viewMode === "cards"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="size-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
                  viewMode === "table"
                    ? "bg-white text-primary shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Table2 className="size-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {loadingMarks ? (
          <DataLoader text="Loading student marks..." minHeight="min-h-[220px]" />
        ) : filteredMarks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Award className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">No marks recorded yet</p>
            <p className="text-xs card-themed-sub">
              This student has not had any assessment marks recorded in the system yet.
            </p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 animate-in fade-in duration-300">
            {filteredMarks.map((m) => (
              <div
                key={m.id}
                className="card-themed rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative"
              >
                {/* 1. Header: Subject Tag + Date + CardTypeFlag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="card-themed-tag px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-border/80">
                      {m.subject}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {m.date}
                    </span>
                  </div>
                  <CardTypeFlag type={m.type || "exam"} />
                </div>

                {/* 2. Assessment Title & Class */}
                <div className="space-y-1">
                  <h4
                    className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1"
                    title={m.title}
                  >
                    {m.title}
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium">
                    {m.class || "Class Batch"}
                  </p>
                </div>

                {/* 3. Score Breakdown */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground tabular-nums block">
                      {m.score} / {m.totalMarks}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Raw Marks</span>
                  </div>
                  <div className="text-center">
                    <span className="font-black text-primary text-base tabular-nums block">
                      {m.percentage}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">Score</span>
                  </div>
                  <span className="size-8 rounded-full bg-secondary text-primary border border-border flex items-center justify-center font-black text-xs">
                    {m.grade}
                  </span>
                </div>

                {/* 4. Dedicated Bottom Action Line (Interactive Text Colors, No Background Box) */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <Link
                    href="/exams"
                    className="font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                    title="View Assessment"
                  >
                    <Award className="size-3.5" />
                    <span>View Exam</span>
                  </Link>
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">
                    {m.studentName || "Student"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] animate-in fade-in duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-black uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-5">Assessment</th>
                    <th className="py-3.5 px-4">Subject & Class</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Raw Marks</th>
                    <th className="py-3.5 px-4">Percentage</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-medium">
                  {filteredMarks.map((m) => (
                    <tr key={m.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-extrabold text-foreground text-xs sm:text-sm line-clamp-1">{m.title}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{m.type || "Exam"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-foreground">{m.subject}</span>
                        <div className="text-[11px] text-muted-foreground">{m.class || "Class Batch"}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {m.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-foreground">{m.score} / {m.totalMarks}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-black text-primary text-sm">{m.percentage}%</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex size-7 rounded-full bg-secondary text-primary border border-border items-center justify-center font-black text-xs">
                          {m.grade}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <Link
                          href="/exams"
                          className="font-bold text-primary hover:underline text-xs inline-flex items-center gap-1"
                        >
                          <Award className="size-3.5" />
                          <span>View Exam</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
