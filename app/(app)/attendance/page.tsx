"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Users,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
  status: "present" | "absent" | "late" | "excused" | "unmarked";
}

function SessionStudentsEditor({
  classId,
  date,
  initialStudents,
  onSaved,
}: {
  classId: string;
  date: string;
  initialStudents: SessionStudent[];
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
          classId,
          status: s.status === "unmarked" ? ("absent" as const) : s.status,
        }));

      const res = await fetch("/api/v1/attendance/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "class",
          refId: classId,
          date,
          startTime: "08:00",
          endTime: "18:00",
          records: recordsToSave,
          finalize,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save session attendance");
      return json.data;
    },
    onSuccess: (_, finalize) => {
      onSaved();
      setFinishConfirmOpen(false);
      toast.success(
        finalize
          ? "Session finished! All unmarked students recorded as Absent."
          : "Session attendance saved."
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleMarkAllPresent = () => {
    setStudents((prev) => prev.map((st) => ({ ...st, status: "present" })));
    toast.info("All marked as present (save to confirm)");
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
      <div className="flex flex-wrap items-center justify-end gap-3 pb-4 border-b border-border">
        <Button variant="outline" className="rounded-full h-12" onClick={handleMarkAllPresent}>
          Mark all present
        </Button>
        <Button
          variant="outline"
          className="rounded-full h-12"
          onClick={() => saveSessionMutation.mutate(false)}
          disabled={saveSessionMutation.isPending}
        >
          Save Draft
        </Button>
        <Button
          className="rounded-full h-12"
          onClick={() => setFinishConfirmOpen(true)}
          disabled={saveSessionMutation.isPending}
        >
          Finish Session
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-left">
              <th className="pb-4 font-semibold pl-2">#</th>
              <th className="pb-4 font-semibold">Student Name</th>
              <th className="pb-4 font-semibold text-right pr-4">Attendance Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((st, idx) => (
              <tr key={st.studentId} className="hover:bg-muted/30 transition-colors">
                <td className="py-4 pl-2 text-muted-foreground">{idx + 1}</td>
                <td className="py-4">
                  <span className="font-semibold text-foreground block">{st.name}</span>
                  <span className="text-xs text-muted-foreground">{st.username}</span>
                </td>
                <td className="py-4 text-right pr-4">
                  <div className="inline-flex gap-2">
                    {(["present", "late", "absent", "excused"] as const).map((stat) => (
                      <button
                        type="button"
                        key={stat}
                        onClick={() => handleStatusChange(idx, stat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize cursor-pointer transition-all ${
                          st.status === stat
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : "bg-muted text-foreground hover:opacity-80"
                        }`}
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
        title="Finish Attendance Session?"
        description="All unmarked students will be recorded as Absent automatically."
        confirmLabel="Finish & Record Absent"
        isDestructive={false}
        onConfirm={async () => {
          await saveSessionMutation.mutateAsync(true);
        }}
      />
    </div>
  );
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = React.useState("2026-11-20");

  const [activeTab, setActiveTab] = React.useState("by-student");

  // Mode 1: Search by Student
  const [studentSearch, setStudentSearch] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);

  // Mode 2: Session View
  const [selectedClassId, setSelectedClassId] = React.useState("");

  const { data: overviewData } = useQuery({
    queryKey: ["attendance-overview", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/v1/attendance/overview?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to load overview");
      return res.json();
    },
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
      const res = await fetch(
        `/api/v1/attendance/student?studentId=${selectedStudentId}&date=${selectedDate}`
      );
      if (!res.ok) throw new Error("Failed to load student schedule");
      return res.json();
    },
    enabled: !!selectedStudentId,
  });

  const studentItems: StudentDayItem[] = studentScheduleData?.data?.items || [];

  const { data: classesData } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => (await fetch("/api/v1/classes")).json(),
  });

  const classes = classesData?.data || [];

  const { data: sessionViewData, isLoading: sessionLoading } = useQuery({
    queryKey: ["session-view", selectedClassId, selectedDate],
    queryFn: async () => {
      if (!selectedClassId) return null;
      const res = await fetch(
        `/api/v1/attendance/session?classId=${selectedClassId}&date=${selectedDate}`
      );
      if (!res.ok) throw new Error("Failed to load session view");
      return res.json();
    },
    enabled: !!selectedClassId,
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
      if (!res.ok) throw new Error(json.error?.message || "Failed to mark attendance");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-day-schedule", selectedStudentId, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ["attendance-overview", selectedDate] });
      toast.success("Marked as Attended");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" description="Mark who came today.">
        <Can permission="attendance.export">
          <Button
            variant="outline"
            className="rounded-full h-12"
            onClick={() => window.open(`/api/v1/attendance/export?date=${selectedDate}`, "_blank")}
          >
            <Download className="size-5 mr-2" />
            Export CSV
          </Button>
        </Can>
      </PageHeader>

      <Card className="rounded-3xl border-border bg-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarCheck className="size-6 text-foreground stroke-[1.8]" />
          <div>
            <span className="text-base font-semibold text-foreground block">Attendance Date</span>
            <span className="text-xs text-muted-foreground">Select date for records</span>
          </div>
        </div>
        <div className="w-full sm:w-56">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-full h-12 text-base"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <StatCard label="Expected Today" value={overview.expectedToday} subtitle={`${overview.classesToday} classes scheduled`} icon={Users} />
        <StatCard label="Attended" value={overview.attended} subtitle="Present & on-time" icon={CheckCircle2} />
        <StatCard label="Recorded Absent" value={overview.absent} subtitle="Confirmed absent" icon={XCircle} />
        <StatCard label="Left to Mark" value={overview.leftToMark} subtitle="Pending verification" icon={Clock} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="by-student">Search by Student</TabsTrigger>
          <TabsTrigger value="by-session">Session View</TabsTrigger>
        </TabsList>

        <TabsContent value="by-student" className="space-y-6">
          <Card className="rounded-3xl border-border bg-card p-6 md:p-8">
            <CardHeader>
              <CardTitle>Find Student</CardTitle>
              <CardDescription>
                Search a student to view and mark everything they have scheduled on {selectedDate}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative max-w-md">
                <SearchInput
                  value={studentSearch}
                  onValueChange={setStudentSearch}
                  placeholder="Type student name or username..."
                />
                {studentSearchResults.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-14 rounded-3xl bg-card border border-border shadow-2xl p-2 space-y-1">
                    {studentSearchResults.map((s: { id: string; name: string; username: string; grade: string }) => (
                      <button
                        type="button"
                        key={s.id}
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setStudentSearch(`${s.name} (${s.username})`);
                        }}
                        className="w-full text-left p-3 rounded-2xl hover:bg-muted transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-foreground text-sm">{s.name}</span>
                        <span className="text-xs text-muted-foreground">{s.grade} • {s.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudentId && (
                <div className="mt-8 pt-6 border-t border-border space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    Scheduled Items for {selectedDate}
                  </h3>

                  {studentScheduleLoading ? (
                    <p className="text-muted-foreground py-6">Loading schedule...</p>
                  ) : studentItems.length === 0 ? (
                    <p className="text-muted-foreground py-6">
                      This student has no classes or exams scheduled on {selectedDate}.
                    </p>
                  ) : (
                    <div className="divide-y divide-border rounded-3xl border border-border bg-muted/20">
                      {studentItems.map((item, idx) => {
                        const isAttended = item.attendanceStatus === "present" || item.attendanceStatus === "late";
                        return (
                          <div key={idx} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold uppercase rounded-full bg-muted px-2.5 py-0.5 text-foreground">
                                  {item.type}
                                </span>
                                <span className="font-semibold text-lg text-foreground">{item.title}</span>
                              </div>
                              <span className="text-sm text-muted-foreground block mt-1">
                                {item.subject} • {item.time}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              {isAttended ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold">
                                  <Check className="size-4" /> Attended
                                </span>
                              ) : (
                                <Button
                                  className="rounded-full h-10 px-6 font-semibold"
                                  onClick={() => markSingleMutation.mutate(item)}
                                  disabled={markSingleMutation.isPending}
                                >
                                  Mark as Attended
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-session" className="space-y-6">
          <Card className="rounded-3xl border-border bg-card p-6 md:p-8">
            <div className="w-full sm:w-80 pb-6">
              <label className="text-sm font-semibold text-foreground block pl-2 mb-1">
                Choose Class Session
              </label>
              <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                <option value="">Select a class...</option>
                {classes.map((c: { id: string; name: string; subject: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.subject})
                  </option>
                ))}
              </Select>
            </div>

            <div className="mt-2">
              {!selectedClassId ? (
                <p className="text-center py-12 text-muted-foreground">
                  Select a class above to view and take attendance.
                </p>
              ) : sessionLoading ? (
                <p className="text-center py-12 text-muted-foreground">Loading session students...</p>
              ) : !sessionViewData?.data?.students?.length ? (
                <p className="text-center py-12 text-muted-foreground">
                  No students enrolled in this class.
                </p>
              ) : (
                <SessionStudentsEditor
                  key={`${selectedClassId}-${selectedDate}`}
                  classId={selectedClassId}
                  date={selectedDate}
                  initialStudents={sessionViewData.data.students}
                  onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ["session-view", selectedClassId, selectedDate] });
                    queryClient.invalidateQueries({ queryKey: ["attendance-overview", selectedDate] });
                  }}
                />
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
