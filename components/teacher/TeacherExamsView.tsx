"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiFieldError, applyApiFieldErrors } from "@/lib/api-error";
import { useClientDateState } from "@/components/staff/staffSchedulePrimitives";
import { z } from "zod";
import { FormLabel, FormError, inputErrorClass } from "@/components/ui/form-field";
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
  LayoutGrid,
  Table2,
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
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";

interface AssessmentRecord {
  id: string;
  slug?: string;
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

const createExamSchema = z.object({
  title: z.string().min(2, "Assessment title must be at least 2 characters").trim(),
  type: z.enum(["exam", "test", "mcq_quiz", "paper", "assignment"]),
  subjectId: z.string().min(1, "Please select a curriculum subject"),
  selectedClassId: z.string().min(1, "Please select a target class batch"),
  date: z
    .string()
    .min(1, "Assessment date is required")
    .refine((d) => {
      const today = new Date().toISOString().slice(0, 10);
      return d >= today;
    }, "Assessment date cannot be in the past"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  totalMarks: z.coerce.number().min(1, "Total marks must be at least 1"),
  passMark: z.coerce.number().min(0, "Pass mark must be 0 or higher"),
  weight: z.coerce.number().min(0.1, "Weight must be at least 0.1"),
});
type CreateExamFormData = z.infer<typeof createExamSchema>;

export function TeacherExamsView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Delete assessment state
  const [deleteExamId, setDeleteExamId] = React.useState<string | null>(null);
  const [deleteExamTitle, setDeleteExamTitle] = React.useState("");

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/exams/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete assessment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setDeleteExamId(null);
      setDeleteExamTitle("");
      toast.success("Assessment deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete assessment");
    },
  });

  const { todayDate } = useClientDateState();

  // React Hook Form for Schedule Assessment
  const examForm = useForm<CreateExamFormData>({
    resolver: zodResolver(createExamSchema) as unknown as Resolver<CreateExamFormData>,
    defaultValues: {
      title: "",
      type: "exam",
      subjectId: "",
      selectedClassId: "",
      date: "",
      startTime: "09:00",
      endTime: "11:00",
      totalMarks: 100,
      passMark: 40,
      weight: 1.0,
    },
  });

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
    mutationFn: async (formData: CreateExamFormData) => {
      const res = await fetch("/api/v1/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          subjectId: formData.subjectId,
          classIds: [formData.selectedClassId],
          totalMarks: formData.totalMarks,
          passMark: formData.passMark,
          weight: formData.weight,
          dateMode: "single",
          sessions: [{ date: formData.date, startTime: formData.startTime, endTime: formData.endTime }],
          evaluatorIds: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new ApiFieldError(json.error?.message || "Failed to create assessment", json.error?.fields);
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setCreateOpen(false);
      examForm.reset();
      toast.success("Assessment scheduled successfully!");
      if (data?.slug || data?.id) {
        router.push(`/exams/${data.slug || data.id}?tab=staff`);
      }
    },
    onError: (err: ApiFieldError) => {
      applyApiFieldErrors(err, examForm.setError);
      toast.error(err.message || "Failed to create assessment");
    },
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
                <span>Schedule an Exam</span>
              </Button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-exam-bg.webp"
                alt="Exams"
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
              placeholder="Search exams & tests..."
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
        </div>
      </section>

      {/* 2. Filter Tabs & View Mode Switcher */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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

      {/* 3. Assessment Cards Grid or Table View */}
      {isLoading ? (
        <DataLoader text="Loading assessments..." minHeight="min-h-[260px]" />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <ClipboardList className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No assessments found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click &quot;Schedule an Exam&quot; to set up your next test or quiz.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
          {filtered.map((item) => {
            const isDone = item.status === "completed";
            const isOngoing = item.status === "waiting_marks" || item.status === "ongoing";
            const session = item.sessions?.[0];

            return (
              <div
                key={item.id}
                className="card-themed rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative"
              >
                {/* 1. Header: Subject Tag + Status Pill + CardTypeFlag */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="card-themed-tag px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-border/80">
                      {item.subject || "Subject"}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize shrink-0",
                        isDone
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : isOngoing
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <CardTypeFlag type={item.type} />
                </div>

                {/* 2. Assessment Title & Core Details */}
                <div className="space-y-1.5">
                  <h4
                    className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1"
                    title={item.title}
                  >
                    {item.title}
                  </h4>
                  <div className="text-xs text-muted-foreground space-y-1 font-medium">
                    <p className="flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {item.classes.join(", ") || "General Class"}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <span className="truncate">
                        {session ? `${session.date} (${session.startTime} - ${session.endTime})` : "Date pending"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* 3. Mark & Weight Details */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold">
                  <span className="text-foreground">
                    {item.totalMarks} Marks <span className="text-muted-foreground font-normal">(Pass: {item.passMark})</span>
                  </span>
                  <span className="text-muted-foreground">Weight: {item.weight}x</span>
                </div>

                {/* 4. Dedicated Bottom Action Line (Interactive Text Colors, No Background Box) */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  {/* Left: View Results & Evaluate Marks */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/exams/${item.slug || item.id}`}
                      className="font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      title="View Assessment & Results"
                    >
                      <Award className="size-3.5" />
                      <span>Results</span>
                    </Link>
                    <Link
                      href={`/evaluate-marks?assessmentId=${item.id}`}
                      className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1 transition-colors"
                      title="Enter / Evaluate Marks"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Evaluate</span>
                    </Link>
                  </div>

                  {/* Right: Actions with Interactive Text Colors */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteExamId(item.id);
                        setDeleteExamTitle(item.title);
                      }}
                      className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Delete Assessment"
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
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">Assessment</th>
                  <th className="py-3.5 px-4">Subject & Class</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Marks</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {filtered.map((item) => {
                  const isDone = item.status === "completed";
                  const isOngoing = item.status === "waiting_marks" || item.status === "ongoing";
                  const session = item.sessions?.[0];
                  return (
                    <tr key={item.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-extrabold text-foreground text-xs sm:text-sm line-clamp-1">{item.title}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{item.type.replace(/_/g, " ")} • Weight: {item.weight}x</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-foreground">{item.subject}</span>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">{item.classes.join(", ") || "General"}</div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {session ? `${session.date} (${session.startTime} - ${session.endTime})` : "Date pending"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-foreground">{item.totalMarks} Marks</span>
                        <span className="text-muted-foreground text-[11px] block">Pass: {item.passMark}</span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize",
                            isDone
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : isOngoing
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          )}
                        >
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/exams/${item.slug || item.id}`}
                            className="font-bold text-primary hover:underline text-xs"
                          >
                            Results
                          </Link>
                          <Link
                            href={`/evaluate-marks?assessmentId=${item.id}`}
                            className="font-bold text-emerald-600 hover:underline text-xs"
                          >
                            Evaluate
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteExamId(item.id);
                              setDeleteExamTitle(item.title);
                            }}
                            className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            title="Delete Assessment"
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

      {/* Schedule Assessment Modal */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) examForm.reset(); }}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Schedule New Assessment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create an exam, class test, or quiz for your students.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={examForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 pt-2">
            <div>
              <FormLabel label="Assessment Title" required />
              <Input
                placeholder="e.g. Mid-Term Mathematics Exam"
                {...examForm.register("title")}
                className={inputErrorClass(examForm.formState.errors.title)}
              />
              <FormError message={examForm.formState.errors.title?.message} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FormLabel label="Assessment Type" required />
                <Select
                  {...examForm.register("type")}
                  className={inputErrorClass(examForm.formState.errors.type)}
                >
                  <option value="exam">Term Exam</option>
                  <option value="test">Class Test</option>
                  <option value="mcq_quiz">MCQ Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="paper">Paper</option>
                </Select>
                <FormError message={examForm.formState.errors.type?.message} />
              </div>

              <div>
                <FormLabel label="Subject" required />
                <Select
                  {...examForm.register("subjectId")}
                  className={inputErrorClass(examForm.formState.errors.subjectId)}
                >
                  <option value="">Select Subject...</option>
                  {(subjectsData?.data || []).map((sub: { id: string; name: string }) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </Select>
                <FormError message={examForm.formState.errors.subjectId?.message} />
              </div>
            </div>

            <div>
              <FormLabel label="Target Class Batch" required />
              <Select
                {...examForm.register("selectedClassId")}
                className={inputErrorClass(examForm.formState.errors.selectedClassId)}
              >
                <option value="">Select Class Batch...</option>
                {(classesData?.data || []).map((cls: { id: string; name: string; subject?: string }) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.subject})
                  </option>
                ))}
              </Select>
              <FormError message={examForm.formState.errors.selectedClassId?.message} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <FormLabel label="Date" required />
                <Input
                  type="date"
                  min={todayDate || undefined}
                  onClick={(e) => {
                    try {
                      (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
                    } catch {}
                  }}
                  {...examForm.register("date")}
                  className={cn("cursor-pointer", inputErrorClass(examForm.formState.errors.date))}
                />
                <FormError message={examForm.formState.errors.date?.message} />
              </div>
              <div>
                <FormLabel label="Start Time" required />
                <Input
                  type="time"
                  {...examForm.register("startTime")}
                  className={inputErrorClass(examForm.formState.errors.startTime)}
                />
                <FormError message={examForm.formState.errors.startTime?.message} />
              </div>
              <div>
                <FormLabel label="End Time" required />
                <Input
                  type="time"
                  {...examForm.register("endTime")}
                  className={inputErrorClass(examForm.formState.errors.endTime)}
                />
                <FormError message={examForm.formState.errors.endTime?.message} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <FormLabel label="Total Marks" required />
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 100"
                  {...examForm.register("totalMarks")}
                  className={inputErrorClass(examForm.formState.errors.totalMarks)}
                />
                <FormError message={examForm.formState.errors.totalMarks?.message} />
              </div>
              <div>
                <FormLabel label="Pass Mark" required />
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 40"
                  {...examForm.register("passMark")}
                  className={inputErrorClass(examForm.formState.errors.passMark)}
                />
                <FormError message={examForm.formState.errors.passMark?.message} />
              </div>
              <div>
                <FormLabel label="Weight (x)" optional />
                <Input
                  type="number"
                  step="0.1"
                  min={0.1}
                  placeholder="e.g. 1.0"
                  {...examForm.register("weight")}
                  className={inputErrorClass(examForm.formState.errors.weight)}
                />
                <FormError message={examForm.formState.errors.weight?.message} />
              </div>
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-full h-11 px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full h-11 px-6 font-bold"
              >
                {createMutation.isPending ? "Scheduling..." : "Save Assessment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Assessment Dialog */}
      <Dialog
        open={!!deleteExamId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteExamId(null);
            setDeleteExamTitle("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-foreground">
              Delete Assessment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete <span className="font-bold text-foreground">&quot;{deleteExamTitle}&quot;</span>? All scheduled sessions and associated records will be permanently removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteExamId(null);
                setDeleteExamTitle("");
              }}
              className="rounded-full h-10 px-5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteExamId) deleteMutation.mutate(deleteExamId);
              }}
              className="rounded-full h-10 px-6 font-bold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
