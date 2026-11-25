"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  Lock,
  Search,
  Unlock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataLoader } from "@/components/ui/data-loader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  ScheduledAttendanceItem,
  formatScheduledCategoryLabel,
} from "@/modules/attendance/schedule";
import {
  STAFF_CATEGORY_STYLE,
  StaffScheduleHero,
  formatReadableDate,
  useClientDateState,
} from "./staffSchedulePrimitives";

type FilterCategory = "all" | "class" | "exam" | "test" | "assignment";
type StudentAttendanceStatus = "present" | "absent" | "late" | "excused" | "unmarked";

interface SessionStudent {
  studentId: string;
  name: string;
  username: string;
  classId?: string;
  className?: string;
  status: StudentAttendanceStatus;
}

interface ScheduledResponse {
  date: string;
  dayOfWeek: number;
  summary: {
    totalScheduled: number;
    classesCount: number;
    examsCount: number;
    testsCount: number;
    assignmentsCount: number;
    assessmentsCount: number;
    finalizedCount: number;
    pendingCount: number;
  };
  sessions: ScheduledAttendanceItem[];
}

const STATUS_BUTTONS: Array<{
  value: "present" | "late" | "absent" | "excused";
  label: string;
  activeClass: string;
}> = [
  { value: "present", label: "Present", activeClass: "bg-emerald-600 text-white shadow-xs" },
  { value: "late", label: "Late", activeClass: "bg-amber-500 text-white shadow-xs" },
  { value: "absent", label: "Absent", activeClass: "bg-rose-600 text-white shadow-xs" },
  { value: "excused", label: "Excused", activeClass: "bg-primary text-primary-foreground shadow-xs" },
];

function matchesCategoryFilter(item: ScheduledAttendanceItem, filter: FilterCategory): boolean {
  if (filter === "all") return true;
  if (filter === "class") return item.category === "class";
  if (filter === "exam") return item.category === "exam";
  if (filter === "assignment") return item.category === "assignment";
  return item.category === "test" || item.category === "mcq_quiz" || item.category === "paper";
}

