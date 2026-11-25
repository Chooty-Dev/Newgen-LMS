"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Lock,
  Save,
  Search,
  Send,
  Unlock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataLoader } from "@/components/ui/data-loader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { calculateGrade } from "@/modules/marks/schema";
import { ScheduledEvaluationItem } from "@/modules/marks/service";
import { EvaluationWindowInfo } from "@/modules/marks/evaluation-window";
import { formatScheduledCategoryLabel } from "@/modules/attendance/schedule";
import {
  STAFF_CATEGORY_STYLE,
  StaffScheduleHero,
  formatReadableDate,
  useClientDateState,
} from "./staffSchedulePrimitives";

type EvaluationFilterCategory = "all" | "exam" | "test" | "paper" | "assignment";

interface ScheduledMarksResponse {
  date: string;
  summary: {
    totalScheduled: number;
    examsCount: number;
    testsCount: number;
    papersCount: number;
    assignmentsCount: number;
    completedCount: number;
    pendingCount: number;
  };
  evaluations: ScheduledEvaluationItem[];
}

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
  status?: string;
}

interface EntryOverride {
  score?: number;
  attendanceStatus?: "present" | "absent" | "excused";
  remarks?: string;
}

interface AssessmentSummary {
  id: string;
  title: string;
  type?: string;
  subject?: string;
  classes?: string[];
  totalMarks: number;
  passMark: number;
  status?: string;
  evaluationWindow?: EvaluationWindowInfo;
}

function matchesEvaluationFilter(
  item: ScheduledEvaluationItem,
  filter: EvaluationFilterCategory
): boolean {
  if (filter === "all") return true;
  if (filter === "exam") return item.category === "exam";
  if (filter === "paper") return item.category === "paper";
  if (filter === "assignment") return item.category === "assignment";
  return item.category === "test" || item.category === "mcq_quiz";
}

