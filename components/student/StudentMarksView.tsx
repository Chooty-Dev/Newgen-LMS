"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { MarkDetailSheet, StudentMarkItem } from "./MarkDetailSheet";
import { FriendlySkeletons } from "./FriendlySkeletons";
import {
  Search,
  BookOpen,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const TYPE_PILLS = [
  { label: "All", value: "" },
  { label: "Exams", value: "exam" },
  { label: "Tests", value: "test" },
  { label: "Quizzes", value: "mcq_quiz" },
  { label: "Papers", value: "paper" },
  { label: "Assignments", value: "assignment" },
];

export function StudentMarksView() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = React.useState("");
  const [selectedSubject, setSelectedSubject] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  const [activeMark, setActiveMark] = React.useState<StudentMarkItem | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  // 1. Fetch marks for this student
  const { data: marksData, isLoading } = useQuery<{ data: StudentMarkItem[] }>({
    queryKey: ["student-marks", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/marks?studentId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to load marks");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const rawMarks = marksData?.data || [];

  // Compute stats and subject list
  const subjectsSet = new Set<string>();
  const subjectScoreMap = new Map<string, { total: number; count: number; scores: number[] }>();

  rawMarks.forEach((m) => {
    subjectsSet.add(m.subject);
    const curr = subjectScoreMap.get(m.subject) || { total: 0, count: 0, scores: [] };
    curr.total += m.percentage;
    curr.count += 1;
    curr.scores.push(m.percentage);
    subjectScoreMap.set(m.subject, curr);
  });

  const subjectTiles = Array.from(subjectsSet).map((sub) => {
    const stat = subjectScoreMap.get(sub);
    const avg = stat ? Math.round(stat.total / stat.count) : 0;

    let trendWord = "Steady";
    if (stat && stat.scores.length >= 2) {
      const latest = stat.scores[stat.scores.length - 1];
      const prev = stat.scores[stat.scores.length - 2];
      if (latest > prev + 3) trendWord = "Rising";
      else if (latest < prev - 3) trendWord = "Growing";
      else trendWord = avg >= 80 ? "Strong" : "Steady";
    } else {
      trendWord = avg >= 80 ? "Strong" : "Growing";
    }

    let tip = `Practise ${sub} for 15 minutes each day.`;
    if (avg >= 85) tip = `You are shining in ${sub}! Help a friend or try advanced questions.`;
    else if (avg < 60) tip = `Small daily practice in ${sub} will build your confidence.`;

    return { name: sub, average: avg, count: stat?.count || 0, trendWord, tip };
  });

  const overallAverage = rawMarks.length > 0
    ? Math.round(rawMarks.reduce((acc, m) => acc + m.percentage, 0) / rawMarks.length)
    : 0;

  // Filter marks
  const filteredMarks = rawMarks.filter((m) => {
    if (selectedType && m.type !== selectedType) return false;
    if (selectedSubject && m.subject !== selectedSubject) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenMark = (mark: StudentMarkItem) => {
    setActiveMark(mark);
    setSheetOpen(true);
  };

  if (isLoading) {
    return <FriendlySkeletons />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Banner with Exam Paper Illustration */}
      <section className="bg-sky-400/20 border border-blue-100/80 rounded-3xl p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] relative overflow-hidden">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#184880] tracking-tight leading-tight">
            My Marks & Results
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Explore your tests, exam marks, and teacher feedback.
          </p>

          <div className="flex items-center justify-center md:justify-start gap-3 pt-1">
            <div className="bg-white rounded-2xl px-4 py-2 border border-blue-100/60 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Average
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#184880] tabular-nums">
                {overallAverage}%
              </span>
            </div>
            <div className="bg-white rounded-2xl px-4 py-2 border border-blue-100/60 shadow-xs text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Assessments
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums">
                {rawMarks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Right Illustration: Exam paper with A+ */}
        <div className="relative w-40 h-40 sm:w-48 sm:h-48 shrink-0 z-10">
          <Image
            src="/images/exam-paper.webp"
            alt="My Marks"
            fill
            priority
            className="object-contain drop-shadow-sm"
            sizes="(max-width: 768px) 160px, 192px"
          />
        </div>
      </section>

      {/* 2. Subject Cards */}
      {subjectTiles.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              My Subjects
            </h3>
            {selectedSubject && (
              <button
                type="button"
                onClick={() => setSelectedSubject("")}
                className="text-xs font-semibold text-blue-600 hover:underline rounded-full px-3 py-1 bg-white border border-slate-200"
              >
                Show All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjectTiles.map((tile) => {
              const isSelected = selectedSubject === tile.name;
              return (
                <div
                  key={tile.name}
                  onClick={() => setSelectedSubject(isSelected ? "" : tile.name)}
                  className={`relative overflow-hidden p-5 rounded-3xl transition-all cursor-pointer flex flex-col justify-between space-y-3 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] ${isSelected
                    ? "border-2 border-[#184880] ring-2 ring-[#184880]/20 bg-[#F0F6FF]"
                    : "bg-gradient-to-b from-white via-white to-[#F0F6FF]/60 border border-blue-100/60 hover:border-blue-200"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-base text-slate-900">
                        {tile.name}
                      </h4>
                      <span className="text-xs font-medium text-slate-500">
                        {tile.count} assessments
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-900 tabular-nums block">
                        {tile.average}%
                      </span>
                      <span className="text-[11px] font-bold text-[#184880] uppercase tracking-wide">
                        {tile.trendWord}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {tile.tip}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Controls & Search Pill */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-1">
        {/* Search Pill */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search test or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#184880]"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            aria-label="Cards View"
            className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-xs font-bold transition-all ${viewMode === "cards"
              ? "bg-[#184880] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <LayoutGrid className="size-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            aria-label="Table View"
            className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-xs font-bold transition-all ${viewMode === "table"
              ? "bg-[#184880] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <ListIcon className="size-3.5" />
            <span>Table</span>
          </button>
        </div>
      </section>

      {/* 4. Type Pills */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {TYPE_PILLS.map((pill) => {
          const isActive = selectedType === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setSelectedType(pill.value)}
              className={`h-10 px-5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${isActive
                ? "bg-[#184880] text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
            >
              {pill.label}
            </button>
          );
        })}
      </section>

      {/* 5. Marks Content */}
      {filteredMarks.length === 0 ? (
        <div className="rounded-3xl p-10 text-center space-y-3 bg-gradient-to-b from-white via-white to-[#F0F6FF]/60 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)]">
          <div className="size-14 rounded-full bg-blue-50 text-[#184880] flex items-center justify-center mx-auto">
            <BookOpen className="size-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-slate-900">No marks found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No assessments match your current filters.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedType("");
              setSelectedSubject("");
              setSearchTerm("");
            }}
            className="rounded-full h-9 px-5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarks.map((mark) => (
            <div
              key={mark.id}
              onClick={() => handleOpenMark(mark)}
              className="group relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-white via-white to-[#F0F6FF]/50 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)] hover:shadow-[0_14px_30px_-5px_rgba(24,72,128,0.09)] hover:border-blue-200 cursor-pointer transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#184880] px-2.5 py-0.5 rounded-full bg-[#EBF3FE] inline-block">
                    {mark.subject}
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 truncate group-hover:text-[#184880] transition-colors mt-1">
                    {mark.title}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Calendar className="size-3 text-slate-400" />
                    <span>{mark.date}</span>
                    <span>•</span>
                    <span className="capitalize">{mark.type.replace("_", " ")}</span>
                  </p>
                </div>

                {/* Score badge */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-black text-slate-900 group-hover:text-[#184880] transition-colors tabular-nums">
                    {mark.percentage}%
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Grade {mark.grade}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="font-medium text-slate-500">
                  Score: {mark.score} / {mark.totalMarks}
                </span>
                <span className="font-bold text-[#184880] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View details <ChevronRight className="size-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-3xl p-4 md:p-6 overflow-hidden bg-gradient-to-b from-white via-white to-[#F0F6FF]/30 border border-blue-100/60 shadow-[0_10px_25px_-5px_rgba(24,72,128,0.06),0_4px_10px_-4px_rgba(24,72,128,0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Subject</th>
                  <th className="pb-3 px-4">Assessment</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4 text-center">Score</th>
                  <th className="pb-3 px-4 text-center">Percentage</th>
                  <th className="pb-3 px-4 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMarks.map((mark) => (
                  <tr
                    key={mark.id}
                    onClick={() => handleOpenMark(mark)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {mark.subject}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {mark.title}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {mark.date}
                    </td>
                    <td className="py-3.5 px-4 text-center tabular-nums text-slate-700">
                      {mark.score} / {mark.totalMarks}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-[#184880] tabular-nums">
                      {mark.percentage}%
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {mark.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Detail Sheet */}
      <MarkDetailSheet
        mark={activeMark}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
