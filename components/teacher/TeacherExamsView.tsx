"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  FileCheck,
  ClipboardList,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Sparkles,
  ArrowRight,
  Layers,
  Award,
  AlertCircle,
  FileText,
  Bookmark,
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

interface AssessmentRecord {
  id: string;
  title: string;
  type: "exam" | "test" | "mcq_quiz" | "paper" | "assignment";
  subject: string;
  subjectId: string;
  classes: string[];
  classIds: string[];
  evaluators: string[];
  evaluatorIds: string[];
  totalMarks: number;
  passMark: number;
  weight: number;
  dateMode: "single" | "multiple";
  sessions: Array<{ date: string; startTime: string; endTime: string }>;
  status: "draft" | "scheduled" | "ongoing" | "waiting_marks" | "completed";
  createdAt: string;
}

export function TeacherExamsView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Form fields
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<"exam" | "test" | "mcq_quiz" | "paper" | "assignment">("exam");
  const [subjectId, setSubjectId] = React.useState("");
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("11:00");
  const [totalMarks, setTotalMarks] = React.useState(100);
  const [passMark, setPassMark] = React.useState(40);
  const [weight, setWeight] = React.useState(1.0);

  // Fetch assessments
  const { data, isLoading } = useQuery({
    queryKey: ["exams", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/exams");
      if (!res.ok) throw new Error("Failed to load assessments");
      return res.json();
    },
  });

  const assessments: AssessmentRecord[] = data?.data || [];

  // Dropdown options
  const { data: subjectsData } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: async () => (await fetch("/api/v1/subjects")).json(),
  });
  const { data: classesData } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => (await fetch("/api/v1/classes")).json(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type,
          subjectId,
          classIds: [selectedClassId],
          totalMarks,
          passMark,
          weight,
          dateMode: "single",
          sessions: [{ date, startTime, endTime }],
          evaluatorIds: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create assessment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setCreateOpen(false);
      setTitle("");
      toast.success("Assessment scheduled successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Filtered
  const filtered = assessments.filter((a) => {
    const matchesSearch =
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.subject && a.subject.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const completedCount = assessments.filter((a) => a.status === "completed").length;
  const waitingCount = assessments.filter((a) => a.status === "waiting_marks" || a.status === "ongoing").length;
  const scheduledCount = assessments.filter((a) => a.status === "scheduled" || a.status === "draft").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Assignments & Exams
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Create assessment papers, schedule examination dates, and evaluate student submissions. Click below to schedule a new quiz or term paper.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="size-4" />
                <span>Schedule Assessment</span>
              </Button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/exam-paper.webp"
              alt="Exams"
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
                <ClipboardList className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {assessments.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Assessments
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {completedCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Finalized
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {waitingCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Pending Marks
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Calendar className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {scheduledCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Scheduled
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
                {scheduledCount} Assessments Scheduled
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <Plus className="size-3" />
                <span>New Exam</span>
              </button>
              <Link
                href="/marks"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-[10px] sm:text-xs font-bold transition-all active:scale-95"
              >
                <Award className="size-3 text-primary" />
                <span>Marks</span>
              </Link>
            </div>
          </div>

          {/* Search bar directly beneath cards */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* 2. Filter Tabs */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Papers" },
          { id: "exam", label: "Term Exams" },
          { id: "test", label: "Class Tests" },
          { id: "mcq_quiz", label: "MCQ Quizzes" },
          { id: "assignment", label: "Assignments" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTypeFilter(tab.id)}
            className={cn(
              "h-10 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap",
              typeFilter === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {/* 4. Assessment Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <ClipboardList className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No assessments found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &quot;Schedule Assessment&quot; to set up your next exam or quiz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item, idx) => {
            const isDone = item.status === "completed";
            const isOngoing = item.status === "waiting_marks" || item.status === "ongoing";
            const session = item.sessions?.[0];

            const gradStyle =
              idx % 3 === 0
                ? "from-primary to-indigo-500"
                : idx % 3 === 1
                ? "from-emerald-600 to-teal-400"
                : "from-amber-500 to-orange-400";

            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Header visual */}
                <div
                  className={cn(
                    "relative h-28 w-full rounded-2xl bg-gradient-to-tr p-3.5 flex flex-col justify-between overflow-hidden text-white",
                    gradStyle
                  )}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                      {item.type.replace(/_/g, " ")}
                    </span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold",
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isOngoing
                          ? "bg-amber-400 text-slate-900"
                          : "bg-black/25 text-white"
                      )}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between z-10">
                    <div className="size-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      <FileText className="size-5 stroke-[2.2]" />
                    </div>
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full tabular-nums">
                      {item.totalMarks} Marks
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <div className="text-xs text-muted-foreground space-y-1 font-medium">
                    <p className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {item.subject} • {item.classes.join(", ") || "General Class"}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <span>
                        {session ? `${session.date} (${session.startTime} - ${session.endTime})` : "Date pending"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Mark details */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold">
                  <span className="text-muted-foreground">Pass Mark: {item.passMark}</span>
                  <span className="text-foreground">Weight: {item.weight}x</span>
                </div>

                {/* Actions */}
                <div className="pt-1 flex items-center gap-2">
                  <Link
                    href={`/evaluate-marks?assessmentId=${item.id}`}
                    className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs gap-1.5"
                  >
                    <Award className="size-3.5" />
                    <span>Enter Marks</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Assessment Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Schedule New Assessment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an exam, class test, or quiz for your students.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Assessment Title
              </label>
              <Input
                placeholder="e.g. Mid-Term Mathematics Exam"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Type
                </label>
                <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="exam">Term Exam</option>
                  <option value="test">Class Test</option>
                  <option value="mcq_quiz">MCQ Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="paper">Paper</option>
                </Select>
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
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Class Batch
              </label>
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">Select Class Batch</option>
                {(classesData?.data || []).map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.subject})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
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

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Total Marks
                </label>
                <Input
                  type="number"
                  min={1}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Pass Mark
                </label>
                <Input
                  type="number"
                  min={1}
                  value={passMark}
                  onChange={(e) => setPassMark(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Weight (x)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                />
              </div>
            </div>
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
              disabled={createMutation.isPending || !title || !subjectId || !selectedClassId || !date}
              className="rounded-full h-11 px-6 font-bold"
            >
              {createMutation.isPending ? "Scheduling..." : "Save Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
