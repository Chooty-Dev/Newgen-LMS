"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { MarkDetailSheet, StudentMarkItem } from "./MarkDetailSheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { cn } from "@/lib/utils";
import {
  Search,
  BookOpen,
  Calendar,
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
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
    
    // Determine trend word
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

    // Short friendly tip
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header with Big Overall Average */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            My Marks
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Explore your tests, exam results, and teacher remarks.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-3xl bg-card border border-border text-center min-w-[130px]">
            <span className="text-xs uppercase font-bold text-muted-foreground block">
              Average Score
            </span>
            <span className="text-3xl md:text-4xl font-extrabold text-primary tabular-nums">
              {overallAverage}%
            </span>
          </div>
          <div className="p-4 rounded-3xl bg-card border border-border text-center min-w-[130px]">
            <span className="text-xs uppercase font-bold text-muted-foreground block">
              Assessments
            </span>
            <span className="text-3xl md:text-4xl font-extrabold text-foreground tabular-nums">
              {rawMarks.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Subject Tiles First (latest average, trend word, tip) */}
      {subjectTiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              My Subjects
            </h2>
            {selectedSubject && (
              <button
                onClick={() => setSelectedSubject("")}
                className="text-xs font-semibold text-primary hover:underline"
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
                  className={cn(
                    "p-5 rounded-[2rem] bg-card border transition-all cursor-pointer flex flex-col justify-between space-y-3",
                    isSelected
                      ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03]"
                      : "border-border hover:border-primary/40 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">
                        {tile.name}
                      </h3>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {tile.count} tests
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-foreground tabular-nums">
                        {tile.average}%
                      </span>
                      <span className="text-[11px] font-bold text-primary block uppercase tracking-wide">
                        {tile.trendWord}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {tile.tip}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Controls & Search Pill */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Search Pill */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search test or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-full bg-card border border-border text-foreground placeholder:text-muted-foreground text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            aria-label="Cards View"
            className={cn(
              "flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-semibold transition-all",
              viewMode === "cards"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="size-4" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            aria-label="List View"
            className={cn(
              "flex items-center gap-1.5 px-4 h-10 rounded-full text-sm font-semibold transition-all",
              viewMode === "table"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListIcon className="size-4" />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* 4. Segmented Type Control */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {TYPE_PILLS.map((pill) => {
          const isActive = selectedType === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setSelectedType(pill.value)}
              className={cn(
                "h-11 px-5 rounded-full text-sm font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* 5. Marks Content */}
      {filteredMarks.length === 0 ? (
        <Card className="rounded-[2.5rem] p-12 text-center space-y-4">
          <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <BookOpen className="size-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-foreground">No marks found</h3>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              There are no assessments matching your current filter selections.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedType("");
              setSelectedSubject("");
              setSearchTerm("");
            }}
            className="rounded-full h-11 px-6 text-sm font-semibold"
          >
            Clear Filters
          </Button>
        </Card>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMarks.map((mark) => (
            <div
              key={mark.id}
              onClick={() => handleOpenMark(mark)}
              className="group p-6 rounded-[2rem] bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/40 cursor-pointer transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    {mark.subject}
                  </span>
                  <h3 className="text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {mark.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-0.5">
                    <Calendar className="size-3.5" />
                    <span>{mark.date}</span>
                    <span>•</span>
                    <span className="capitalize">{mark.type.replace("_", " ")}</span>
                  </p>
                </div>

                {/* Score badge */}
                <div className="text-right shrink-0">
                  <div className="text-3xl font-extrabold text-foreground group-hover:text-primary transition-colors tabular-nums">
                    {mark.percentage}%
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Grade {mark.grade}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/80 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  Score: {mark.score} / {mark.totalMarks}
                </span>
                <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View details <ChevronRight className="size-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List / Table View */
        <Card className="rounded-[2.5rem] p-4 md:p-6 overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-border text-sm font-semibold text-muted-foreground">
                  <th className="pb-3 px-4">Subject</th>
                  <th className="pb-3 px-4">Assessment</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4 text-center">Score</th>
                  <th className="pb-3 px-4 text-center">Percentage</th>
                  <th className="pb-3 px-4 text-center">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMarks.map((mark) => (
                  <tr
                    key={mark.id}
                    onClick={() => handleOpenMark(mark)}
                    className="hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <td className="py-4 px-4 font-bold text-foreground">
                      {mark.subject}
                    </td>
                    <td className="py-4 px-4 font-medium text-foreground">
                      {mark.title}
                    </td>
                    <td className="py-4 px-4 text-sm text-muted-foreground">
                      {mark.date}
                    </td>
                    <td className="py-4 px-4 text-center tabular-nums">
                      {mark.score} / {mark.totalMarks}
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-primary tabular-nums">
                      {mark.percentage}%
                    </td>
                    <td className="py-4 px-4 text-center font-bold">
                      {mark.grade}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
