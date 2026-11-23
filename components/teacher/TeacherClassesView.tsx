"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen,
  Calendar,
  Clock,
  Users,
  Plus,
  Search,
  Layers,
  Code2,
  Target,
  Sparkles,
  UserPlus,
  Trash2,
  Pencil,
  ArrowRight,
  Star,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ClassRecord {
  id: string;
  name: string;
  subject?: string;
  subjectId?: string;
  teacher?: string;
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

export function TeacherClassesView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [tabFilter, setTabFilter] = React.useState<"all" | "regular" | "special">("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [enrollClassId, setEnrollClassId] = React.useState<string | null>(null);

  // Edit class state
  const [editClass, setEditClass] = React.useState<ClassRecord | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editSubjectId, setEditSubjectId] = React.useState("");
  const [editScheduleType, setEditScheduleType] = React.useState<"regular" | "special">("regular");
  const [editDays, setEditDays] = React.useState<number[]>([1]);
  const [editStartTime, setEditStartTime] = React.useState("14:00");
  const [editEndTime, setEditEndTime] = React.useState("16:00");
  const [editSpecialDate, setEditSpecialDate] = React.useState("");
  const [editCapacity, setEditCapacity] = React.useState(50);
  const [editStatus, setEditStatus] = React.useState<"active" | "paused" | "ended">("active");

  // Delete class state
  const [deleteClassId, setDeleteClassId] = React.useState<string | null>(null);
  const [deleteClassName, setDeleteClassName] = React.useState("");

  // Create form states
  const [name, setName] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [scheduleType, setScheduleType] = React.useState<"regular" | "special">("regular");
  const [selectedDays, setSelectedDays] = React.useState<number[]>([1, 3]);
  const [startTime, setStartTime] = React.useState("14:00");
  const [endTime, setEndTime] = React.useState("16:00");
  const [specialDate, setSpecialDate] = React.useState("");
  const [capacity, setCapacity] = React.useState(50);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = React.useState("");

  // Fetch teacher's classes
  const { data, isLoading } = useQuery({
    queryKey: ["classes", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json();
    },
  });

  const classes: ClassRecord[] = data?.data || [];

  // Dropdowns
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: async () => (await fetch("/api/v1/subjects")).json(),
  });
  const { data: allStudentsData } = useQuery({
    queryKey: ["students-for-enrollment"],
    queryFn: async () => (await fetch("/api/v1/students?limit=200")).json(),
  });

  // Enrolled students for selected class modal
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

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subjectId,
          teacherId: user?.id,
          staffIds: [],
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
      setName("");
      toast.success("Class created successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editClass) return;
      const res = await fetch(`/api/v1/classes/${editClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          subjectId: editSubjectId,
          scheduleType: editScheduleType,
          daysOfWeek: editScheduleType === "regular" ? editDays : undefined,
          startTime: editStartTime,
          endTime: editEndTime,
          sessions:
            editScheduleType === "special" && editSpecialDate
              ? [{ date: editSpecialDate, startTime: editStartTime, endTime: editEndTime }]
              : undefined,
          capacity: editCapacity,
          status: editStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update class");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setEditClass(null);
      toast.success("Class updated successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/classes/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete class");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setDeleteClassId(null);
      toast.success("Class deleted successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Enroll student mutation
  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
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
      toast.success("Student enrolled successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Open edit modal
  const handleOpenEdit = (cls: ClassRecord) => {
    setEditClass(cls);
    setEditName(cls.name);
    setEditSubjectId(cls.subjectId || "");
    setEditScheduleType(cls.schedule?.type || "regular");
    setEditDays(cls.schedule?.regular?.daysOfWeek || [1]);
    setEditStartTime(cls.schedule?.regular?.startTime || "14:00");
    setEditEndTime(cls.schedule?.regular?.endTime || "16:00");
    setEditSpecialDate(cls.schedule?.special?.sessions?.[0]?.date || "");
    setEditCapacity(cls.capacity || 50);
    setEditStatus(cls.status || "active");
  };

  // Open delete confirm
  const handleOpenDelete = (cls: ClassRecord) => {
    setDeleteClassId(cls.id);
    setDeleteClassName(cls.name);
  };

  // Filtered classes
  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject && c.subject.toLowerCase().includes(search.toLowerCase()));
    const matchesTab =
      tabFilter === "all" ||
      (tabFilter === "regular" && c.schedule?.type === "regular") ||
      (tabFilter === "special" && c.schedule?.type === "special");
    return matchesSearch && matchesTab;
  });

  const totalStudentsEnrolled = classes.reduce((sum, c) => sum + (c.enrolledCount || 0), 0);
  const regularCount = classes.filter((c) => c.schedule?.type === "regular").length;
  const specialCount = classes.filter((c) => c.schedule?.type === "special").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3)            */}
      {/* ========================================================================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              My Courses & Classes
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Configure course schedules, manage student enrollment limits, and organize your weekly syllabus. Click below to launch a new class batch.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="size-4" />
                <span>Add New Class</span>
              </Button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/class.webp"
              alt="Classes"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        {/* 4 Stats Cards + Search Bar: 4 cols on lg (1/3 width) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* 4 Stats Cards tightly grouped in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <BookOpen className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {classes.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Classes
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {regularCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Regular Batches
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Calendar className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {specialCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Special Sessions
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {totalStudentsEnrolled}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Enrolled Students
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
                {classes.length} Active Batches Running
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="size-3" />
                <span>New Class</span>
              </button>
              <Link
                href="/attendance"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <Clock className="size-3 text-primary" />
                <span>Attendance</span>
              </Link>
            </div>
          </div>

          {/* Search bar directly beneath cards */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search classes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. FILTER TABS                                                            */}
      {/* ========================================================================= */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Classes", count: classes.length },
          { id: "regular", label: "Regular Batches", count: regularCount },
          { id: "special", label: "Special Sessions", count: specialCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabFilter(tab.id as any)}
            className={cn(
              "h-10 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
              tabFilter === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                tabFilter === tab.id ? "bg-white/20 text-white" : "bg-secondary text-primary"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </section>

      {/* ========================================================================= */}
      {/* 3. COURSE CARDS GRID (With Edit & Delete Options)                          */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <BookOpen className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No classes found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or click &quot;Add New Class&quot; to schedule your first batch.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls, idx) => {
            const fillPct = Math.min(
              100,
              Math.round(((cls.enrolledCount || 0) / (cls.capacity || 1)) * 100)
            );
            const isSpecial = cls.schedule?.type === "special";
            const sched = cls.schedule;

            const daysText =
              !isSpecial && sched?.regular?.daysOfWeek?.length
                ? sched.regular.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")
                : isSpecial && sched?.special?.sessions?.[0]
                ? `Special • ${sched.special.sessions[0].date}`
                : "Weekly Batch";

            const timeText =
              !isSpecial && sched?.regular?.startTime
                ? `${sched.regular.startTime} - ${sched.regular.endTime}`
                : isSpecial && sched?.special?.sessions?.[0]
                ? `${sched.special.sessions[0].startTime} - ${sched.special.sessions[0].endTime}`
                : "Scheduled";

            const gradStyle =
              idx % 3 === 0
                ? "from-primary to-indigo-500"
                : idx % 3 === 1
                ? "from-emerald-600 to-teal-400"
                : "from-amber-500 to-orange-400";

            return (
              <div
                key={cls.id}
                className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Header Graphic */}
                <div
                  className={cn(
                    "relative h-28 w-full rounded-2xl bg-gradient-to-tr p-3.5 flex flex-col justify-between overflow-hidden text-white",
                    gradStyle
                  )}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                      {cls.subject || "Course"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-bold">
                      {isSpecial ? "Special" : "Regular"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between z-10">
                    <div className="size-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      {idx % 3 === 0 ? (
                        <Layers className="size-5 stroke-[2.2]" />
                      ) : idx % 3 === 1 ? (
                        <Code2 className="size-5 stroke-[2.2]" />
                      ) : (
                        <Target className="size-5 stroke-[2.2]" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
                      <Star className="size-3 fill-amber-300 text-amber-300" />
                      <span>{cls.status || "active"}</span>
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {cls.name}
                  </h4>
                  <div className="text-xs text-muted-foreground space-y-1 font-medium">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span>{daysText}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <span>{timeText}</span>
                    </p>
                  </div>
                </div>

                {/* Progress & Enrollment */}
                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" />
                      <span>Enrolled</span>
                    </span>
                    <span className="text-foreground tabular-nums">
                      {cls.enrolledCount || 0} / {cls.capacity} students
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                {/* Card Action Buttons (Manage Students, Attendance, Edit, Delete) */}
                <div className="pt-2 flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEnrollClassId(cls.id)}
                    className="flex-1 rounded-full text-xs font-bold h-9"
                  >
                    <Users className="size-3.5 mr-1.5" />
                    <span>Students</span>
                  </Button>

                  <Link
                    href={`/attendance?classId=${cls.id}`}
                    className="inline-flex items-center justify-center size-9 rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-colors border border-border shrink-0"
                    title="Mark Attendance"
                  >
                    <Clock className="size-4" />
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(cls)}
                    className="size-9 p-0 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
                    title="Edit Class"
                  >
                    <Pencil className="size-3.5" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDelete(cls)}
                    className="size-9 p-0 rounded-full shrink-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                    title="Delete Class"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Create New Class */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Add New Class Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure batch schedule, subject, and student enrollment limit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Class Name
              </label>
              <Input
                placeholder="e.g. Grade 11 - Advanced Mathematics"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Subject
              </label>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="">Select subject...</option>
                {subjectsData?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Schedule Type
                </label>
                <Select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                >
                  <option value="regular">Regular (Weekly)</option>
                  <option value="special">Special (One-off)</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Student Capacity
                </label>
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            {scheduleType === "regular" ? (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Weekly Days</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((d, idx) => {
                    const active = selectedDays.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setSelectedDays((prev) =>
                            active ? prev.filter((x) => x !== idx) : [...prev, idx]
                          )
                        }
                        className={cn(
                          "size-8 rounded-full text-xs font-bold transition-all",
                          active
                            ? "bg-primary text-white"
                            : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Special Session Date & Time</p>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={specialDate}
                    onChange={(e) => setSpecialDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || !subjectId || createMutation.isPending}
              className="rounded-full bg-primary text-white"
            >
              {createMutation.isPending ? "Creating..." : "Save Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Class */}
      <Dialog open={!!editClass} onOpenChange={(open) => !open && setEditClass(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Edit Class Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update class details, schedule, capacity, and active status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Class Name
              </label>
              <Input
                placeholder="Class Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Subject
                </label>
                <Select
                  value={editSubjectId}
                  onChange={(e) => setEditSubjectId(e.target.value)}
                >
                  <option value="">Select subject...</option>
                  {subjectsData?.data?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Status
                </label>
                <Select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Schedule Type
                </label>
                <Select
                  value={editScheduleType}
                  onChange={(e) => setEditScheduleType(e.target.value as any)}
                >
                  <option value="regular">Regular (Weekly)</option>
                  <option value="special">Special (One-off)</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Capacity
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            {editScheduleType === "regular" ? (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Weekly Days</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((d, idx) => {
                    const active = editDays.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setEditDays((prev) =>
                            active ? prev.filter((x) => x !== idx) : [...prev, idx]
                          )
                        }
                        className={cn(
                          "size-8 rounded-full text-xs font-bold transition-all",
                          active
                            ? "bg-primary text-white"
                            : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Special Session Date & Time</p>
                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={editSpecialDate}
                    onChange={(e) => setEditSpecialDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block pl-1 mb-1">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setEditClass(null)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!editName.trim() || updateMutation.isPending}
              className="rounded-full bg-primary text-white"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Manage Enrolled Students */}
      <Dialog
        open={!!enrollClassId}
        onOpenChange={(open) => !open && setEnrollClassId(null)}
      >
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Manage Enrolled Students
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add or view students assigned to this class batch.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Add Student Control */}
            <div className="flex gap-2">
              <Select
                value={selectedStudentToAdd}
                onChange={(e) => setSelectedStudentToAdd(e.target.value)}
              >
                <option value="">Select a student to enroll...</option>
                {allStudentsData?.data
                  ?.filter(
                    (st: any) =>
                      !enrolledStudents.some((e: any) => e.id === st.id)
                  )
                  .map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.username}) - {st.grade || "No Grade"}
                    </option>
                  ))}
              </Select>
              <Button
                onClick={() => enrollMutation.mutate(selectedStudentToAdd)}
                disabled={!selectedStudentToAdd || enrollMutation.isPending}
                className="rounded-full bg-primary text-white shrink-0 gap-1.5"
              >
                <UserPlus className="size-4" />
                <span>Enroll</span>
              </Button>
            </div>

            {/* Current Students List */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Currently Enrolled ({enrolledStudents.length})</span>
              </h5>

              {enrolledStudents.length === 0 ? (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl">
                  <Users className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground mt-1">
                    No students enrolled yet. Select a student above to add them.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {enrolledStudents.map((st: any) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-2xl bg-secondary/50 border border-border/50 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-foreground">{st.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {st.username} • {st.email || "No email"}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                        Enrolled
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setEnrollClassId(null)}
              className="rounded-full"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteClassId}
        onOpenChange={(open) => !open && setDeleteClassId(null)}
        title="Delete Class Batch"
        description={`Are you sure you want to delete "${deleteClassName}"? This action cannot be undone and will end all scheduled sessions.`}
        confirmLabel="Yes, Delete"
        isDestructive={true}
        onConfirm={async () => {
          if (deleteClassId) {
            await deleteMutation.mutateAsync(deleteClassId);
          }
        }}
      />
    </div>
  );
}
