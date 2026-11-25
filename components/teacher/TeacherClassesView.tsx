"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormLabel, FormError, inputErrorClass } from "@/components/ui/form-field";
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
  LayoutGrid,
  Table2,
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
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";

interface ClassRecord {
  id: string;
  name: string;
  slug?: string;
  subject?: string;
  subjectId?: string;
  grade?: number;
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

const addClassSchema = z
  .object({
    name: z.string().min(2, "Class batch name must be at least 2 characters").trim(),
    subjectId: z.string().min(1, "Please select a subject"),
    grade: z.coerce.number().min(6, "Please select a grade between 6 and 12").max(12, "Please select a grade between 6 and 12"),
    scheduleType: z.enum(["regular", "special"]),
    daysOfWeek: z.array(z.number()).optional(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    specialDate: z.string().optional(),
    capacity: z.coerce.number().min(1, "Capacity must be at least 1 student"),
  })
  .refine(
    (data) => {
      if (data.scheduleType === "special") return !!data.specialDate;
      return true;
    },
    { message: "Special session date is required", path: ["specialDate"] }
  )
  .refine(
    (data) => {
      if (data.scheduleType === "regular") return Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
      return true;
    },
    { message: "Please select at least one weekly day", path: ["daysOfWeek"] }
  );
type AddClassFormData = z.infer<typeof addClassSchema>;

const editClassSchema = z
  .object({
    name: z.string().min(2, "Class batch name must be at least 2 characters").trim(),
    subjectId: z.string().min(1, "Please select a subject"),
    grade: z.coerce.number().min(6, "Please select a grade between 6 and 12").max(12, "Please select a grade between 6 and 12"),
    status: z.enum(["active", "paused", "ended"]),
    scheduleType: z.enum(["regular", "special"]),
    daysOfWeek: z.array(z.number()).optional(),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    specialDate: z.string().optional(),
    capacity: z.coerce.number().min(1, "Capacity must be at least 1 student"),
  })
  .refine(
    (data) => {
      if (data.scheduleType === "special") return !!data.specialDate;
      return true;
    },
    { message: "Special session date is required", path: ["specialDate"] }
  )
  .refine(
    (data) => {
      if (data.scheduleType === "regular") return Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
      return true;
    },
    { message: "Please select at least one weekly day", path: ["daysOfWeek"] }
  );
type EditClassFormData = z.infer<typeof editClassSchema>;

export function TeacherClassesView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [tabFilter, setTabFilter] = React.useState<"all" | "regular" | "special">("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [enrollClassId, setEnrollClassId] = React.useState<string | null>(null);

  // Edit class state
  const [editClass, setEditClass] = React.useState<ClassRecord | null>(null);

  // Delete class state
  const [deleteClassId, setDeleteClassId] = React.useState<string | null>(null);
  const [deleteClassName, setDeleteClassName] = React.useState("");

  const [selectedStudentToAdd, setSelectedStudentToAdd] = React.useState("");

  // React Hook Form for Add Class
  const addForm = useForm<AddClassFormData>({
    mode: "all",
    resolver: zodResolver(addClassSchema) as any,
    defaultValues: {
      name: "",
      subjectId: "",
      grade: 11,
      scheduleType: "regular",
      daysOfWeek: [1, 3],
      startTime: "14:00",
      endTime: "16:00",
      specialDate: "",
      capacity: 50,
    },
  });

  // React Hook Form for Edit Class
  const editForm = useForm<EditClassFormData>({
    mode: "all",
    resolver: zodResolver(editClassSchema) as any,
    defaultValues: {
      name: "",
      subjectId: "",
      grade: 11,
      status: "active",
      scheduleType: "regular",
      daysOfWeek: [1],
      startTime: "14:00",
      endTime: "16:00",
      specialDate: "",
      capacity: 50,
    },
  });

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
  const { data: allStudentsData, isLoading: allStudentsLoading } = useQuery({
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
    mutationFn: async (data: AddClassFormData) => {
      const res = await fetch("/api/v1/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          subjectId: data.subjectId,
          grade: data.grade,
          teacherId: user?.id,
          staffIds: [],
          scheduleType: data.scheduleType,
          daysOfWeek: data.scheduleType === "regular" ? data.daysOfWeek : undefined,
          startTime: data.startTime,
          endTime: data.endTime,
          sessions:
            data.scheduleType === "special" && data.specialDate
              ? [{ date: data.specialDate, startTime: data.startTime, endTime: data.endTime }]
              : undefined,
          capacity: data.capacity,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to create class");
        error.fields = json.error?.fields;
        throw error;
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setCreateOpen(false);
      addForm.reset();
      toast.success("Class created successfully!");
      if (data?.slug || data?.id) {
        router.push(`/classes/${data.slug || data.id}?tab=students`);
      }
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          addForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes("name") || msg.includes("batch")) addForm.setError("name", { message: err.message });
        else if (msg.includes("subject")) addForm.setError("subjectId", { message: err.message });
      }
      toast.error(err.message || "Failed to create class");
    },
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditClassFormData) => {
      if (!editClass) return;
      const res = await fetch(`/api/v1/classes/${editClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          subjectId: data.subjectId,
          grade: data.grade,
          scheduleType: data.scheduleType,
          daysOfWeek: data.scheduleType === "regular" ? data.daysOfWeek : undefined,
          startTime: data.startTime,
          endTime: data.endTime,
          sessions:
            data.scheduleType === "special" && data.specialDate
              ? [{ date: data.specialDate, startTime: data.startTime, endTime: data.endTime }]
              : undefined,
          capacity: data.capacity,
          status: data.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to update class");
        error.fields = json.error?.fields;
        throw error;
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setEditClass(null);
      toast.success("Class updated successfully!");
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          editForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes("name") || msg.includes("batch")) editForm.setError("name", { message: err.message });
        else if (msg.includes("subject")) editForm.setError("subjectId", { message: err.message });
      }
      toast.error(err.message || "Failed to update class");
    },
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
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
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
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setSelectedStudentToAdd("");
      toast.success("Student enrolled successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Open edit modal
  const handleOpenEdit = (cls: ClassRecord) => {
    setEditClass(cls);
    editForm.reset({
      name: cls.name,
      subjectId: cls.subjectId || "",
      grade: cls.grade || 11,
      scheduleType: cls.schedule?.type || "regular",
      daysOfWeek: cls.schedule?.regular?.daysOfWeek || [1],
      startTime: cls.schedule?.regular?.startTime || "14:00",
      endTime: cls.schedule?.regular?.endTime || "16:00",
      specialDate: cls.schedule?.special?.sessions?.[0]?.date || "",
      capacity: cls.capacity || 50,
      status: cls.status || "active",
    });
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
                <span>Add a Class</span>
              </Button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-class-bg.webp"
                alt="Classes"
                fill
                priority
                className="object-contain object-right drop-shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Search Bar + Theme Swatches + 4 Stats Cards */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* Search bar on top */}
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

          {/* Quick Apple-style Color Palette Bar */}
          <CardThemeBar />

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
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. FILTER TABS & VIEW MODE SWITCHER                                       */}
      {/* ========================================================================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
        </div>

        {/* View Mode Toggle: Cards (Default) vs Table */}
        <div className="flex items-center bg-secondary/80 border border-border rounded-full p-1 shadow-2xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
              viewMode === "cards"
                ? "bg-white text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="size-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
              viewMode === "table"
                ? "bg-white text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Table2 className="size-3.5" />
            <span>Table</span>
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. COURSE CARDS GRID OR TABLE VIEW                                        */}
      {/* ========================================================================= */}
      {isLoading ? (
        <DataLoader text="Loading your classes..." minHeight="min-h-[260px]" />
      ) : filteredClasses.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <BookOpen className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No classes found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or click &quot;Add a Class&quot; to schedule your first batch.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
          {filteredClasses.map((cls) => {
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

            return (
              <div
                key={cls.id}
                className="card-themed rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative"
              >
                {/* 1. Header: Subject / Grade Pill + Corner Status Flag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="card-themed-tag px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-border/80">
                      Grade {cls.grade || 11} • {cls.subject || "Course"}
                    </span>
                    <span className="text-[10px] font-bold flex items-center gap-1 text-muted-foreground">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      <span className="capitalize">{cls.status || "active"}</span>
                    </span>
                  </div>
                  <CardTypeFlag type={isSpecial ? "special" : "regular"} />
                </div>

                {/* 2. Class Title & Schedule */}
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-tight">
                    {cls.name}
                  </h4>
                  <div className="text-xs text-muted-foreground space-y-1 font-medium">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">{daysText}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <span>{timeText}</span>
                    </p>
                  </div>
                </div>

                {/* 3. Capacity & Fill Progress */}
                <div className="space-y-1.5 pt-1 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="size-3.5 text-primary" />
                      <span>Capacity</span>
                    </span>
                    <span className="text-foreground tabular-nums">
                      {cls.enrolledCount || 0} / {cls.capacity} ({fillPct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                </div>

                {/* 4. Dedicated Bottom Action Line (Text Colors, No Background Box) */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  {/* Left: Students & Details Link */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/classes/${cls.slug || cls.id}?tab=students`}
                      className="font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      title="Manage Enrolled Students"
                    >
                      <Users className="size-3.5" />
                      <span>Students</span>
                    </Link>
                    <Link
                      href={`/classes/${cls.slug || cls.id}`}
                      className="font-bold text-sky-600 hover:underline inline-flex items-center gap-1 transition-colors"
                      title="View Class Details"
                    >
                      <span>Details</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </div>

                  {/* Right: Actions with Interactive Text Colors */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cls)}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Edit Class Batch"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(cls)}
                      className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Delete Class Batch"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card-themed rounded-3xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-secondary/60 border-b border-border/80 text-muted-foreground font-bold">
                <tr>
                  <th className="py-3.5 px-4">Class Batch</th>
                  <th className="py-3.5 px-4">Subject & Grade</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4 text-center">Enrollment</th>
                  <th className="py-3.5 px-4 text-center">Type</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredClasses.map((cls) => {
                  const isSpecial = cls.schedule?.type === "special";
                  const sched = cls.schedule;
                  const daysText =
                    !isSpecial && sched?.regular?.daysOfWeek?.length
                      ? sched.regular.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")
                      : isSpecial && sched?.special?.sessions?.[0]
                      ? `Special • ${sched.special.sessions[0].date}`
                      : "Weekly";

                  return (
                    <tr key={cls.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/classes/${cls.slug || cls.id}`}
                          className="font-extrabold text-foreground hover:text-primary transition-colors block"
                        >
                          {cls.name}
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        Grade {cls.grade || 11} • {cls.subject || "Course"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {daysText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className="text-foreground tabular-nums">
                          {cls.enrolledCount || 0} / {cls.capacity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <CardTypeFlag type={isSpecial ? "special" : "regular"} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/classes/${cls.slug || cls.id}?tab=students`}
                            className="text-primary font-bold hover:underline text-xs"
                            title="Students"
                          >
                            Students
                          </Link>
                          <Link
                            href={`/classes/${cls.slug || cls.id}`}
                            className="text-sky-600 font-bold hover:underline text-xs"
                            title="Details"
                          >
                            Details
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(cls)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(cls)}
                            className="p-1 text-rose-500 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Create New Class */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) addForm.reset(); }}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Add New Class Batch
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure batch schedule, subject, and student enrollment limit.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={addForm.handleSubmit(
              (data) => createMutation.mutate(data),
              () => toast.error("Please fill in all required fields correctly")
            )}
            className="space-y-4 pt-2"
          >
            <div>
              <FormLabel label="Curriculum Subject" required />
              <Select
                {...addForm.register("subjectId")}
                className={inputErrorClass(addForm.formState.errors.subjectId)}
                onChange={(e) => {
                  const sId = e.target.value;
                  addForm.setValue("subjectId", sId, { shouldValidate: true });
                  const sub = subjectsData?.data?.find((s: any) => s.id === sId);
                  const grades: number[] = sub?.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11, 12];
                  if (!grades.includes(Number(addForm.getValues("grade")))) {
                    addForm.setValue("grade", grades[0], { shouldValidate: true });
                  }
                }}
              >
                <option value="">Select subject...</option>
                {subjectsData?.data?.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </Select>
              <FormError message={addForm.formState.errors.subjectId?.message} />
            </div>

            <div>
              <FormLabel label="Grade (6 - 12)" required />
              <Select
                {...addForm.register("grade")}
                className={inputErrorClass(addForm.formState.errors.grade)}
              >
                {(() => {
                  const sId = addForm.watch("subjectId");
                  const sub = subjectsData?.data?.find((s: any) => s.id === sId);
                  const grades: number[] = sub?.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11, 12];
                  return grades.map((g) => (
                    <option key={g} value={g}>
                      Grade {g < 10 ? `0${g}` : g}
                    </option>
                  ));
                })()}
              </Select>
              <FormError message={addForm.formState.errors.grade?.message} />
            </div>

            <div>
              <FormLabel label="Class Batch Name" required />
              <Input
                placeholder="e.g. Batch 2026 - Theory & Revision"
                {...addForm.register("name")}
                className={inputErrorClass(addForm.formState.errors.name)}
              />
              <FormError message={addForm.formState.errors.name?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Schedule Type" required />
                <Select
                  {...addForm.register("scheduleType")}
                  className={inputErrorClass(addForm.formState.errors.scheduleType)}
                >
                  <option value="regular">Regular (Weekly)</option>
                  <option value="special">Special (One-off)</option>
                </Select>
                <FormError message={addForm.formState.errors.scheduleType?.message} />
              </div>

              <div>
                <FormLabel label="Student Capacity" required />
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 50"
                  {...addForm.register("capacity")}
                  className={inputErrorClass(addForm.formState.errors.capacity)}
                />
                <FormError message={addForm.formState.errors.capacity?.message} />
              </div>
            </div>

            {addForm.watch("scheduleType") === "regular" ? (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Weekly Days</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((d, idx) => {
                    const currentDays = addForm.watch("daysOfWeek") || [];
                    const active = currentDays.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const updated = active
                            ? currentDays.filter((x) => x !== idx)
                            : [...currentDays, idx];
                          addForm.setValue("daysOfWeek", updated, { shouldValidate: true });
                        }}
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
                <FormError message={addForm.formState.errors.daysOfWeek?.message} />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <FormLabel label="Start Time" required />
                    <Input
                      type="time"
                      {...addForm.register("startTime")}
                      className={inputErrorClass(addForm.formState.errors.startTime)}
                    />
                    <FormError message={addForm.formState.errors.startTime?.message} />
                  </div>
                  <div>
                    <FormLabel label="End Time" required />
                    <Input
                      type="time"
                      {...addForm.register("endTime")}
                      className={inputErrorClass(addForm.formState.errors.endTime)}
                    />
                    <FormError message={addForm.formState.errors.endTime?.message} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Special Session Date & Time</p>
                <div>
                  <FormLabel label="Date" required />
                  <Input
                    type="date"
                    {...addForm.register("specialDate")}
                    className={inputErrorClass(addForm.formState.errors.specialDate)}
                  />
                  <FormError message={addForm.formState.errors.specialDate?.message} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel label="Start Time" required />
                    <Input
                      type="time"
                      {...addForm.register("startTime")}
                      className={inputErrorClass(addForm.formState.errors.startTime)}
                    />
                    <FormError message={addForm.formState.errors.startTime?.message} />
                  </div>
                  <div>
                    <FormLabel label="End Time" required />
                    <Input
                      type="time"
                      {...addForm.register("endTime")}
                      className={inputErrorClass(addForm.formState.errors.endTime)}
                    />
                    <FormError message={addForm.formState.errors.endTime?.message} />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full bg-primary text-white"
              >
                {createMutation.isPending ? "Creating..." : "Save Class"}
              </Button>
            </DialogFooter>
          </form>
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

          <form
            onSubmit={editForm.handleSubmit(
              (data) => updateMutation.mutate(data),
              () => toast.error("Please fill in all required fields correctly")
            )}
            className="space-y-4 pt-2"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Curriculum Subject" required />
                <Select
                  {...editForm.register("subjectId")}
                  className={inputErrorClass(editForm.formState.errors.subjectId)}
                  onChange={(e) => {
                    const sId = e.target.value;
                    editForm.setValue("subjectId", sId, { shouldValidate: true });
                    const sub = subjectsData?.data?.find((s: any) => s.id === sId);
                    const grades: number[] = sub?.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11, 12];
                    if (!grades.includes(Number(editForm.getValues("grade")))) {
                      editForm.setValue("grade", grades[0], { shouldValidate: true });
                    }
                  }}
                >
                  <option value="">Select subject...</option>
                  {subjectsData?.data?.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </Select>
                <FormError message={editForm.formState.errors.subjectId?.message} />
              </div>

              <div>
                <FormLabel label="Grade (6 - 12)" required />
                <Select
                  {...editForm.register("grade")}
                  className={inputErrorClass(editForm.formState.errors.grade)}
                >
                  {(() => {
                    const sId = editForm.watch("subjectId");
                    const sub = subjectsData?.data?.find((s: any) => s.id === sId);
                    const grades: number[] = sub?.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11, 12];
                    return grades.map((g) => (
                      <option key={g} value={g}>
                        Grade {g < 10 ? `0${g}` : g}
                      </option>
                    ));
                  })()}
                </Select>
                <FormError message={editForm.formState.errors.grade?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Class Batch Name" required />
                <Input
                  placeholder="e.g. Batch 2026 - Theory & Revision"
                  {...editForm.register("name")}
                  className={inputErrorClass(editForm.formState.errors.name)}
                />
                <FormError message={editForm.formState.errors.name?.message} />
              </div>

              <div>
                <FormLabel label="Status" required />
                <Select
                  {...editForm.register("status")}
                  className={inputErrorClass(editForm.formState.errors.status)}
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </Select>
                <FormError message={editForm.formState.errors.status?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Schedule Type" required />
                <Select
                  {...editForm.register("scheduleType")}
                  className={inputErrorClass(editForm.formState.errors.scheduleType)}
                >
                  <option value="regular">Regular (Weekly)</option>
                  <option value="special">Special (One-off)</option>
                </Select>
                <FormError message={editForm.formState.errors.scheduleType?.message} />
              </div>

              <div>
                <FormLabel label="Student Capacity" required />
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 50"
                  {...editForm.register("capacity")}
                  className={inputErrorClass(editForm.formState.errors.capacity)}
                />
                <FormError message={editForm.formState.errors.capacity?.message} />
              </div>
            </div>

            {editForm.watch("scheduleType") === "regular" ? (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Weekly Days</p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_NAMES.map((d, idx) => {
                    const currentDays = editForm.watch("daysOfWeek") || [];
                    const active = currentDays.includes(idx);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          const updated = active
                            ? currentDays.filter((x) => x !== idx)
                            : [...currentDays, idx];
                          editForm.setValue("daysOfWeek", updated, { shouldValidate: true });
                        }}
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
                <FormError message={editForm.formState.errors.daysOfWeek?.message} />

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <FormLabel label="Start Time" required />
                    <Input
                      type="time"
                      {...editForm.register("startTime")}
                      className={inputErrorClass(editForm.formState.errors.startTime)}
                    />
                    <FormError message={editForm.formState.errors.startTime?.message} />
                  </div>
                  <div>
                    <FormLabel label="End Time" required />
                    <Input
                      type="time"
                      {...editForm.register("endTime")}
                      className={inputErrorClass(editForm.formState.errors.endTime)}
                    />
                    <FormError message={editForm.formState.errors.endTime?.message} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <p className="text-xs font-bold text-foreground">Special Session Date & Time</p>
                <div>
                  <FormLabel label="Date" required />
                  <Input
                    type="date"
                    {...editForm.register("specialDate")}
                    className={inputErrorClass(editForm.formState.errors.specialDate)}
                  />
                  <FormError message={editForm.formState.errors.specialDate?.message} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FormLabel label="Start Time" required />
                    <Input
                      type="time"
                      {...editForm.register("startTime")}
                      className={inputErrorClass(editForm.formState.errors.startTime)}
                    />
                    <FormError message={editForm.formState.errors.startTime?.message} />
                  </div>
                  <div>
                    <FormLabel label="End Time" required />
                    <Input
                      type="time"
                      {...editForm.register("endTime")}
                      className={inputErrorClass(editForm.formState.errors.endTime)}
                    />
                    <FormError message={editForm.formState.errors.endTime?.message} />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditClass(null)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-full bg-primary text-white"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
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
            {allStudentsLoading ? (
              <div className="flex gap-2 items-center py-2">
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-24 rounded-full" />
              </div>
            ) : (
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
            )}

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
