"use client";

import * as React from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Check,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AdminAssetTiles, AdminStatusPill, AdminSurface } from "./AdminUI";

interface OverviewData {
  expectedToday: number;
  attended: number;
  absent: number;
  leftToMark: number;
  classesToday: number;
}

interface StudentDayItem {
  type: "class" | "assessment";
  refId: string;
  classId: string;
  assessmentId?: string;
  title: string;
  subject: string;
  time: string;
  attendanceStatus: "present" | "absent" | "late" | "excused" | "unmarked";
  attendanceId?: string;
}

interface SessionStudent {
  studentId: string;
  name: string;
  username: string;
  classId?: string;
  className?: string;
  status: "present" | "absent" | "late" | "excused" | "unmarked";
}

function AdminSessionEditor({
  kind,
  refId,
  date,
  initialStudents,
  isAlreadyFinalized,
  onSaved,
}: {
  kind: "class" | "assessment";
  refId: string;
  date: string;
  initialStudents: SessionStudent[];
  isAlreadyFinalized: boolean;
  onSaved: () => void;
}) {
  const [students, setStudents] = React.useState<SessionStudent[]>(initialStudents);
  const [finishConfirmOpen, setFinishConfirmOpen] = React.useState(false);

  const saveSessionMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      const recordsToSave = students
        .filter((s) => s.status !== "unmarked" || finalize)
        .map((s) => ({
          studentId: s.studentId,
          classId: s.classId || (kind === "class" ? refId : ""),
          status: s.status === "unmarked" ? ("absent" as const) : s.status,
        }));

      const res = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          refId,
          date,
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
      onSaved();
      setFinishConfirmOpen(false);
      toast.success(finalize ? "Session finalized" : "Draft saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((st) => ({ ...st, status: "present" })));
    toast.info("All marked present (save to apply)");
  };

  const handleStatusChange = (index: number, newStatus: SessionStudent["status"]) => {
    setStudents((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: newStatus };
      return updated;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--admin-border)]">
        <div>
          {isAlreadyFinalized && <AdminStatusPill label="Finalized" tone="primary" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full h-9 text-xs" onClick={handleMarkAllPresent}>
            All Present
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-9 text-xs"
            onClick={() => saveSessionMutation.mutate(false)}
            disabled={saveSessionMutation.isPending}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            className="rounded-full h-9 px-4 text-xs font-bold"
            onClick={() => setFinishConfirmOpen(true)}
            disabled={saveSessionMutation.isPending}
          >
            Finalize Session
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[var(--admin-border)] text-[11px] font-semibold text-[var(--muted-foreground)]">
              <th className="py-3 pl-2">#</th>
              <th className="py-3">Student</th>
              <th className="py-3 text-right pr-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border)]/60 text-xs">
            {students.map((st, idx) => (
              <tr key={st.studentId} className="hover:bg-[var(--admin-surface)]/70">
                <td className="py-3 pl-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                <td className="py-3">
                  <span className="font-bold text-foreground block">{st.name}</span>
                  <span className="text-[11px] text-muted-foreground">@{st.username}</span>
                </td>
                <td className="py-3 text-right pr-2">
                  <div className="inline-flex gap-1.5">
                    {(["present", "late", "absent", "excused"] as const).map((stat) => (
                      <button
                        type="button"
                        key={stat}
                        onClick={() => handleStatusChange(idx, stat)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[11px] font-bold capitalize cursor-pointer transition-all",
                          st.status === stat
                            ? stat === "absent"
                              ? "bg-rose-600 text-white"
                              : "bg-[var(--primary)] text-white"
                            : "bg-[var(--admin-surface)] text-[var(--muted-foreground)] border border-[var(--admin-border)] hover:text-[var(--foreground)]"
                        )}
                      >
                        {stat}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={finishConfirmOpen}
        onOpenChange={setFinishConfirmOpen}
        title="Finalize attendance?"
        description="Unmarked students will be marked Absent automatically."
        confirmLabel="Finalize"
        isDestructive={false}
        onConfirm={async () => {
          await saveSessionMutation.mutateAsync(true);
        }}
      />
    </div>
  );
}

export function AdminAttendanceView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = React.useState("");
  React.useEffect(() => {
    const id = setTimeout(() => {
      setSelectedDate((prev) => prev || new Date().toISOString().slice(0, 10));
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const [activeTab, setActiveTab] = React.useState<"by-student" | "by-session">("by-session");
  const [sessionKind, setSessionKind] = React.useState<"class" | "assessment">("class");

  const [studentSearch, setStudentSearch] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [selectedAssessmentId, setSelectedAssessmentId] = React.useState("");

  const { data: overviewData } = useQuery({
    queryKey: ["attendance-overview", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/attendance/overview?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to load overview");
      return res.json();
    },
    enabled: !!selectedDate,
  });

  const overview: OverviewData = overviewData?.data || {
    expectedToday: 0,
    attended: 0,
    absent: 0,
    leftToMark: 0,
    classesToday: 0,
  };

  const { data: studentsData } = useQuery({
    queryKey: ["students-attendance-search", studentSearch],
    queryFn: async () => {
      if (!studentSearch || studentSearch.length < 2) return { data: [] };
      const res = await fetch(`/api/v1/students?search=${encodeURIComponent(studentSearch)}&limit=10`);
      if (!res.ok) throw new Error("Failed to search students");
      return res.json();
    },
    enabled: studentSearch.length >= 2,
  });

  const studentSearchResults = studentsData?.data || [];

  const { data: studentScheduleData, isLoading: studentScheduleLoading } = useQuery({
    queryKey: ["student-day-schedule", selectedStudentId, selectedDate],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const res = await fetch(`/api/v1/attendance/student?studentId=${selectedStudentId}&date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to load schedule");
      return res.json();
    },
    enabled: !!selectedStudentId && !!selectedDate,
  });

  const studentItems: StudentDayItem[] = studentScheduleData?.data?.items || [];

  const { data: classesData } = useQuery({
    queryKey: ["classes-list", user?.centerId],
    queryFn: async () => (await fetch("/api/v1/classes")).json(),
  });
  const { data: examsData } = useQuery({
    queryKey: ["exams-list", user?.centerId],
    queryFn: async () => (await fetch("/api/v1/exams")).json(),
  });

  const classes = classesData?.data || [];
  const assessments = examsData?.data || [];
  const activeRefId = sessionKind === "class" ? selectedClassId : selectedAssessmentId;

  const { data: sessionViewData, isLoading: sessionLoading } = useQuery({
    queryKey: ["session-view", sessionKind, activeRefId, selectedDate],
    queryFn: async () => {
      if (!activeRefId || !selectedDate) return null;
      const paramName = sessionKind === "assessment" ? "assessmentId" : "classId";
      const res = await fetch(`/api/v1/attendance/session?kind=${sessionKind}&${paramName}=${activeRefId}&date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to load session");
      return res.json();
    },
    enabled: !!activeRefId && !!selectedDate,
  });

  const markSingleMutation = useMutation({
    mutationFn: async (item: StudentDayItem) => {
      const res = await fetch("/api/v1/attendance/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          classId: item.classId,
          assessmentId: item.assessmentId,
          date: selectedDate,
          status: "present",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to mark");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-day-schedule", selectedStudentId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["attendance-overview", selectedDate] });
      toast.success("Marked Present");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={4}
        items={[
          { label: "Expected", value: overview.expectedToday, icon: CalendarCheck, badge: `${overview.classesToday} classes`, tone: 1 },
          { label: "Attended", value: overview.attended, icon: CheckCircle2, badge: "Present", tone: 2 },
          { label: "Absent", value: overview.absent, icon: XCircle, badge: "Recorded", tone: 3 },
          { label: "Unmarked", value: overview.leftToMark, icon: Clock, badge: "Remaining", tone: 1 },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)]">
          <button
            type="button"
            onClick={() => setActiveTab("by-session")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer",
              activeTab === "by-session" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
            )}
          >
            By Session
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("by-student")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer",
              activeTab === "by-student" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
            )}
          >
            By Student
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-10 rounded-full text-xs w-40 bg-white"
          />
          <Can permission="attendance.export">
            <Button
              variant="outline"
              onClick={() => window.open(`/api/v1/attendance/export?date=${selectedDate}`, "_blank")}
              className="rounded-full h-10 px-4 text-xs font-bold gap-1.5"
            >
              <Download className="size-3.5" />
              <span>Export</span>
            </Button>
          </Can>
        </div>
      </div>

      {activeTab === "by-session" ? (
        <AdminSurface className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex gap-1 p-1 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)]">
              <button
                type="button"
                onClick={() => setSessionKind("class")}
                className={cn(
                  "px-3.5 py-1 rounded-full text-xs font-bold cursor-pointer",
                  sessionKind === "class" ? "bg-white text-[var(--primary)] shadow-2xs" : "text-[var(--muted-foreground)]"
                )}
              >
                Classes
              </button>
              <button
                type="button"
                onClick={() => setSessionKind("assessment")}
                className={cn(
                  "px-3.5 py-1 rounded-full text-xs font-bold cursor-pointer",
                  sessionKind === "assessment" ? "bg-white text-[var(--primary)] shadow-2xs" : "text-[var(--muted-foreground)]"
                )}
              >
                Assessments
              </button>
            </div>

            <div className="flex-1 max-w-sm">
              {sessionKind === "class" ? (
                <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="h-10 rounded-full text-xs">
                  <option value="">Select class...</option>
                  {classes.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              ) : (
                <Select value={selectedAssessmentId} onChange={(e) => setSelectedAssessmentId(e.target.value)} className="h-10 rounded-full text-xs">
                  <option value="">Select assessment...</option>
                  {assessments.map((a: { id: string; title: string; type: string }) => (
                    <option key={a.id} value={a.id}>[{a.type.toUpperCase()}] {a.title}</option>
                  ))}
                </Select>
              )}
            </div>
          </div>

          {activeRefId ? (
            sessionLoading ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Loading session...</p>
            ) : !sessionViewData?.data?.students?.length ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No students enrolled.</p>
            ) : (
              <AdminSessionEditor
                key={`${sessionKind}-${activeRefId}-${selectedDate}-${sessionViewData.data.session?.isFinalized}`}
                kind={sessionKind}
                refId={activeRefId}
                date={selectedDate}
                initialStudents={sessionViewData.data.students}
                isAlreadyFinalized={!!sessionViewData.data.session?.isFinalized}
                onSaved={() => {
                  queryClient.invalidateQueries({ queryKey: ["session-view"] });
                  queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
                }}
              />
            )
          ) : (
            <p className="py-8 text-center text-xs text-muted-foreground">Select a class or assessment above.</p>
          )}
        </AdminSurface>
      ) : (
        <AdminSurface className="p-5 sm:p-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student name or username..."
              className="w-full h-10 pl-10 pr-4 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] text-xs focus:outline-none"
            />
          </div>

          {studentSearchResults.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {studentSearchResults.map((st: { id: string; name: string; username: string }) => (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setSelectedStudentId(st.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer",
                    selectedStudentId === st.id
                      ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                      : "bg-white border-[var(--admin-border)]"
                  )}
                >
                  {st.name} (@{st.username})
                </button>
              ))}
            </div>
          )}

          {selectedStudentId ? (
            studentScheduleLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading schedule...</p>
            ) : studentItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">No sessions on {selectedDate}.</p>
            ) : (
              <div className="space-y-2.5">
                {studentItems.map((item) => (
                  <div
                    key={item.refId}
                    className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[var(--admin-surface)] border border-[var(--admin-border)] text-xs"
                  >
                    <div>
                      <span className="font-bold block">{item.title}</span>
                      <span className="text-[11px] text-muted-foreground">{item.subject} • {item.time}</span>
                    </div>
                    {item.attendanceStatus === "unmarked" ? (
                      <Button size="sm" className="rounded-full h-8 text-xs gap-1" onClick={() => markSingleMutation.mutate(item)}>
                        <Check className="size-3.5" />
                        <span>Present</span>
                      </Button>
                    ) : (
                      <AdminStatusPill label={item.attendanceStatus} tone={item.attendanceStatus === "absent" ? "danger" : "primary"} />
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">Search and pick a student.</p>
          )}
        </AdminSurface>
      )}
    </div>
  );
}
