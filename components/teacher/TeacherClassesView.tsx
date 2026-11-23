"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  BookOpen,
  Users,
  Calendar,
  Clock,
  Plus,
  Search,
  Star,
  Bookmark,
  Layers,
  Code2,
  Target,
  Sparkles,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  X,
  Trash2,
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
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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

export function TeacherClassesView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [tabFilter, setTabFilter] = React.useState<"all" | "regular" | "special">("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [enrollClassId, setEnrollClassId] = React.useState<string | null>(null);

  // Form states
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
      {/* 1. Hero Welcome Banner */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-gradient-to-r from-primary to-[#23589b] text-primary-foreground relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[200px] flex flex-col justify-between">
        <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs text-white">
            <Sparkles className="size-3" />
            <span>Classroom Hub</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            My Courses & Classes
          </h2>
          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            Manage your batches, review enrolled students, and organize your weekly syllabus.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6"
            >
              <Plus className="size-4" />
              <span>Add New Class</span>
            </Button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="pointer-events-none absolute -bottom-2 right-2 sm:right-6 w-44 sm:w-56 h-36 sm:h-44 z-10">
          <Image
            src="/images/class.webp"
            alt="Classes"
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
            <BookOpen className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {classes.length}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Total Classes
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {regularCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Regular Batches
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Calendar className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {specialCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Special Sessions
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <Users className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {totalStudentsEnrolled}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Enrolled Students
            </p>
          </div>
        </div>
      </section>

      {/* 3. Filter Bar & Tabs */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Pills */}
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

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      {/* 4. Course Cards Grid */}
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

            // Cycle through vibrant gradients for headers
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
                      <span>4.9</span>
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

                {/* Card Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEnrollClassId(cls.id)}
                    className="flex-1 rounded-full text-xs font-bold h-9"
                  >
                    <Users className="size-3.5 mr-1.5" />
                    <span>Manage Students</span>
                  </Button>
                  <Link
                    href={`/attendance?classId=${cls.id}`}
                    className="inline-flex items-center justify-center size-9 rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-colors border border-border shrink-0"
                    title="Mark Attendance"
                  >
                    <Clock className="size-4" />
                  </Link>
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
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select Subject</option>
                {(subjectsData?.data || []).map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Schedule Type
                </label>
                <Select
                  value={scheduleType}
                  onChange={(e) => setScheduleType(e.target.value as any)}
                >
                  <option value="regular">Regular Weekly</option>
                  <option value="special">Special Session</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Capacity
                </label>
                <Input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Start Time
                </label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  End Time
                </label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {scheduleType === "special" && (
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Session Date
                </label>
                <Input
                  type="date"
                  value={specialDate}
                  onChange={(e) => setSpecialDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-full h-11 px-5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name || !subjectId}
              className="rounded-full h-11 px-6 font-bold"
            >
              {createMutation.isPending ? "Creating..." : "Save Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Manage Enrolled Students */}
      <Dialog open={!!enrollClassId} onOpenChange={() => setEnrollClassId(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center justify-between">
              <span>Manage Enrolled Students</span>
              <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
                {enrolledStudents.length} Students
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add or review students enrolled in this batch.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Add Student input */}
          <div className="pt-2 flex items-center gap-2">
            <Select
              value={selectedStudentToAdd}
              onChange={(e) => setSelectedStudentToAdd(e.target.value)}
              className="flex-1"
            >
              <option value="">Select student to enroll...</option>
              {(allStudentsData?.data || []).map((st: any) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.username}) - {st.grade || "No Grade"}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => enrollMutation.mutate(selectedStudentToAdd)}
              disabled={enrollMutation.isPending || !selectedStudentToAdd}
              className="rounded-full h-12 px-6 font-bold shrink-0"
            >
              Enroll
            </Button>
          </div>

          {/* Enrolled Students List */}
          <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1 divide-y divide-border/60">
            {enrolledStudents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No students enrolled in this class yet.
              </p>
            ) : (
              enrolledStudents.map((st: any) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-secondary/40 rounded-xl"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">{st.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {st.username} • Adm: {st.admissionNo || "N/A"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Enrolled
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
