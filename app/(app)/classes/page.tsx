"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Users, School, Calendar, Clock, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { TeacherClassesView } from "@/components/teacher/TeacherClassesView";

interface ClassRecord {
  id: string;
  name: string;
  subject: string;
  subjectId: string;
  teacher: string;
  teacherId: string;
  staff: string[];
  schedule: {
    type: "regular" | "special";
    regular?: {
      daysOfWeek: number[];
      startTime: string;
      endTime: string;
    };
    special?: {
      sessions: Array<{ date: string; startTime: string; endTime: string }>;
    };
  };
  capacity: number;
  enrolledCount: number;
  status: "active" | "paused" | "ended";
  createdAt: string;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ClassesPage() {
  const { user } = useAuth();
  if (user?.role === "teacher") {
    return <TeacherClassesView />;
  }

  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [enrollClassId, setEnrollClassId] = React.useState<string | null>(null);

  // Form states
  const [name, setName] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [teacherId, setTeacherId] = React.useState("");
  const [staffId, setStaffId] = React.useState("");
  const [scheduleType, setScheduleType] = React.useState<"regular" | "special">("regular");
  const [selectedDays, setSelectedDays] = React.useState<number[]>([1, 3]);
  const [startTime, setStartTime] = React.useState("14:00");
  const [endTime, setEndTime] = React.useState("16:00");
  const [specialDate, setSpecialDate] = React.useState("");
  const [capacity, setCapacity] = React.useState(50);

  // For student enrollment
  const [selectedStudentToAdd, setSelectedStudentToAdd] = React.useState("");

  // Fetch classes
  const { data, isLoading } = useQuery({
    queryKey: ["classes", search, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/v1/classes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json();
    },
  });

  const classes: ClassRecord[] = data?.data || [];

  // Fetch subjects, teachers, and staff for dropdowns
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: async () => (await fetch("/api/v1/subjects")).json(),
  });
  const { data: teachersData } = useQuery({
    queryKey: ["teachers-list"],
    queryFn: async () => (await fetch("/api/v1/teachers?limit=100")).json(),
  });
  const { data: staffData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => (await fetch("/api/v1/staff?limit=100")).json(),
  });
  const { data: allStudentsData } = useQuery({
    queryKey: ["students-for-enrollment"],
    queryFn: async () => (await fetch("/api/v1/students?limit=200")).json(),
  });

  // Fetch enrolled students for selected class
  const { data: classDetailsData } = useQuery({
    queryKey: ["class-details", enrollClassId],
    queryFn: async () => {
      if (!enrollClassId) return null;
      const res = await fetch(`/api/v1/classes/${enrollClassId}`);
      if (!res.ok) throw new Error("Failed to load class details");
      return res.json();
    },
    enabled: !!enrollClassId,
  });

  const enrolledStudents = classDetailsData?.data?.students || [];

  // Create class mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subjectId,
          teacherId,
          staffIds: staffId ? [staffId] : [],
          scheduleType,
          daysOfWeek: scheduleType === "regular" ? selectedDays : undefined,
          startTime,
          endTime,
          sessions:
            scheduleType === "special" && specialDate
              ? [{ date: specialDate, startTime, endTime }]
              : undefined,
          capacity,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create class");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setCreateOpen(false);
      toast.success("Class created successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete class");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setDeleteId(null);
      toast.success("Class deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Enroll student mutation
  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!enrollClassId) return;
      const res = await fetch(`/api/v1/classes/${enrollClassId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to enroll student");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-details", enrollClassId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setSelectedStudentToAdd("");
      toast.success("Student enrolled in class");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Remove student mutation
  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!enrollClassId) return;
      const res = await fetch(`/api/v1/classes/${enrollClassId}/students?studentId=${studentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to remove student");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-details", enrollClassId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Student removed from class");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setName("");
    setSubjectId("");
    setTeacherId("");
    setStaffId("");
    setScheduleType("regular");
    setSelectedDays([1, 3]);
    setStartTime("14:00");
    setEndTime("16:00");
    setSpecialDate("");
    setCapacity(50);
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort()
    );
  };

  const totalStudentsEnrolled = classes.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
  const specialClassesCount = classes.filter((c) => c.schedule?.type === "special").length;

  const columns: ColumnDef<ClassRecord>[] = [
    {
      accessorKey: "name",
      header: "Class Name",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground text-base">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.subject}</div>
        </div>
      ),
    },
    {
      accessorKey: "teacher",
      header: "Teacher",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-foreground">{row.original.teacher}</div>
          {row.original.staff.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Staff: {row.original.staff.join(", ")}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: ({ row }) => {
        const sched = row.original.schedule;
        if (sched?.type === "regular" && sched.regular) {
          const days = (sched.regular.daysOfWeek || []).map((d) => DAY_NAMES[d]).join(", ");
          return (
            <div className="text-sm">
              <span className="font-medium text-foreground">{days}</span>
              <span className="block text-muted-foreground">
                {sched.regular.startTime} - {sched.regular.endTime}
              </span>
            </div>
          );
        }
        if (sched?.type === "special" && sched.special?.sessions?.length) {
          const s = sched.special.sessions[0];
          return (
            <div className="text-sm">
              <span className="font-medium text-foreground">Special: {s.date}</span>
              <span className="block text-muted-foreground">{s.startTime} - {s.endTime}</span>
            </div>
          );
        }
        return <span className="text-muted-foreground text-sm">-</span>;
      },
    },
    {
      accessorKey: "enrolledCount",
      header: "Students",
      cell: ({ row }) => (
        <div className="space-y-1 min-w-[100px]">
          <span className="font-bold tabular-nums text-foreground text-sm">
            {row.original.enrolledCount} / {row.original.capacity}
          </span>
          <div className="w-24 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  Math.round(
                    ((row.original.enrolledCount || 0) /
                      (row.original.capacity || 1)) *
                      100
                  )
                )}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Can permission="classes.enrollStudents">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setEnrollClassId(row.original.id)}
              aria-label="Manage enrolled students"
              title="Manage Students"
            >
              <Users className="size-4" />
            </Button>
          </Can>
          <Can permission="classes.delete">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setDeleteId(row.original.id)}
              aria-label="Delete class"
            >
              <Trash2 className="size-4" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Classes" description="Create classes and choose who teaches them.">
        <Can permission="classes.create">
          <Button
            className="rounded-full h-12"
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="size-5 mr-2" />
            Add Class
          </Button>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <StatCard label="Total Classes" value={classes.length} subtitle="Active programs" icon={School} />
        <StatCard label="Total Enrolled" value={totalStudentsEnrolled} subtitle="Student enrollments" icon={Users} />
        <StatCard label="Special Classes" value={specialClassesCount} subtitle="Extra sessions" icon={Calendar} />
        <StatCard label="Regular Batches" value={classes.length - specialClassesCount} subtitle="Weekly schedules" icon={Clock} />
      </div>

      <FilterBar>
        <SearchInput value={search} onValueChange={setSearch} placeholder="Search class name..." />
        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="regular">Regular</option>
              <option value="special">Special</option>
            </Select>
          </div>
          <div className="w-40">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </Select>
          </div>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={classes}
        loading={isLoading}
        emptyMessage="No classes found."
        mobileCardRender={(c) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{c.name}</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold capitalize">
                {c.schedule?.type}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{c.subject} • Teacher: {c.teacher}</div>
            <div className="text-sm font-semibold text-foreground">
              Enrolled: {c.enrolledCount} / {c.capacity} students
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Can permission="classes.enrollStudents">
                <Button variant="outline" size="sm" onClick={() => setEnrollClassId(c.id)}>
                  Students
                </Button>
              </Can>
              <Can permission="classes.delete">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(c.id)}>
                  Delete
                </Button>
              </Can>
            </div>
          </div>
        )}
      />

      {/* Create Class Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>Setup regular recurring schedules or special session dates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Class Name</label>
              <Input placeholder="e.g. 2026 Advanced Physics Batch A" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Subject</label>
                <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select Subject</option>
                  {(subjectsData?.data || []).map((s: { id: string; name: string; code: string }) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Teacher</label>
                <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                  <option value="">Assign Teacher</option>
                  {(teachersData?.data || []).map((t: { id: string; name: string }) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Assign Staff Member</label>
              <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Select Staff Member (Optional)</option>
                {(staffData?.data || []).map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Schedule Type</label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={scheduleType === "regular" ? "default" : "outline"}
                  onClick={() => setScheduleType("regular")}
                  className="flex-1"
                >
                  Regular (Weekly)
                </Button>
                <Button
                  type="button"
                  variant={scheduleType === "special" ? "default" : "outline"}
                  onClick={() => setScheduleType("special")}
                  className="flex-1"
                >
                  Special (Specific Date)
                </Button>
              </div>
            </div>

            {scheduleType === "regular" ? (
              <div className="space-y-3 p-4 rounded-3xl bg-muted/30 border border-border">
                <span className="text-sm font-semibold text-foreground block">Weekly Days</span>
                <div className="flex flex-wrap gap-2">
                  {DAY_NAMES.map((day, idx) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(idx)}
                      className={`size-10 rounded-full font-medium text-sm transition-all cursor-pointer ${
                        selectedDays.includes(idx)
                          ? "bg-primary text-primary-foreground font-bold"
                          : "bg-card border border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-3xl bg-muted/30 border border-border">
                <label className="text-sm font-semibold text-foreground block mb-1">Specific Date</label>
                <Input
                  type="date"
                  value={specialDate}
                  onChange={(e) => setSpecialDate(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Start Time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">End Time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Class Capacity</label>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || !subjectId || !teacherId || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrolled Students Management Dialog */}
      <Dialog open={!!enrollClassId} onOpenChange={(open) => !open && setEnrollClassId(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Enrolled Students</DialogTitle>
            <DialogDescription>Add or remove students for this class.</DialogDescription>
          </DialogHeader>

          {/* Quick Add Student */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1">
              <Select
                value={selectedStudentToAdd}
                onChange={(e) => setSelectedStudentToAdd(e.target.value)}
              >
                <option value="">Select student to enroll...</option>
                {(allStudentsData?.data || [])
                  .filter(
                    (s: { id: string }) =>
                      !enrolledStudents.some((en: { id: string }) => en.id === s.id)
                  )
                  .map((s: { id: string; name: string; username: string }) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.username})
                    </option>
                  ))}
              </Select>
            </div>
            <Button
              disabled={!selectedStudentToAdd || enrollMutation.isPending}
              onClick={() => {
                if (selectedStudentToAdd) enrollMutation.mutate(selectedStudentToAdd);
              }}
            >
              <UserPlus className="size-4 mr-1.5" />
              Enroll
            </Button>
          </div>

          {/* Enrolled list */}
          <div className="my-4 max-h-72 overflow-y-auto space-y-2 pr-1">
            {enrolledStudents.length === 0 ? (
              <p className="text-center text-muted-foreground py-6">No students enrolled yet.</p>
            ) : (
              enrolledStudents.map((st: { id: string; name: string; username: string; email?: string }) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border"
                >
                  <div>
                    <span className="font-semibold text-foreground text-sm block">{st.name}</span>
                    <span className="text-xs text-muted-foreground">{st.username}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeStudentMutation.mutate(st.id)}
                    aria-label="Remove student"
                  >
                    <X className="size-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setEnrollClassId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this class?"
        description="This cannot be undone. Past student marks and attendance records will be preserved."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />
    </div>
  );
}
