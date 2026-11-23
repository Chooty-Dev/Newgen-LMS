"use client";

import * as React from "react";
import Image from "next/image";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

  const handleStatusChange = (index: number, newStatus: SessionStudent["status"]) => {
    setStudents((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
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
      {/* 1. Hero Welcome Banner */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-gradient-to-r from-primary to-[#23589b] text-primary-foreground relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[200px] flex flex-col justify-between">
        <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs text-white">
            <Sparkles className="size-3" />
            <span>Attendance & Schedule</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Class Schedule & Attendance
          </h2>
          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            Mark live attendance for today&apos;s lectures and view historical presence records.
          </p>
          <div className="pt-2">
            <Button
              onClick={handleMarkAllPresent}
              disabled={students.length === 0}
              className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6"
            >
              <Check className="size-4" />
              <span>Mark All Present</span>
            </Button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="pointer-events-none absolute -bottom-2 right-2 sm:right-6 w-44 sm:w-56 h-36 sm:h-44 z-10">
          <Image
            src="/images/schedule.webp"
            alt="Schedule"
            fill
            priority
            className="object-contain object-bottom-right drop-shadow-md"
          />
        </div>
      </section>

      {/* 2. Four KPI Stat Pill Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {students.length}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Class Roster
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {presentCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Present Today
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {lateCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Late Arrivals
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <CalendarCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {absentCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Absent Count
            </p>
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
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
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
            {students.map((st, idx) => (
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
                      onClick={() => handleStatusChange(idx, stat)}
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
