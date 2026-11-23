"use client";

import * as React from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calculateGrade } from "@/modules/marks/schema";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Send, Award, CheckCircle2, Clock, Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface GridEntry {
  studentId: string;
  studentName: string;
  username: string;
  classId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  attendanceStatus: "present" | "absent" | "excused";
  remarks?: string;
}

interface AssessmentSummary {
  id: string;
  title: string;
  totalMarks: number;
  passMark: number;
}

function EvaluationGridEditor({
  assessment,
  initialEntries,
  onSaved,
}: {
  assessment: AssessmentSummary;
  initialEntries: GridEntry[];
  onSaved: () => void;
}) {
  const [entries, setEntries] = React.useState<GridEntry[]>(initialEntries);
  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map());

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "submitted") => {
      const res = await fetch("/api/v1/marks/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: assessment.id,
          status,
          entries: entries.map((e) => ({
            studentId: e.studentId,
            classId: e.classId,
            score: e.score,
            attendanceStatus: e.attendanceStatus,
            remarks: e.remarks,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save marks");
      return json.data;
    },
    onSuccess: (_, status) => {
      onSaved();
      toast.success(
        status === "submitted"
          ? "Marks submitted successfully and student records updated"
          : "Draft saved successfully"
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleScoreChange = (index: number, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index] };
      entry.score = num;
      entry.percentage = entry.totalMarks > 0 ? Math.round((num / entry.totalMarks) * 100) : 0;
      entry.grade = calculateGrade(entry.percentage);
      updated[index] = entry;
      return updated;
    });
  };

  const toggleAbsent = (index: number) => {
    setEntries((prev) => {
      const updated = [...prev];
      const entry = { ...updated[index] };
      if (entry.attendanceStatus === "absent") {
        entry.attendanceStatus = "present";
      } else {
        entry.attendanceStatus = "absent";
        entry.score = 0;
        entry.percentage = 0;
        entry.grade = "F";
      }
      updated[index] = entry;
      return updated;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = inputRefs.current.get(currentIndex + 1);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = inputRefs.current.get(currentIndex - 1);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  return (
    <Card className="rounded-3xl border-border bg-card p-6 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-border gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{assessment.title}</h2>
          <p className="text-sm text-muted-foreground">
            Total Marks: {assessment.totalMarks} • Pass Mark: {assessment.passMark} • {entries.length} Students
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full h-12"
            onClick={() => saveMutation.mutate("draft")}
            disabled={saveMutation.isPending}
          >
            <Save className="size-4 mr-2" />
            Save Draft
          </Button>
          <Button
            className="rounded-full h-12"
            onClick={() => saveMutation.mutate("submitted")}
            disabled={saveMutation.isPending}
          >
            <Send className="size-4 mr-2" />
            Submit Marks
          </Button>
        </div>
      </div>

      <div className="mb-4 text-sm text-muted-foreground bg-muted/40 px-4 py-2 rounded-full border border-border inline-block">
        💡 Tip: Press <kbd className="font-semibold text-foreground">Enter</kbd> or <kbd className="font-semibold text-foreground">↓</kbd> to jump to the next student.
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-left">
              <th className="pb-4 font-semibold pl-2">#</th>
              <th className="pb-4 font-semibold">Student Name</th>
              <th className="pb-4 font-semibold text-center w-28">Status</th>
              <th className="pb-4 font-semibold w-36">Marks (/ {assessment.totalMarks})</th>
              <th className="pb-4 font-semibold text-center w-24">Percentage</th>
              <th className="pb-4 font-semibold text-center w-20">Grade</th>
              <th className="pb-4 font-semibold">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry, idx) => {
              const isAbsent = entry.attendanceStatus === "absent";
              return (
                <tr key={entry.studentId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-4 pl-2 text-muted-foreground">{idx + 1}</td>
                  <td className="py-4">
                    <span className="font-semibold text-foreground block">{entry.studentName}</span>
                    <span className="text-xs text-muted-foreground">{entry.username}</span>
                  </td>
                  <td className="py-4 text-center">
                    <button
                      type="button"
                      onClick={() => toggleAbsent(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                        isAbsent
                          ? "bg-rose-100 text-rose-700 border border-rose-200"
                          : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {isAbsent ? "Absent" : "Present"}
                    </button>
                  </td>
                  <td className="py-4">
                    <Input
                      ref={(el) => {
                        if (el) inputRefs.current.set(idx, el);
                        else inputRefs.current.delete(idx);
                      }}
                      type="number"
                      min={0}
                      max={entry.totalMarks}
                      disabled={isAbsent}
                      value={isAbsent ? 0 : entry.score}
                      onChange={(e) => handleScoreChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx)}
                      className="w-28 text-center rounded-full h-10 tabular-nums font-semibold"
                    />
                  </td>
                  <td className="py-4 text-center tabular-nums font-semibold">
                    {entry.percentage}%
                  </td>
                  <td className="py-4 text-center font-bold">
                    <span className="inline-block size-8 rounded-full bg-secondary text-primary font-bold leading-8 text-center">
                      {entry.grade}
                    </span>
                  </td>
                  <td className="py-4 pr-2">
                    <Input
                      placeholder="Optional comment"
                      value={entry.remarks || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEntries((prev) => {
                          const updated = [...prev];
                          updated[idx] = { ...updated[idx], remarks: val };
                          return updated;
                        });
                      }}
                      className="rounded-full h-10 text-sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function EvaluateMarksPage() {
  const searchParams = useSearchParams();
  const initialAssessmentId = searchParams?.get("assessmentId") || "";
  const queryClient = useQueryClient();
  const [selectedAssessmentId, setSelectedAssessmentId] = React.useState(initialAssessmentId);

  // Sync if query param changes
  React.useEffect(() => {
    const q = searchParams?.get("assessmentId");
    if (q) setSelectedAssessmentId(q);
  }, [searchParams]);

  const { data: assessmentsData } = useQuery({
    queryKey: ["my-evaluations"],
    queryFn: async () => {
      const res = await fetch("/api/v1/exams");
      if (!res.ok) throw new Error("Failed to load assessments");
      return res.json();
    },
  });

  const assessments = assessmentsData?.data || [];

  const { data: gridData, isLoading: gridLoading } = useQuery({
    queryKey: ["evaluation-grid", selectedAssessmentId],
    queryFn: async () => {
      if (!selectedAssessmentId) return null;
      const res = await fetch(`/api/v1/marks/evaluate?assessmentId=${selectedAssessmentId}`);
      if (!res.ok) throw new Error("Failed to load evaluation grid");
      return res.json();
    },
    enabled: !!selectedAssessmentId,
  });

  const currentAssessment = assessments.find((a: any) => a.id === selectedAssessmentId);
  const totalEntries = gridData?.data?.entries?.length || 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Evaluate Student Marks
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Rapid marks entry and score submission workflow. Use Enter or arrow keys to quickly navigate between student inputs.
            </p>
            <div className="pt-2">
              <Link
                href="/exams"
                className="inline-flex items-center justify-center bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
              >
                <ArrowLeft className="size-4" />
                <span>Back to Assessments</span>
              </Link>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/achivements.webp"
              alt="Evaluate Marks"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {totalEntries}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Students In Grid
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {currentAssessment?.totalMarks ?? "—"}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Marks
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {currentAssessment?.passMark ?? "—"}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Pass Mark
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground truncate leading-tight capitalize">
                  {currentAssessment?.status ? currentAssessment.status.replace(/_/g, " ") : "Pending"}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Assessment State
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full">
            <Select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="w-full h-10 rounded-full bg-card border border-border text-xs sm:text-sm shadow-xs"
            >
              <option value="">Select assessment to evaluate...</option>
              {assessments.map((a: { id: string; title: string; type: string; subject: string; status: string }) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.type.toUpperCase()}) — [{a.status.replace(/_/g, " ")}]
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      {selectedAssessmentId ? (
        gridLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading student list...</div>
        ) : !gridData?.data?.entries?.length ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-3xl p-8">
            No students enrolled in this assessment&apos;s classes.
          </div>
        ) : (
          <EvaluationGridEditor
            key={selectedAssessmentId}
            assessment={gridData.data.assessment}
            initialEntries={gridData.data.entries}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["my-evaluations"] });
              queryClient.invalidateQueries({ queryKey: ["evaluation-grid", selectedAssessmentId] });
            }}
          />
        )
      ) : (
        <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-3xl p-8">
          Please select an assessment above to open the evaluation marks grid.
        </div>
      )}
    </div>
  );
}
