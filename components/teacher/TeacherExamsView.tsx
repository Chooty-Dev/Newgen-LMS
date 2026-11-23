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
  date: z.string().min(1, "Assessment date is required"),
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
  const [createOpen, setCreateOpen] = React.useState(false);

  // React Hook Form for Schedule Assessment
  const examForm = useForm<CreateExamFormData>({
    resolver: zodResolver(createExamSchema) as any,
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
        const error: any = new Error(json.error?.message || "Failed to create assessment");
        error.fields = json.error?.fields;
        throw error;
      }
      return json.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setCreateOpen(false);
      examForm.reset();
      toast.success("Assessment scheduled successfully!");
      if (data?.slug || data?.id) {
        router.push(`/exams/${data.slug || data.id}?tab=staff`);
      }
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          examForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      }
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

          {/* Search bar directly beneath cards */}
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
                    href={`/exams/${item.slug || item.id}`}
                    className="flex-1 inline-flex items-center justify-center h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs gap-1.5"
                  >
                    <Award className="size-3.5" />
                    <span>View Exam & Results</span>
                  </Link>
                  <Link
                    href={`/evaluate-marks?assessmentId=${item.id}`}
                    className="inline-flex items-center justify-center h-10 px-3.5 rounded-full bg-accent hover:bg-accent/80 text-foreground text-xs font-bold transition-all border border-border shadow-xs gap-1 shrink-0"
                    title="Enter / Evaluate Marks"
                  >
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>Marks</span>
                  </Link>
                </div>
              </div>
            );
          })}
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
                  {(subjectsData?.data || []).map((sub: any) => (
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
                {(classesData?.data || []).map((cls: any) => (
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
                  {...examForm.register("date")}
                  className={inputErrorClass(examForm.formState.errors.date)}
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
    </div>
  );
}
