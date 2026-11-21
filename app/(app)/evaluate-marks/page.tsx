"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { calculateGrade } from "@/modules/marks/schema";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Send } from "lucide-react";

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
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-foreground hover:opacity-80"
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
                    <span className="inline-block size-8 rounded-full bg-muted/60 leading-8 text-foreground text-center">
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
  const queryClient = useQueryClient();
  const [selectedAssessmentId, setSelectedAssessmentId] = React.useState("");

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluate Marks"
        description="Rapid marks entry grid with keyboard navigation."
      />

      <Card className="rounded-3xl border-border bg-card p-6">
        <label className="text-base font-semibold text-foreground block pl-2 mb-2">
          Select Assessment to Evaluate
        </label>
        <div className="max-w-xl">
          <Select
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
          >
            <option value="">Choose an exam, test, or paper...</option>
            {assessments.map((a: { id: string; title: string; type: string; subject: string; status: string }) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.type.toUpperCase()}) — {a.subject} [{a.status.replace(/_/g, " ")}]
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {selectedAssessmentId && (
        gridLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading student list...</div>
        ) : !gridData?.data?.entries?.length ? (
          <div className="text-center py-12 text-muted-foreground">
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
      )}
    </div>
  );
}
