"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Users,
  Check,
  Search,
  BookOpen,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { DataLoader } from "@/components/ui/data-loader";

interface ClassItem {
  id: string;
  name: string;
  subject?: string;
}

interface AssessmentItem {
  id: string;
  title: string;
  type?: string;
  subject?: { name: string; code: string } | string;
}

interface SessionStudent {
  studentId: string;
  name: string;
  username: string;
  classId?: string;
  className?: string;
  status: "present" | "absent" | "late" | "excused" | "unmarked";
}

export function TeacherAttendanceView() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();

  const canMark =
    hasPermission("attendance.mark") ||
    hasPermission("attendance.create") ||
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  const canEditAttendance =
    hasPermission("attendance.update") ||
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  const hasAccess =
    hasPermission("attendance.view") ||
    canMark ||
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "super_admin";

  const [sessionKind, setSessionKind] = React.useState<"class" | "assessment">("class");
  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [selectedAssessmentId, setSelectedAssessmentId] = React.useState<string>("");
  const [searchStudent, setSearchStudent] = React.useState("");
  const [finishConfirmOpen, setFinishConfirmOpen] = React.useState(false);
  const [isUnlockEditing, setIsUnlockEditing] = React.useState(false);

  // Reset unlock editing when target changes
  React.useEffect(() => {
    setIsUnlockEditing(false);
  }, [sessionKind, selectedClassId, selectedAssessmentId, selectedDate]);

  // Fetch classes
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ["classes", user?.role, user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json();
    },
  });

  // Fetch assessments (tests, exams, quizzes, assignments)
  const { data: assessmentsData, isLoading: loadingAssessments } = useQuery({
    queryKey: ["assessments", user?.role, user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/exams");
      if (!res.ok) throw new Error("Failed to load assessments");
      return res.json();
    },
  });

  const classes: ClassItem[] = classesData?.data || [];
  const assessments: AssessmentItem[] = assessmentsData?.data || [];

  const activeClassId = selectedClassId || (classes.length > 0 ? classes[0].id : "");
  const activeAssessmentId =
    selectedAssessmentId || (assessments.length > 0 ? assessments[0].id : "");

  const activeRefId = sessionKind === "class" ? activeClassId : activeAssessmentId;

  // Fetch session attendance
  const { data: sessionData, isLoading: loadingSession } = useQuery({
    queryKey: ["session-attendance", sessionKind, activeRefId, selectedDate],
    queryFn: async () => {
      if (!activeRefId) return null;
      const paramName = sessionKind === "assessment" ? "assessmentId" : "classId";
      const res = await fetch(
        `/api/v1/attendance/session?kind=${sessionKind}&${paramName}=${activeRefId}&date=${selectedDate}`
      );
      if (!res.ok) throw new Error("Failed to load session attendance");
      return res.json();
    },
    enabled: !!activeRefId,
  });

  const [students, setStudents] = React.useState<SessionStudent[]>([]);

  React.useEffect(() => {
    if (sessionData?.data?.students) {
      setStudents(sessionData.data.students);
    } else {
      setStudents([]);
    }
  }, [sessionData]);

  const isAlreadyFinalized = sessionData?.data?.session?.isFinalized === true;
  const isLocked = isAlreadyFinalized && !isUnlockEditing;

  // Save session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      const recordsToSave = students
        .filter((s) => s.status !== "unmarked" || finalize)
        .map((s) => ({
          studentId: s.studentId,
          classId: s.classId || (sessionKind === "class" ? activeRefId : undefined),
          status: s.status === "unmarked" ? ("absent" as const) : s.status,
        }));

      const res = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: sessionKind,
          refId: activeRefId,
          date: selectedDate,
          startTime: "08:00",
          endTime: "18:00",
          records: recordsToSave,
          finalize,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save attendance");
      return json.data;
    },
    onSuccess: (_, finalize) => {
      queryClient.invalidateQueries({ queryKey: ["session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      setFinishConfirmOpen(false);
      setIsUnlockEditing(false);
      toast.success(
        finalize
          ? "Attendance finalized! Unmarked students recorded as Absent."
          : "Attendance draft saved successfully."
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleStatusChange = (studentId: string, newStatus: SessionStudent["status"]) => {
    if (isLocked) {
      toast.error("This session is finalized. Unlock editing to modify records.");
      return;
    }
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const handleMarkAllPresent = () => {
    if (isLocked) {
      toast.error("This session is finalized. Unlock editing to modify records.");
      return;
    }
    setStudents((prev) => prev.map((st) => ({ ...st, status: "present" })));
    toast.info("All students marked as Present (Save to confirm)");
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const absentCount = students.filter((s) => s.status === "absent").length;

  if (!hasAccess) {
    return (
      <div className="min-h-[350px] flex flex-col items-center justify-center p-8 text-center space-y-3 bg-card border border-border rounded-3xl shadow-sm">
        <Users className="size-12 text-muted-foreground/40" />
        <h3 className="text-lg font-bold text-foreground">Attendance Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          You do not have permission to view or mark attendance. Please contact your instructor or administrator to grant you attendance access.
        </p>
      </div>
    );
  }

  const currentItemCount = sessionKind === "class" ? classes.length : assessments.length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {sessionKind === "class" ? "Class Schedule & Attendance" : "Assessment & Exam Attendance"}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Record student presence for lectures, tests, exams, and quizzes. Once finalized, attendance records are locked to protect student analytics.
            </p>
            <div className="pt-2">
              <Button
                onClick={handleMarkAllPresent}
                disabled={isLocked || students.length === 0}
                className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                <Check className="size-4" />
                <span>Mark All Present</span>
              </Button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-class-bg.webp"
                alt="Attendance"
                fill
                priority
                className="object-contain object-right drop-shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* 4 Stats Cards + Search Bar: 4 cols on lg (1/3 width) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* 4 Stats Cards tightly grouped in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {students.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Roster
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {presentCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Present Today
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {lateCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Late Arrivals
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {absentCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Absent Count
                </p>
              </div>
            </div>
          </div>

          {/* Live Status Widget */}
          <div className="bg-card border border-border/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-foreground truncate">
                {presentCount}/{students.length} Students Checked In
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                disabled={isLocked || students.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Check className="size-3" />
                <span>All Present</span>
              </button>
              <Link
                href="/classes"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <Clock className="size-3 text-primary" />
                <span>Classes</span>
              </Link>
            </div>
          </div>

          {/* Search bar directly beneath cards */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students in session..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* 2. Session Controls: Kind Switcher + Target Selector + Date selector */}
      <section className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Kind Switcher: Classes vs Assessments */}
            <div className="flex items-center bg-secondary/80 border border-border rounded-full p-1 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setSessionKind("class")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                  sessionKind === "class"
                    ? "bg-white text-primary shadow-xs dark:bg-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="size-3.5" />
                <span>Class Batches</span>
              </button>
              <button
                type="button"
                onClick={() => setSessionKind("assessment")}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                  sessionKind === "assessment"
                    ? "bg-white text-primary shadow-xs dark:bg-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <BookOpen className="size-3.5" />
                <span>Tests & Assessments</span>
              </button>
            </div>

            {/* Target Select Dropdown */}
            <div className="w-full sm:w-72">
              {sessionKind === "class" ? (
                <Select
                  value={activeClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={loadingClasses || classes.length === 0}
                >
                  {loadingClasses ? (
                    <option value="">Loading assigned classes...</option>
                  ) : classes.length === 0 ? (
                    <option value="">No classes assigned to you</option>
                  ) : (
                    classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.subject ? `(${c.subject})` : ""}
                      </option>
                    ))
                  )}
                </Select>
              ) : (
                <Select
                  value={activeAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  disabled={loadingAssessments || assessments.length === 0}
                >
                  {loadingAssessments ? (
                    <option value="">Loading assessments...</option>
                  ) : assessments.length === 0 ? (
                    <option value="">No tests or assessments assigned</option>
                  ) : (
                    assessments.map((a) => {
                      const subLabel =
                        typeof a.subject === "object" && a.subject !== null
                          ? a.subject.code || a.subject.name
                          : a.subject;
                      return (
                        <option key={a.id} value={a.id}>
                          [{a.type ? a.type.toUpperCase() : "TEST"}] {a.title} {subLabel ? `(${subLabel})` : ""}
                        </option>
                      );
                    })
                  )}
                </Select>
              )}
            </div>

            {/* Date Picker */}
            <div className="w-full sm:w-48">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-12 px-4 rounded-full bg-secondary border border-border text-xs sm:text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-end lg:self-center">
            <Button
              variant="outline"
              onClick={() => saveSessionMutation.mutate(false)}
              disabled={isLocked || saveSessionMutation.isPending || students.length === 0 || !canMark}
              className="rounded-full h-11 px-5 text-xs font-bold"
            >
              {canMark ? "Save Draft" : "View Only"}
            </Button>
            <Button
              onClick={() => setFinishConfirmOpen(true)}
              disabled={isLocked || saveSessionMutation.isPending || students.length === 0 || !canMark}
              className="rounded-full h-11 px-6 text-xs font-bold gap-1.5"
            >
              {isAlreadyFinalized && !isUnlockEditing ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span>Already Finalized</span>
                </>
              ) : (
                <span>Finalize Session</span>
              )}
            </Button>
          </div>
        </div>

        {/* Finalized Session Lock Alert Banner */}
        {isAlreadyFinalized && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-extrabold text-sm">Attendance Already Finalized</p>
                <p className="text-xs opacity-90 mt-0.5">
                  Attendance has already been marked and finalized for this session. Modifying records is locked to protect student records.
                </p>
              </div>
            </div>
            {canEditAttendance ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsUnlockEditing((prev) => !prev)}
                className="rounded-full text-xs font-bold border-amber-500/50 hover:bg-amber-500/20 shrink-0 gap-1.5"
              >
                {isUnlockEditing ? (
                  <>
                    <Lock className="size-3.5" />
                    <span>Lock Session</span>
                  </>
                ) : (
                  <>
                    <Unlock className="size-3.5" />
                    <span>Unlock to Edit</span>
                  </>
                )}
              </Button>
            ) : (
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 px-3 py-1 bg-amber-500/20 rounded-full shrink-0">
                Read Only
              </span>
            )}
          </div>
        )}
      </section>

      {/* 3. Student Roster Attendance Grid */}
      <section className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              {sessionKind === "class" ? "Class Attendance Sheet" : "Assessment Attendance Sheet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mark each student&apos;s attendance or toggle status quickly.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
            {students.length} Total
          </span>
        </div>

        {loadingClasses || loadingAssessments || loadingSession ? (
          <DataLoader text="Loading attendance sheet..." minHeight="min-h-[200px]" />
        ) : currentItemCount === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Users className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">
              {sessionKind === "class" ? "No Classes Assigned" : "No Assessments Assigned"}
            </p>
            <p className="text-xs max-w-sm mx-auto">
              {sessionKind === "class"
                ? "You do not have any class batches assigned to your account yet. Please ask your instructor or administrator to assign you to a class."
                : "You do not have any tests or assessments assigned to your account yet. Please ask your teacher to assign you as an evaluator."}
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Users className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">No students enrolled</p>
            <p className="text-xs">
              {sessionKind === "class"
                ? 'Go to "My Classes" to enroll students into this class batch first.'
                : "Enrolled students from attached classes will appear here automatically."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {students
              .filter(
                (s) =>
                  !searchStudent ||
                  s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
                  s.username.toLowerCase().includes(searchStudent.toLowerCase())
              )
              .map((st, idx) => (
                <div
                  key={st.studentId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 hover:bg-secondary/30 px-3 rounded-2xl transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-black text-muted-foreground w-6 tabular-nums">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-foreground truncate">{st.name}</p>
                        {st.className && sessionKind === "assessment" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border">
                            {st.className}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{st.username}</p>
                    </div>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {(["present", "late", "absent", "excused"] as const).map((stat) => (
                      <button
                        key={stat}
                        type="button"
                        onClick={() => handleStatusChange(st.studentId, stat)}
                        disabled={isLocked}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-bold capitalize transition-all cursor-pointer",
                          st.status === stat
                            ? stat === "present"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : stat === "late"
                              ? "bg-amber-500 text-white shadow-sm"
                              : stat === "absent"
                              ? "bg-rose-600 text-white shadow-sm"
                              : "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border",
                          isLocked && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {stat}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Finalize Confirm Dialog */}
      <ConfirmDialog
        open={finishConfirmOpen}
        onOpenChange={setFinishConfirmOpen}
        title="Finalize Attendance?"
        description="Are you sure you want to finalize attendance for this session? Any unmarked students will be automatically recorded as Absent. Once finalized, records cannot be changed without special edit permission."
        confirmLabel="Yes, Finalize"
        isDestructive={false}
        onConfirm={() => saveSessionMutation.mutate(true)}
      />
    </div>
  );
}
