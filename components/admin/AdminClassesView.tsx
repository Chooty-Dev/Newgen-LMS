"use client";

import * as React from "react";
import Link from "next/link";
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
import { Plus, Trash2, Users, School, Calendar, UserPlus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "./AdminUI";

interface ClassRecord {
  id: string;
  slug?: string;
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

export function AdminClassesView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [enrollClassId, setEnrollClassId] = React.useState<string | null>(null);

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
  const [selectedStudentToAdd, setSelectedStudentToAdd] = React.useState("");

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
    enabled: !!enrollClassId,
  });

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
          sessions: scheduleType === "special" && specialDate ? [{ date: specialDate, startTime, endTime }] : undefined,
          capacity,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create class");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setCreateOpen(false);
      toast.success("Class created");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/classes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete class");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setDeleteId(null);
      toast.success("Class deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!enrollClassId) return;
      const res = await fetch(`/api/v1/classes/${enrollClassId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to enroll");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-details", enrollClassId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setSelectedStudentToAdd("");
      toast.success("Enrolled");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!enrollClassId) return;
      const res = await fetch(`/api/v1/classes/${enrollClassId}/students?studentId=${studentId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to remove");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-details", enrollClassId] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      toast.success("Removed");
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

  const totalEnrolled = classes.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
  const specialCount = classes.filter((c) => c.schedule?.type === "special").length;

  const columns: ColumnDef<ClassRecord>[] = [
    {
      accessorKey: "name",
      header: "Class",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/classes/${row.original.slug || row.original.id}`}
            className="font-bold text-foreground text-xs hover:text-[var(--primary)] inline-flex items-center gap-1"
          >
            <span>{row.original.name}</span>
            <ExternalLink className="size-3 opacity-50" />
          </Link>
          <div className="text-[11px] text-muted-foreground">{row.original.subject}</div>
        </div>
      ),
    },
    {
      accessorKey: "teacher",
      header: "Teacher",
      cell: ({ row }) => <span className="text-xs font-medium">{row.original.teacher}</span>,
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: ({ row }) => {
        const sched = row.original.schedule;
        if (sched?.type === "regular" && sched.regular) {
          const days = (sched.regular.daysOfWeek || []).map((d) => DAY_NAMES[d]).join(", ");
          return (
            <div className="text-xs">
              <span className="font-semibold">{days}</span>
              <span className="block text-[11px] text-muted-foreground">
                {sched.regular.startTime}–{sched.regular.endTime}
              </span>
            </div>
          );
        }
        if (sched?.type === "special" && sched.special?.sessions?.length) {
          const s = sched.special.sessions[0];
          return (
            <div className="text-xs">
              <span className="font-semibold">{s.date}</span>
              <span className="block text-[11px] text-muted-foreground">{s.startTime}–{s.endTime}</span>
            </div>
          );
        }
        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "enrolledCount",
      header: "Enrolled",
      cell: ({ row }) => (
        <span className="text-xs font-bold tabular-nums">
          {row.original.enrolledCount} / {row.original.capacity}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <AdminStatusPill label={row.original.status} tone={row.original.status === "active" ? "primary" : "neutral"} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Can permission="classes.enrollStudents">
            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" onClick={() => setEnrollClassId(row.original.id)}>
              Students
            </Button>
          </Can>
          <Can permission="classes.delete">
            <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
              <Trash2 className="size-3.5" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Classes", value: classes.length, icon: School, badge: "Total batches", tone: 1 },
          { label: "Enrolled", value: totalEnrolled, icon: Users, badge: "Active seats", tone: 2 },
          { label: "Special Sessions", value: specialCount, icon: Calendar, badge: "One-off", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search classes..."
        filters={
          <>
            <AdminFilterSelect value={typeFilter} onChange={setTypeFilter}>
              <option value="">All Types</option>
              <option value="regular">Regular</option>
              <option value="special">Special</option>
            </AdminFilterSelect>
            <AdminFilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="ended">Ended</option>
            </AdminFilterSelect>
          </>
        }
        actions={
          <Can permission="classes.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Create Class</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={classes}
          loading={isLoading}
          emptyMessage="No classes found."
          mobileCardRender={(cls) => (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <Link href={`/classes/${cls.slug || cls.id}`} className="font-bold text-foreground">{cls.name}</Link>
                <AdminStatusPill label={`${cls.enrolledCount}/${cls.capacity}`} />
              </div>
              <div className="text-muted-foreground">{cls.subject} • {cls.teacher}</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Can permission="classes.enrollStudents"><Button variant="outline" size="sm" onClick={() => setEnrollClassId(cls.id)}>Students</Button></Can>
                <Can permission="classes.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(cls.id)}>Delete</Button></Can>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      {/* Create Class Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Create Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Class Name</label>
              <Input placeholder="Physics Grade 10 Evening" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Subject</label>
                <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="h-9 rounded-xl">
                  <option value="">Select Subject</option>
                  {(subjectsData?.data || []).map((s: { id: string; code: string; name: string }) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Teacher</label>
                <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="h-9 rounded-xl">
                  <option value="">Select Teacher</option>
                  {(teachersData?.data || []).map((t: { id: string; name: string }) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Staff (Optional)</label>
                <Select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="h-9 rounded-xl">
                  <option value="">None</option>
                  {(staffData?.data || []).map((s: { id: string; name: string }) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Capacity</label>
                <Input type="number" min={1} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} className="h-9 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Schedule</label>
              <div className="flex gap-2 mb-2">
                <Button type="button" size="sm" variant={scheduleType === "regular" ? "default" : "outline"} onClick={() => setScheduleType("regular")} className="flex-1 rounded-full h-8 text-xs">Regular</Button>
                <Button type="button" size="sm" variant={scheduleType === "special" ? "default" : "outline"} onClick={() => setScheduleType("special")} className="flex-1 rounded-full h-8 text-xs">Special</Button>
              </div>
              {scheduleType === "regular" ? (
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((day, idx) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => toggleDay(idx)}
                      className={`size-8 rounded-full text-[11px] font-bold cursor-pointer ${
                        selectedDays.includes(idx) ? "bg-[var(--primary)] text-white" : "bg-[var(--admin-surface)] border border-border"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              ) : (
                <Input type="date" value={specialDate} onChange={(e) => setSpecialDate(e.target.value)} className="h-9 rounded-xl" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !subjectId || !teacherId || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrolled Students Modal */}
      <Dialog open={!!enrollClassId} onOpenChange={(open) => !open && setEnrollClassId(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Class Students</DialogTitle>
            <DialogDescription className="text-xs">Manage enrollments for this batch.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1">
              <Select value={selectedStudentToAdd} onChange={(e) => setSelectedStudentToAdd(e.target.value)} className="h-9 rounded-xl text-xs">
                <option value="">Select student...</option>
                {(allStudentsData?.data || [])
                  .filter((s: { id: string }) => !enrolledStudents.some((en: { id: string }) => en.id === s.id))
                  .map((s: { id: string; name: string; username: string }) => (
                    <option key={s.id} value={s.id}>{s.name} (@{s.username})</option>
                  ))}
              </Select>
            </div>
            <Button size="sm" className="rounded-full h-9 px-4 text-xs" disabled={!selectedStudentToAdd || enrollMutation.isPending} onClick={() => selectedStudentToAdd && enrollMutation.mutate(selectedStudentToAdd)}>
              <UserPlus className="size-3.5 mr-1" />
              Enroll
            </Button>
          </div>
          <div className="my-3 max-h-64 overflow-y-auto space-y-2">
            {enrolledStudents.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No students enrolled.</p>
            ) : (
              enrolledStudents.map((st: { id: string; name: string; username: string }) => (
                <div key={st.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--admin-surface)] border border-border text-xs">
                  <div>
                    <span className="font-bold block">{st.name}</span>
                    <span className="text-[11px] text-muted-foreground">@{st.username}</span>
                  </div>
                  <Button variant="ghost" size="icon-sm" onClick={() => removeStudentMutation.mutate(st.id)}>
                    <X className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setEnrollClassId(null)} className="rounded-full h-9 text-xs">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete class?"
        description="Past records are preserved."
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
      />
    </div>
  );
}
