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
  Calendar,
  Users,
  Check,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Laptop,
  Code2,
  Target,
  BookOpen,
  Search,
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

interface SessionStudent {
  studentId: string;
  name: string;
  username: string;
  status: "present" | "absent" | "late" | "excused" | "unmarked";
}

export function TeacherAttendanceView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [selectedDate, setSelectedDate] = React.useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [searchStudent, setSearchStudent] = React.useState("");
  const [finishConfirmOpen, setFinishConfirmOpen] = React.useState(false);

  // Fetch teacher's classes
  const { data: classesData, isLoading: loadingClasses } = useQuery({
    queryKey: ["classes", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json();
    },
  });

  const classes: ClassItem[] = classesData?.data || [];
  const activeClassId = selectedClassId || (classes.length > 0 ? classes[0].id : "");

  // Fetch session attendance
  const { data: sessionData, isLoading: loadingSession } = useQuery({
    queryKey: ["session-attendance", activeClassId, selectedDate],
    queryFn: async () => {
      if (!activeClassId) return null;
      const res = await fetch(
        `/api/v1/attendance/session?classId=${activeClassId}&date=${selectedDate}`
      );
      if (!res.ok) throw new Error("Failed to load session attendance");
      return res.json();
    },
    enabled: !!activeClassId,
  });

  const [students, setStudents] = React.useState<SessionStudent[]>([]);

  React.useEffect(() => {
    if (sessionData?.data?.students) {
      setStudents(sessionData.data.students);
    }
  }, [sessionData]);

  // Save session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      const recordsToSave = students
        .filter((s) => s.status !== "unmarked" || finalize)
        .map((s) => ({
          studentId: s.studentId,
          classId: activeClassId,
          status: s.status === "unmarked" ? ("absent" as const) : s.status,
        }));

      const res = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "class",
          refId: activeClassId,
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
      setFinishConfirmOpen(false);
      toast.success(
        finalize
          ? "Session finalized! All unmarked students marked as Absent."
          : "Session attendance draft saved."
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleStatusChange = (studentId: string, newStatus: SessionStudent["status"]) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status: newStatus } : s))
    );
  };

  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((st) => ({ ...st, status: "present" })));
    toast.info("All students marked as Present (Save to confirm)");
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const absentCount = students.filter((s) => s.status === "absent").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Class Schedule & Attendance
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Track lecture presence, mark arrival statuses, and review student attendance history. Use the one-click action to record all students as present.
            </p>
            <div className="pt-2">
              <Button
                onClick={handleMarkAllPresent}
                disabled={students.length === 0}
                className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
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
                  Class Roster
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

          {/* Combined Option 01 (Quick Actions) + Option 02 (Live Status Widget) */}
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
                disabled={students.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
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

      {/* 3. Session Controls: Class Batch & Date selector */}
      <section className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="w-full sm:w-72">
            <Select
              value={activeClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.subject ? `(${c.subject})` : ""}
                </option>
              ))}
            </Select>
          </div>

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
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => saveSessionMutation.mutate(false)}
            disabled={saveSessionMutation.isPending || students.length === 0}
            className="rounded-full h-11 px-5 text-xs font-bold"
          >
            Save Draft
          </Button>
          <Button
            onClick={() => setFinishConfirmOpen(true)}
            disabled={saveSessionMutation.isPending || students.length === 0}
            className="rounded-full h-11 px-6 text-xs font-bold"
          >
            Finalize Session
          </Button>
        </div>
      </section>

      {/* 4. Student Roster Attendance Grid */}
      <section className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Students Attendance Sheet
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mark each student&apos;s attendance or toggle status quickly.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
            {students.length} Total
          </span>
        </div>

        {loadingSession ? (
          <DataLoader text="Loading attendance sheet..." minHeight="min-h-[200px]" />
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Users className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">No students enrolled</p>
            <p className="text-xs">
              Go to &quot;My Classes&quot; to enroll students into this class batch first.
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
                      <p className="text-sm font-bold text-foreground truncate">{st.name}</p>
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
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border"
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
        title="Finalize Today's Session?"
        description="Finalizing will record any unmarked students as Absent and finalize attendance reports for analytics."
        confirmLabel="Yes, Finalize"
        isDestructive={false}
        onConfirm={() => saveSessionMutation.mutate(true)}
      />
    </div>
  );
}
