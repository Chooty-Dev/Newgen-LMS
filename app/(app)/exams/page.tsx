"use client";

import * as React from "react";
import Image from "next/image";
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
import { Plus, Trash2, ClipboardList, Calendar, CheckCircle2, AlertCircle, Search, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { TeacherExamsView } from "@/components/teacher/TeacherExamsView";
import { cn } from "@/lib/utils";

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

export default function ExamsPage() {
  const { user } = useAuth();
  if (user?.role === "teacher") {
    return <TeacherExamsView />;
  }

  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Form states
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<"exam" | "test" | "mcq_quiz" | "paper" | "assignment">("exam");
  const [subjectId, setSubjectId] = React.useState("");
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [evaluatorId, setEvaluatorId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("11:00");
  const [totalMarks, setTotalMarks] = React.useState(100);
  const [passMark, setPassMark] = React.useState(40);
  const [weight, setWeight] = React.useState(1.0);

  // Fetch assessments
  const { data, isLoading } = useQuery({
    queryKey: ["exams", search, typeFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/v1/exams?${params.toString()}`);
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
  const { data: staffData } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => (await fetch("/api/v1/staff?limit=100")).json(),
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
          evaluatorIds: evaluatorId ? [evaluatorId] : [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create assessment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setCreateOpen(false);
      toast.success("Assessment created successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/exams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete assessment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setDeleteId(null);
      toast.success("Assessment deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setTitle("");
    setType("exam");
    setSubjectId("");
    setSelectedClassId("");
    setEvaluatorId("");
    setDate("");
    setStartTime("09:00");
    setEndTime("11:00");
    setTotalMarks(100);
    setPassMark(40);
    setWeight(1.0);
  };

  const waitingMarksCount = assessments.filter((a) => a.status === "waiting_marks").length;
  const completedCount = assessments.filter((a) => a.status === "completed").length;

  const columns: ColumnDef<AssessmentRecord>[] = [
    {
      accessorKey: "title",
      header: "Assessment Title",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground text-base">{row.original.title}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.subject} • {row.original.classes.join(", ")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const t = row.original.type;
        const display =
          t === "mcq_quiz"
            ? "MCQ Quiz"
            : t.charAt(0).toUpperCase() + t.slice(1);
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-primary border border-border">
            {display}
          </span>
        );
      },
    },
    {
      id: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const s = row.original.sessions?.[0];
        if (!s) return "-";
        return (
          <div className="text-sm">
            <span className="font-semibold text-foreground">{s.date}</span>
            <span className="block text-muted-foreground">{s.startTime} - {s.endTime}</span>
          </div>
        );
      },
    },
    {
      id: "marks",
      header: "Marks & Weight",
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="font-semibold tabular-nums text-foreground">
            {row.original.totalMarks} Marks (Pass {row.original.passMark})
          </span>
          <span className="block text-muted-foreground">Weight: {row.original.weight}x</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const st = row.original.status;
        const isDone = st === "completed";
        const isOngoing = st === "ongoing" || st === "waiting_marks";
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-3.5 py-1 text-xs font-bold capitalize",
              isDone
                ? "bg-emerald-100 text-emerald-700"
                : isOngoing
                ? "bg-amber-100 text-amber-700"
                : "bg-secondary text-primary border border-border"
            )}
          >
            {st.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Can permission="exams.delete">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setDeleteId(row.original.id)}
            aria-label="Delete assessment"
          >
            <Trash2 className="size-4" />
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Assessments & Examination Hub
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Create assessment papers, schedule examination timetables, and delegate evaluation duties to staff members.
            </p>
            <div className="pt-2">
              <Can permission="exams.create">
                <Button
                  onClick={() => {
                    resetForm();
                    setCreateOpen(true);
                  }}
                  className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>Create Assessment</span>
                </Button>
              </Can>
            </div>
          </div>

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

        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
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

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
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

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {waitingMarksCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Pending Marks
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Calendar className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {assessments.filter((a) => a.status === "scheduled").length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Scheduled
                </p>
              </div>
            </div>
          </div>

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

      <div className="flex items-center justify-start gap-3">
        <div className="w-40">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              <option value="exam">Exam</option>
              <option value="test">Test</option>
              <option value="mcq_quiz">MCQ Quiz</option>
              <option value="paper">Paper</option>
              <option value="assignment">Assignment</option>
            </Select>
          </div>
          <div className="w-40">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="waiting_marks">Waiting Marks</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        </div>

      <DataTable
        columns={columns}
        data={assessments}
        loading={isLoading}
        emptyMessage="No assessments found."
        mobileCardRender={(a) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{a.title}</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold capitalize">
                {a.type.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{a.subject} • {a.classes.join(", ")}</div>
            <div className="text-sm text-foreground">
              Date: {a.sessions?.[0]?.date || "-"} • {a.totalMarks} Marks
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-semibold capitalize text-foreground">{a.status.replace(/_/g, " ")}</span>
              <Can permission="exams.delete">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(a.id)}>
                  Delete
                </Button>
              </Can>
            </div>
          </div>
        )}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
            <DialogDescription>Setup exams, tests, quizzes or paper evaluations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Title</label>
              <Input placeholder="e.g. Term 1 Physics Theory Examination" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Type</label>
                <Select value={type} onChange={(e) => setType(e.target.value as AssessmentRecord["type"])}>
                  <option value="exam">Exam</option>
                  <option value="test">Test</option>
                  <option value="mcq_quiz">MCQ Quiz</option>
                  <option value="paper">Paper</option>
                  <option value="assignment">Assignment</option>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Subject</label>
                <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  <option value="">Select Subject</option>
                  {(subjectsData?.data || []).map((s: { id: string; name: string; code: string }) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Target Class</label>
                <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">Select Class</option>
                  {(classesData?.data || []).map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Staff Evaluator</label>
                <Select value={evaluatorId} onChange={(e) => setEvaluatorId(e.target.value)}>
                  <option value="">Assign Evaluator (Optional)</option>
                  {(staffData?.data || []).map((st: { id: string; name: string }) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Start Time</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">End Time</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Total Marks</label>
                <Input type="number" min={1} value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Pass Mark</label>
                <Input type="number" min={0} value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Weight Factor</label>
                <Input type="number" step="0.1" min={0.1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title || !subjectId || !selectedClassId || !date || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this assessment?"
        description="This cannot be undone. Recorded marks and audit logs will be kept."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />
    </div>
  );
}