function ScheduledEvaluationCard({
  item,
  onSelect,
}: {
  item: ScheduledEvaluationItem;
  onSelect: () => void;
}) {
  const catStyle = STAFF_CATEGORY_STYLE[item.category] || STAFF_CATEGORY_STYLE.exam;
  const CategoryIcon = catStyle.icon;
  const progressPct =
    item.expectedCount > 0
      ? Math.min(100, Math.round((item.evaluatedCount / item.expectedCount) * 100))
      : 0;
  const isScheduleLocked = !item.evaluationWindow?.hasEnded;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group bg-white border border-border/80 hover:border-primary/40 rounded-[28px] p-5 sm:p-6 text-left flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all cursor-pointer w-full"
    >
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border",
              catStyle.badge
            )}
          >
            <CategoryIcon className="size-3.5" />
            <span>{formatScheduledCategoryLabel(item.category)}</span>
          </span>

          {isScheduleLocked ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8]">
              <Lock className="size-3" />
              <span>
                {item.evaluationWindow.availability === "ongoing"
                  ? `Ends ${item.evaluationWindow.opensAtTime || item.endTime}`
                  : `Starts ${item.startTime}`}
              </span>
            </span>
          ) : item.evaluationStatus === "completed" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="size-3" />
              <span>Submitted</span>
            </span>
          ) : item.evaluationStatus === "draft" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="size-3" />
              <span>Draft Saved</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground border border-border/60">
              <span>Ready</span>
            </span>
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {item.title}
          </h3>
          <p className="text-xs font-semibold text-muted-foreground truncate">{item.subject}</p>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
            <Clock className="size-3.5 text-primary" />
            <span>
              {item.startTime} – {item.endTime}
            </span>
          </span>
          <span className="font-semibold text-foreground/80">
            {item.totalMarks} Marks (Pass {item.passMark})
          </span>
          {item.classNames.length > 0 && (
            <span className="truncate max-w-[200px]">{item.classNames.join(", ")}</span>
          )}
        </div>

        {isScheduleLocked && (
          <p className="text-[11px] font-semibold text-[#184880] bg-[#EBF3FE] border border-[#DDE8F8] px-3 py-1.5 rounded-xl">
            {item.evaluationWindow.availability === "ongoing"
              ? `In progress — marks open after ${item.evaluationWindow.opensAtTime || item.endTime}`
              : `Marks open after exam finishes at ${item.evaluationWindow.opensAtTime || item.endTime}`}
          </p>
        )}
      </div>

      <div className="w-full space-y-2.5 pt-3 border-t border-border/50">
        <div className="h-1.5 w-full bg-[#DDE8F8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#184880] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-muted-foreground tabular-nums">
            {item.evaluatedCount}/{item.expectedCount} students graded
          </span>
          <span className="inline-flex items-center gap-1 font-extrabold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>
              {isScheduleLocked
                ? "Locked"
                : item.evaluationStatus === "completed"
                ? "View Marks"
                : "Enter Marks"}
            </span>
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function StaffMarksEvaluationSheet({
  assessmentId,
  previewCard,
  canEvaluate,
  canEditSubmitted,
  onBack,
}: {
  assessmentId: string;
  previewCard: ScheduledEvaluationItem | null;
  canEvaluate: boolean;
  canEditSubmitted: boolean;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [searchStudent, setSearchStudent] = React.useState("");
  const [overrides, setOverrides] = React.useState<Record<string, EntryOverride>>({});
  const [isUnlockEditing, setIsUnlockEditing] = React.useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = React.useState(false);
  const inputRefs = React.useRef<Map<number, HTMLInputElement>>(new Map());

  const { data: gridResponse, isLoading, error } = useQuery({
    queryKey: ["evaluation-grid", assessmentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/marks/evaluate?assessmentId=${assessmentId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to load evaluation grid");
      }
      return res.json();
    },
  });

  const assessment: AssessmentSummary | undefined = gridResponse?.data?.assessment;
  const serverEntries: GridEntry[] = React.useMemo(
    () => gridResponse?.data?.entries || [],
    [gridResponse]
  );

  const entries: GridEntry[] = React.useMemo(
    () =>
      serverEntries.map((entry) => {
        const ov = overrides[entry.studentId];
        if (!ov) return entry;
        const attendanceStatus = ov.attendanceStatus ?? entry.attendanceStatus;
        const score =
          attendanceStatus === "absent" ? 0 : ov.score ?? entry.score;
        const percentage =
          attendanceStatus === "absent"
            ? 0
            : entry.totalMarks > 0
            ? Math.round((score / entry.totalMarks) * 100)
            : 0;
        const grade =
          attendanceStatus === "absent" ? "W" : calculateGrade(percentage);
        return {
          ...entry,
          attendanceStatus,
          score,
          percentage,
          grade,
          remarks: ov.remarks ?? entry.remarks,
        };
      }),
    [serverEntries, overrides]
  );

  const evaluationWindow = assessment?.evaluationWindow ?? previewCard?.evaluationWindow;
  const isLockedBySchedule = evaluationWindow ? !evaluationWindow.hasEnded : false;

  const isAlreadyEvaluated =
    assessment?.status === "completed" ||
    (serverEntries.length > 0 && serverEntries.every((e) => e.status === "submitted"));
  const isLocked = isLockedBySchedule || (isAlreadyEvaluated && !isUnlockEditing);

  const saveMutation = useMutation({
    mutationFn: async (status: "draft" | "submitted") => {
      const res = await fetch("/api/v1/marks/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
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
      setOverrides({});
      setConfirmSubmitOpen(false);
      setIsUnlockEditing(false);
      queryClient.invalidateQueries({ queryKey: ["evaluation-grid", assessmentId] });
      queryClient.invalidateQueries({ queryKey: ["staff-scheduled-marks"] });
      queryClient.invalidateQueries({ queryKey: ["marks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(
        status === "submitted"
          ? "Marks submitted and finalized successfully."
          : "Marks draft saved successfully."
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleScoreChange = (studentId: string, val: string) => {
    if (!canEvaluate || isLocked) return;
    const score = Math.max(0, Number(val) || 0);
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], score },
    }));
  };

  const handleToggleAbsent = (entry: GridEntry) => {
    if (!canEvaluate || isLocked) return;
    const nextAttendance = entry.attendanceStatus === "absent" ? "present" : "absent";
    setOverrides((prev) => ({
      ...prev,
      [entry.studentId]: {
        ...prev[entry.studentId],
        attendanceStatus: nextAttendance,
        score: nextAttendance === "absent" ? 0 : prev[entry.studentId]?.score ?? entry.score,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    if (!canEvaluate || isLocked) return;
    setOverrides((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = inputRefs.current.get(currentIndex + 1);
      if (next) {
        next.focus();
        next.select();
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = inputRefs.current.get(currentIndex - 1);
      if (prev) {
        prev.focus();
        prev.select();
      }
    }
  };

  const handleAttemptSubmit = () => {
    if (!canEvaluate || isLocked || !assessment) return;

    const outOfBounds = entries.filter(
      (e) =>
        e.attendanceStatus === "present" &&
        (Number(e.score) < 0 || Number(e.score) > assessment.totalMarks)
    );
    if (outOfBounds.length > 0) {
      toast.error(
        `Scores must be between 0 and ${assessment.totalMarks}. Check ${outOfBounds.length} invalid row(s).`
      );
      return;
    }

    setConfirmSubmitOpen(true);
  };

  const title = assessment?.title || previewCard?.title || "Marks Evaluation";
  const maxMarks = assessment?.totalMarks ?? previewCard?.totalMarks ?? 100;
  const passMark = assessment?.passMark ?? previewCard?.passMark ?? 40;
  const presentCount = entries.filter((e) => e.attendanceStatus !== "absent").length;
  const absentCount = entries.filter((e) => e.attendanceStatus === "absent").length;
  const passingCount = entries.filter(
    (e) => e.attendanceStatus !== "absent" && e.score >= passMark
  ).length;
  const avgPct =
    presentCount > 0
      ? Math.round(
          entries
            .filter((e) => e.attendanceStatus !== "absent")
            .reduce((sum, e) => sum + e.percentage, 0) / presentCount
        )
      : 0;

  const filteredEntries = entries.filter(
    (e) =>
      !searchStudent ||
      e.studentName.toLowerCase().includes(searchStudent.toLowerCase()) ||
      e.username.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const categoryKey = (assessment?.type || previewCard?.category || "exam") as NonNullable<
    ScheduledEvaluationItem["category"]
  >;
  const catStyle = STAFF_CATEGORY_STYLE[categoryKey] || STAFF_CATEGORY_STYLE.exam;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 bg-white border border-border/80 rounded-[28px] p-6 sm:p-7 flex flex-col justify-between gap-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground border border-border/60 transition-colors cursor-pointer"
              >
                <ArrowLeft className="size-3.5" />
                <span>Back to Assigned Evaluations</span>
              </button>

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                  catStyle.badge
                )}
              >
                <span>{formatScheduledCategoryLabel(categoryKey)}</span>
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                {assessment?.subject || previewCard?.subject || "Assessment"} • Total Marks: {maxMarks} • Pass Mark: {passMark}
                {previewCard ? ` • ${formatReadableDate(previewCard.date)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-medium">
              Press <kbd className="px-1.5 py-0.5 rounded bg-secondary font-bold text-foreground">Enter</kbd> or{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-secondary font-bold text-foreground">↓</kbd> to jump down
            </span>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveMutation.mutate("draft")}
                disabled={!canEvaluate || isLocked || saveMutation.isPending || entries.length === 0}
                className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
              >
                <Save className="size-3.5" />
                <span>{canEvaluate ? "Save Draft" : "View Only"}</span>
              </Button>
              <Button
                type="button"
                onClick={handleAttemptSubmit}
                disabled={!canEvaluate || isLocked || saveMutation.isPending || entries.length === 0}
                className="rounded-full h-10 px-5 text-xs font-bold gap-1.5 bg-[#184880] hover:bg-[#184880]/95 text-white"
              >
                {isLockedBySchedule ? <Lock className="size-3.5" /> : <Send className="size-3.5" />}
                <span>
                  {isLockedBySchedule
                    ? "Locked Until End"
                    : isAlreadyEvaluated && !isUnlockEditing
                    ? "Submitted"
                    : "Submit Marks"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#184880] text-white rounded-[28px] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3">
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-extrabold tracking-wide">
                {isLockedBySchedule
                  ? "LOCKED"
                  : isAlreadyEvaluated
                  ? "SUBMITTED"
                  : "GRADING"}
              </span>
              <span className="text-xs font-bold text-white/80 tabular-nums">
                {entries.length} Students
              </span>
            </div>
            <p className="text-3xl font-black tabular-nums mt-1">{avgPct}% Avg</p>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              {passingCount} passing out of {presentCount} present
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-white/15 text-center">
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{entries.length}</p>
              <p className="text-[10px] text-white/80 font-semibold">Total</p>
            </div>
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{presentCount}</p>
              <p className="text-[10px] text-white/80 font-semibold">Present</p>
            </div>
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{absentCount}</p>
              <p className="text-[10px] text-white/80 font-semibold">Absent</p>
            </div>
          </div>
        </div>
      </section>

      {isLockedBySchedule && evaluationWindow && (
        <div className="p-4 sm:p-5 rounded-[24px] bg-[#EBF3FE] border border-[#DDE8F8] text-[#184880] flex items-start gap-3.5 shadow-2xs">
          <div className="size-10 rounded-2xl bg-white border border-[#DDE8F8] flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="size-5 text-[#184880]" />
          </div>
          <div className="space-y-1">
            <p className="font-extrabold text-sm">
              {evaluationWindow.availability === "ongoing"
                ? "Assessment Currently In Progress — Marks Entry Locked"
                : "Marks Entry Opens After This Assessment Ends"}
            </p>
            <p className="text-xs text-[#184880]/90 leading-relaxed">
              {evaluationWindow.message}
            </p>
          </div>
        </div>
      )}

      {!isLockedBySchedule && isAlreadyEvaluated && (
        <div className="p-4 rounded-[22px] bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-extrabold text-sm">Marks Already Submitted</p>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Marks have been finalized for this assessment.{" "}
                {canEditSubmitted
                  ? "Use Unlock to Edit if you have permission to update marks."
                  : "Contact your instructor or administrator to modify finalized marks."}
              </p>
            </div>
          </div>
          {canEditSubmitted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsUnlockEditing((prev) => !prev)}
              className="rounded-full text-xs font-bold border-amber-300 bg-white hover:bg-amber-100 shrink-0 gap-1.5"
            >
              {isUnlockEditing ? (
                <>
                  <Lock className="size-3.5" />
                  <span>Lock Sheet</span>
                </>
              ) : (
                <>
                  <Unlock className="size-3.5" />
                  <span>Unlock to Edit</span>
                </>
              )}
            </Button>
          ) : (
            <span className="text-xs font-bold text-amber-700 px-3 py-1 bg-amber-100 rounded-full shrink-0">
              Read Only
            </span>
          )}
        </div>
      )}

      <section className="bg-white border border-border/80 rounded-[28px] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Marks Entry Grid</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Grades calculate automatically against {maxMarks} total marks.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary/50 border border-border/70 text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {isLoading ? (
          <DataLoader text="Loading marks evaluation grid..." minHeight="min-h-[240px]" />
        ) : error ? (
          <div className="py-12 text-center space-y-2 text-muted-foreground">
            <p className="text-sm font-bold text-foreground">Unable to Load Marks Sheet</p>
            <p className="text-xs">{(error as Error).message}</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Users className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">No Students Enrolled</p>
            <p className="text-xs max-w-sm mx-auto">
              There are no active enrolled students in this assessment&apos;s classes yet.
            </p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No students match &ldquo;{searchStudent}&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left text-xs uppercase tracking-wider">
                  <th className="pb-3 font-bold pl-2">#</th>
                  <th className="pb-3 font-bold">Student</th>
                  <th className="pb-3 font-bold text-center w-28">Attendance</th>
                  <th className="pb-3 font-bold w-32">Score (/ {maxMarks})</th>
                  <th className="pb-3 font-bold text-center w-24">%</th>
                  <th className="pb-3 font-bold text-center w-20">Grade</th>
                  <th className="pb-3 font-bold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredEntries.map((entry, idx) => {
                  const isAbsent = entry.attendanceStatus === "absent";
                  const isInvalid = !isAbsent && (entry.score < 0 || entry.score > entry.totalMarks);
                  return (
                    <tr key={entry.studentId} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 pl-2 text-xs font-bold text-muted-foreground tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3.5">
                        <span className="font-bold text-foreground block">{entry.studentName}</span>
                        <span className="text-[11px] text-muted-foreground">@{entry.username}</span>
                      </td>
                      <td className="py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAbsent(entry)}
                          disabled={!canEvaluate || isLocked}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all",
                            isAbsent
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            (!canEvaluate || isLocked) && "opacity-70 cursor-not-allowed"
                          )}
                        >
                          {isAbsent ? "Absent" : "Present"}
                        </button>
                      </td>
                      <td className="py-3.5">
                        <Input
                          ref={(el) => {
                            if (el) inputRefs.current.set(idx, el);
                            else inputRefs.current.delete(idx);
                          }}
                          type="number"
                          min={0}
                          max={entry.totalMarks}
                          disabled={isAbsent || !canEvaluate || isLocked}
                          value={isAbsent ? 0 : entry.score}
                          onChange={(e) => handleScoreChange(entry.studentId, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, idx)}
                          className={cn(
                            "w-26 text-center rounded-full h-9 tabular-nums font-bold",
                            isInvalid && "border-rose-500 bg-rose-50 text-rose-600 focus:ring-rose-500"
                          )}
                        />
                      </td>
                      <td className="py-3.5 text-center tabular-nums font-bold text-foreground">
                        {entry.percentage}%
                      </td>
                      <td className="py-3.5 text-center">
                        <span className="inline-flex items-center justify-center size-8 rounded-full bg-[#EBF3FE] text-[#184880] font-extrabold text-xs">
                          {entry.grade}
                        </span>
                      </td>
                      <td className="py-3.5 pr-2">
                        <Input
                          placeholder="Optional remark"
                          disabled={!canEvaluate || isLocked}
                          value={entry.remarks || ""}
                          onChange={(e) => handleRemarksChange(entry.studentId, e.target.value)}
                          className="rounded-full h-9 text-xs"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmSubmitOpen}
        onOpenChange={setConfirmSubmitOpen}
        title="Confirm Final Marks Submission"
        description="Once submitted, marks are finalized and student scorecards/analytics will update immediately."
        confirmLabel="Confirm & Submit"
        isDestructive={false}
        onConfirm={() => saveMutation.mutate("submitted")}
      />
    </div>
  );
}

/**
 * Staff Evaluate Marks view:
 * 1) Default screen shows cards for the selected date's exams, tests/quizzes, papers,
 *    and assignments assigned to the logged-in staff member.
 * 2) Clicking any card opens that assessment's marks evaluation sheet.
 */
export function StaffEvaluateMarksView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryAssessmentId = searchParams?.get("assessmentId") || "";

  const { user, hasPermission } = useAuth();
  const { selectedDate, setSelectedDate, todayDate } = useClientDateState();
  const [categoryFilter, setCategoryFilter] =
    React.useState<EvaluationFilterCategory>("all");
  const [selectedItem, setSelectedItem] = React.useState<ScheduledEvaluationItem | null>(null);
  const [dismissedQueryId, setDismissedQueryId] = React.useState<string | null>(null);

  const canEvaluate = hasPermission("marks.evaluate");
  const canEditSubmitted = hasPermission("marks.update");
  const hasAccess = canEvaluate || hasPermission("marks.view");

  const { data: scheduledResponse, isLoading } = useQuery({
    queryKey: ["staff-scheduled-marks", user?.id, user?.centerId, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/marks/scheduled?date=${selectedDate}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to load assigned evaluations");
      }
      return res.json() as Promise<{ data: ScheduledMarksResponse }>;
    },
    enabled: Boolean(hasAccess && selectedDate),
  });

  const activeAssessmentId =
    selectedItem?.id ||
    (queryAssessmentId && queryAssessmentId !== dismissedQueryId ? queryAssessmentId : null);

  const handleDateChange = (nextDate: string) => {
    setSelectedDate(nextDate);
    setSelectedItem(null);
  };

  const handleBackToCards = () => {
    setSelectedItem(null);
    if (queryAssessmentId) {
      setDismissedQueryId(queryAssessmentId);
      router.replace("/evaluate-marks");
    }
  };

  if (!hasAccess) {
    return (
      <div className="bg-white border border-border/80 rounded-[28px] p-10 text-center space-y-3 shadow-xs">
        <ClipboardList className="size-12 mx-auto text-muted-foreground/40" />
        <h3 className="text-lg font-extrabold text-foreground">Marks Evaluation Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You do not currently have permission to evaluate marks. Ask your instructor or administrator to grant evaluation access.
        </p>
      </div>
    );
  }

  if (activeAssessmentId) {
    return (
      <StaffMarksEvaluationSheet
        key={activeAssessmentId}
        assessmentId={activeAssessmentId}
        previewCard={selectedItem}
        canEvaluate={canEvaluate}
        canEditSubmitted={canEditSubmitted}
        onBack={handleBackToCards}
      />
    );
  }

  const schedule = scheduledResponse?.data;
  const evaluations = schedule?.evaluations || [];
  const summary = schedule?.summary || {
    totalScheduled: 0,
    examsCount: 0,
    testsCount: 0,
    papersCount: 0,
    assignmentsCount: 0,
    completedCount: 0,
    pendingCount: 0,
  };

  const visibleEvaluations = evaluations.filter((item) =>
    matchesEvaluationFilter(item, categoryFilter)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <StaffScheduleHero
        title="Assigned Marks Evaluations"
        selectedDate={selectedDate}
        todayDate={todayDate}
        onDateChange={handleDateChange}
        filterTabs={[
          { key: "all", label: "All Evaluations", count: summary.totalScheduled },
          { key: "exam", label: "Exams", count: summary.examsCount },
          { key: "test", label: "Tests & Quizzes", count: summary.testsCount },
          { key: "paper", label: "Papers", count: summary.papersCount },
          { key: "assignment", label: "Assignments", count: summary.assignmentsCount },
        ]}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
        summaryBadgeLabel="MARKS QUEUE"
        totalScheduled={summary.totalScheduled}
        summarySubtitle={`${summary.completedCount} submitted • ${summary.pendingCount} remaining`}
        statTiles={[
          { label: "Submitted", value: summary.completedCount },
          { label: "Pending", value: summary.pendingCount },
        ]}
      />

      <section>
        {!selectedDate || isLoading ? (
          <DataLoader text="Loading assigned assessments for this date..." minHeight="min-h-[260px]" />
        ) : evaluations.length === 0 ? (
          <div className="bg-white border border-border/80 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
            <ClipboardList className="size-11 mx-auto text-primary/40" />
            <h3 className="text-base font-extrabold text-foreground">
              No Assigned Evaluations on {formatReadableDate(selectedDate)}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You have no exams, tests, papers, or assignments scheduled on this date for mark evaluation. Use the date controls above to check another date.
            </p>
            {todayDate && selectedDate !== todayDate && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDateChange(todayDate)}
                  className="rounded-full h-9 px-4 text-xs font-bold"
                >
                  Back to Today
                </Button>
              </div>
            )}
          </div>
        ) : visibleEvaluations.length === 0 ? (
          <div className="bg-white border border-border/80 rounded-[28px] p-10 text-center space-y-2 shadow-xs">
            <p className="text-sm font-extrabold text-foreground">No Matching Assessments</p>
            <p className="text-xs text-muted-foreground">
              No assessments match this category on {formatReadableDate(selectedDate)}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleEvaluations.map((item) => (
              <ScheduledEvaluationCard
                key={`${item.id}:${item.date}`}
                item={item}
                onSelect={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