function ScheduledSessionCard({
  item,
  onSelect,
}: {
  item: ScheduledAttendanceItem;
  onSelect: () => void;
}) {
  const catStyle = STAFF_CATEGORY_STYLE[item.category] || STAFF_CATEGORY_STYLE.class;
  const CategoryIcon = catStyle.icon;
  const progressPct =
    item.expectedCount > 0
      ? Math.min(100, Math.round((item.markedCount / item.expectedCount) * 100))
      : 0;

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

          {item.sessionStatus === "finalized" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="size-3" />
              <span>Finalized</span>
            </span>
          ) : item.sessionStatus === "draft" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="size-3" />
              <span>In Progress</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground border border-border/60">
              <span>Pending</span>
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
          {item.kind === "assessment" && item.classNames.length > 0 && (
            <span className="truncate max-w-[190px]">{item.classNames.join(", ")}</span>
          )}
          {item.kind === "class" && item.teacherName && (
            <span className="truncate max-w-[190px]">{item.teacherName}</span>
          )}
        </div>
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
            {item.markedCount}/{item.expectedCount} students marked
          </span>
          <span className="inline-flex items-center gap-1 font-extrabold text-primary group-hover:translate-x-0.5 transition-transform">
            <span>{item.isFinalized ? "View Sheet" : "Mark Attendance"}</span>
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function StaffSessionMarkingSheet({
  session,
  date,
  canMark,
  canEditAttendance,
  onBack,
}: {
  session: ScheduledAttendanceItem;
  date: string;
  canMark: boolean;
  canEditAttendance: boolean;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [searchStudent, setSearchStudent] = React.useState("");
  const [statusOverrides, setStatusOverrides] = React.useState<
    Record<string, StudentAttendanceStatus>
  >({});
  const [isUnlockEditing, setIsUnlockEditing] = React.useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = React.useState(false);

  const { data: sessionResponse, isLoading } = useQuery({
    queryKey: ["session-attendance", session.kind, session.id, date],
    queryFn: async () => {
      const paramName = session.kind === "assessment" ? "assessmentId" : "classId";
      const res = await fetch(
        `/api/v1/attendance/session?kind=${session.kind}&${paramName}=${session.id}&date=${date}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to load session attendance");
      }
      return res.json();
    },
  });

  const serverStudents: SessionStudent[] = React.useMemo(
    () => sessionResponse?.data?.students || [],
    [sessionResponse]
  );

  const students: SessionStudent[] = React.useMemo(
    () =>
      serverStudents.map((st) => ({
        ...st,
        status: statusOverrides[st.studentId] ?? st.status,
      })),
    [serverStudents, statusOverrides]
  );

  const isAlreadyFinalized = sessionResponse?.data?.session?.isFinalized === true;
  const isLocked = isAlreadyFinalized && !isUnlockEditing;

  const saveSessionMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      const recordsToSave = students
        .filter((s) => s.status !== "unmarked" || finalize)
        .map((s) => ({
          studentId: s.studentId,
          classId: s.classId || (session.kind === "class" ? session.id : ""),
          status: s.status === "unmarked" ? ("absent" as const) : s.status,
        }));

      const res = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: session.kind,
          refId: session.id,
          date,
          startTime: session.startTime || "08:00",
          endTime: session.endTime || "18:00",
          records: recordsToSave,
          finalize,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save attendance");
      return json.data;
    },
    onSuccess: (_, finalize) => {
      setStatusOverrides({});
      setFinishConfirmOpen(false);
      setIsUnlockEditing(false);
      queryClient.invalidateQueries({ queryKey: ["session-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["staff-scheduled-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      toast.success(
        finalize
          ? "Attendance finalized. Any unmarked students were marked Absent."
          : "Attendance draft saved."
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleStatusChange = (
    studentId: string,
    newStatus: "present" | "late" | "absent" | "excused"
  ) => {
    if (!canMark) {
      toast.error("You do not have permission to mark attendance.");
      return;
    }
    if (isLocked) {
      toast.error("This session is finalized. Unlock editing to modify records.");
      return;
    }
    setStatusOverrides((prev) => ({ ...prev, [studentId]: newStatus }));
  };

  const handleMarkAllPresent = () => {
    if (!canMark) {
      toast.error("You do not have permission to mark attendance.");
      return;
    }
    if (isLocked) {
      toast.error("This session is finalized. Unlock editing to modify records.");
      return;
    }
    const next: Record<string, StudentAttendanceStatus> = {};
    for (const st of serverStudents) {
      next[st.studentId] = "present";
    }
    setStatusOverrides(next);
    toast.info("All students marked Present (Save or Finalize to confirm).");
  };

  const presentCount = students.filter((s) => s.status === "present").length;
  const lateCount = students.filter((s) => s.status === "late").length;
  const absentCount = students.filter((s) => s.status === "absent").length;
  const excusedCount = students.filter((s) => s.status === "excused").length;

  const filteredStudents = students.filter(
    (s) =>
      !searchStudent ||
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.username.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const catStyle = STAFF_CATEGORY_STYLE[session.category] || STAFF_CATEGORY_STYLE.class;

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
                <span>Back to Assigned Sessions</span>
              </button>

              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border",
                  catStyle.badge
                )}
              >
                <span>{formatScheduledCategoryLabel(session.category)}</span>
              </span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {session.title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                {session.subject} • {formatReadableDate(date)} • {session.startTime} – {session.endTime}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={handleMarkAllPresent}
              disabled={!canMark || isLocked || students.length === 0}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Check className="size-3.5" />
              <span>Mark All Present</span>
            </Button>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => saveSessionMutation.mutate(false)}
                disabled={!canMark || isLocked || saveSessionMutation.isPending || students.length === 0}
                className="rounded-full h-10 px-5 text-xs font-bold"
              >
                {canMark ? "Save Draft" : "View Only"}
              </Button>
              <Button
                type="button"
                onClick={() => setFinishConfirmOpen(true)}
                disabled={!canMark || isLocked || saveSessionMutation.isPending || students.length === 0}
                className="rounded-full h-10 px-5 text-xs font-bold gap-1.5 bg-[#184880] hover:bg-[#184880]/95 text-white"
              >
                {isAlreadyFinalized && !isUnlockEditing ? (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Finalized</span>
                  </>
                ) : (
                  <span>Finalize Session</span>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#184880] text-white rounded-[28px] p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between pb-3">
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-extrabold tracking-wide">
                {isAlreadyFinalized ? "FINALIZED" : "LIVE ROSTER"}
              </span>
              <span className="text-xs font-bold text-white/80 tabular-nums">
                {students.length} Students
              </span>
            </div>
            <p className="text-3xl font-black tabular-nums mt-1">
              {presentCount + lateCount}/{students.length}
            </p>
            <p className="text-xs text-white/80 font-medium mt-0.5">
              Checked in for this session
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-4 mt-4 border-t border-white/15 text-center">
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{presentCount}</p>
              <p className="text-[10px] text-white/80 font-semibold">Present</p>
            </div>
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{lateCount}</p>
              <p className="text-[10px] text-white/80 font-semibold">Late</p>
            </div>
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{absentCount}</p>
              <p className="text-[10px] text-white/80 font-semibold">Absent</p>
            </div>
            <div className="bg-white/10 rounded-2xl py-2 px-1">
              <p className="text-sm font-black tabular-nums">{excusedCount}</p>
              <p className="text-[10px] text-white/80 font-semibold">Excused</p>
            </div>
          </div>
        </div>
      </section>

      {isAlreadyFinalized && (
        <div className="p-4 rounded-[22px] bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-extrabold text-sm">Attendance Already Finalized</p>
              <p className="text-xs text-amber-800/90 mt-0.5">
                Records for this session are locked.{" "}
                {canEditAttendance
                  ? "Use Unlock to Edit if you need to adjust a record."
                  : "Contact an instructor or admin if a correction is needed."}
              </p>
            </div>
          </div>
          {canEditAttendance ? (
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
            <span className="text-xs font-bold text-amber-700 px-3 py-1 bg-amber-100 rounded-full shrink-0">
              Read Only
            </span>
          )}
        </div>
      )}

      <section className="bg-white border border-border/80 rounded-[28px] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Student Attendance Roster</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a status for each enrolled student.
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
          <DataLoader text="Loading session roster..." minHeight="min-h-[220px]" />
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <Users className="size-10 mx-auto opacity-40 text-primary" />
            <p className="text-sm font-bold text-foreground">No Students Enrolled</p>
            <p className="text-xs max-w-sm mx-auto">
              There are no active student enrollments attached to this session yet.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            No students match &ldquo;{searchStudent}&rdquo;.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredStudents.map((st, idx) => (
              <div
                key={st.studentId}
                className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 px-2 hover:bg-secondary/30 rounded-2xl transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-black text-muted-foreground w-7 tabular-nums">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground truncate">{st.name}</p>
                      {st.className && session.kind === "assessment" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground border border-border/60 shrink-0">
                          {st.className}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">@{st.username}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                  {STATUS_BUTTONS.map((btn) => (
                    <button
                      key={btn.value}
                      type="button"
                      onClick={() => handleStatusChange(st.studentId, btn.value)}
                      disabled={!canMark || isLocked}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                        st.status === btn.value
                          ? btn.activeClass
                          : "bg-secondary/70 text-muted-foreground hover:bg-secondary border border-border/60",
                        (!canMark || isLocked) && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={finishConfirmOpen}
        onOpenChange={setFinishConfirmOpen}
        title="Finalize Session Attendance?"
        description="Unmarked students will be automatically recorded as Absent. Once finalized, attendance records are locked."
        confirmLabel="Yes, Finalize"
        isDestructive={false}
        onConfirm={() => saveSessionMutation.mutate(true)}
      />
    </div>
  );
}

/**
 * Staff Attendance workspace following clean role separation:
 * 1) Default view lists cards for classes, exams, tests/quizzes, and assignments scheduled
 *    on the selected date that are assigned to the logged-in staff member.
 * 2) Clicking a card opens that session's dedicated attendance marking sheet.
 */
export function StaffAttendanceView() {
  const { user, hasPermission } = useAuth();
  const { selectedDate, setSelectedDate, todayDate } = useClientDateState();
  const [categoryFilter, setCategoryFilter] = React.useState<FilterCategory>("all");
  const [selectedSession, setSelectedSession] = React.useState<ScheduledAttendanceItem | null>(null);

  const canMark = hasPermission("attendance.mark") || hasPermission("attendance.create");
  const canEditAttendance = hasPermission("attendance.update");
  const hasAccess = hasPermission("attendance.view") || canMark;

  const { data: scheduledResponse, isLoading } = useQuery({
    queryKey: ["staff-scheduled-attendance", user?.id, user?.centerId, selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/attendance/scheduled?date=${selectedDate}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || "Failed to load scheduled sessions");
      }
      return res.json() as Promise<{ data: ScheduledResponse }>;
    },
    enabled: Boolean(hasAccess && selectedDate),
  });

  const handleDateChange = (nextDate: string) => {
    setSelectedDate(nextDate);
    setSelectedSession(null);
  };

  if (!hasAccess) {
    return (
      <div className="bg-white border border-border/80 rounded-[28px] p-10 text-center space-y-3 shadow-xs">
        <Users className="size-12 mx-auto text-muted-foreground/40" />
        <h3 className="text-lg font-extrabold text-foreground">Attendance Access Restricted</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You do not currently have permission to view or mark attendance. Ask your instructor or administrator to grant attendance access.
        </p>
      </div>
    );
  }

  if (selectedSession && selectedDate) {
    return (
      <StaffSessionMarkingSheet
        key={`${selectedSession.kind}:${selectedSession.id}:${selectedDate}`}
        session={selectedSession}
        date={selectedDate}
        canMark={canMark}
        canEditAttendance={canEditAttendance}
        onBack={() => setSelectedSession(null)}
      />
    );
  }

  const schedule = scheduledResponse?.data;
  const sessions = schedule?.sessions || [];
  const summary = schedule?.summary || {
    totalScheduled: 0,
    classesCount: 0,
    examsCount: 0,
    testsCount: 0,
    assignmentsCount: 0,
    assessmentsCount: 0,
    finalizedCount: 0,
    pendingCount: 0,
  };

  const visibleSessions = sessions.filter((item) => matchesCategoryFilter(item, categoryFilter));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <StaffScheduleHero
        title="Assigned Attendance Sessions"
        selectedDate={selectedDate}
        todayDate={todayDate}
        onDateChange={handleDateChange}
        filterTabs={[
          { key: "all", label: "All Duties", count: summary.totalScheduled },
          { key: "class", label: "Classes", count: summary.classesCount },
          { key: "exam", label: "Exams", count: summary.examsCount },
          { key: "test", label: "Tests & Quizzes", count: summary.testsCount },
          { key: "assignment", label: "Assignments", count: summary.assignmentsCount },
        ]}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
        summaryBadgeLabel="MY SCHEDULE"
        totalScheduled={summary.totalScheduled}
        summarySubtitle={`${summary.finalizedCount} finalized • ${summary.pendingCount} remaining`}
        statTiles={[
          { label: "Classes", value: summary.classesCount },
          { label: "Assessments", value: summary.assessmentsCount },
        ]}
      />

      <section>
        {!selectedDate || isLoading ? (
          <DataLoader text="Loading assigned sessions for this date..." minHeight="min-h-[260px]" />
        ) : sessions.length === 0 ? (
          <div className="bg-white border border-border/80 rounded-[28px] p-12 text-center space-y-3 shadow-xs">
            <CalendarCheck className="size-11 mx-auto text-primary/40" />
            <h3 className="text-base font-extrabold text-foreground">
              No Assigned Sessions on {formatReadableDate(selectedDate)}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You have no classes, tests, exams, or assignments scheduled for this date. Select another date above to check other days.
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
        ) : visibleSessions.length === 0 ? (
          <div className="bg-white border border-border/80 rounded-[28px] p-10 text-center space-y-2 shadow-xs">
            <p className="text-sm font-extrabold text-foreground">No Matching Items</p>
            <p className="text-xs text-muted-foreground">
              No sessions match the selected category on {formatReadableDate(selectedDate)}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleSessions.map((item) => (
              <ScheduledSessionCard
                key={`${item.kind}:${item.id}:${item.date}`}
                item={item}
                onSelect={() => setSelectedSession(item)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
