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
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, ClipboardList, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "./AdminUI";

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

export function AdminExamsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setCreateOpen(false);
      toast.success("Assessment created");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/exams/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete assessment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      queryClient.invalidateQueries({ queryKey: ["staff-assignment-options"] });
      setDeleteId(null);
      toast.success("Assessment deleted");
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

  const waitingCount = assessments.filter((a) => a.status === "waiting_marks").length;
  const completedCount = assessments.filter((a) => a.status === "completed").length;

  const columns: ColumnDef<AssessmentRecord>[] = [
    {
      accessorKey: "title",
      header: "Assessment",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/exams/${row.original.slug || row.original.id}`}
            className="font-bold text-foreground text-xs hover:text-[var(--primary)] inline-flex items-center gap-1"
          >
            <span>{row.original.title}</span>
            <ExternalLink className="size-3 opacity-50" />
          </Link>
          <div className="text-[11px] text-muted-foreground">{row.original.subject}</div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <AdminStatusPill
          label={row.original.type === "mcq_quiz" ? "MCQ Quiz" : row.original.type}
          tone="sky"
        />
      ),
    },
    {
      id: "date",
      header: "Schedule",
      cell: ({ row }) => {
        const s = row.original.sessions?.[0];
        if (!s) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="text-xs">
            <span className="font-semibold">{s.date}</span>
            <span className="block text-[11px] text-muted-foreground">{s.startTime}–{s.endTime}</span>
          </div>
        );
      },
    },
    {
      id: "marks",
      header: "Marks",
      cell: ({ row }) => (
        <span className="text-xs font-bold tabular-nums">
          {row.original.totalMarks} (Pass {row.original.passMark})
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <AdminStatusPill
          label={row.original.status.replace(/_/g, " ")}
          tone={row.original.status === "completed" ? "primary" : "neutral"}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Link href={`/evaluate-marks?assessmentId=${row.original.id}`}>
            <Button variant="outline" size="sm" className="rounded-full h-8 text-xs">
              Marks
            </Button>
          </Link>
          <Can permission="exams.delete">
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
          { label: "Assessments", value: assessments.length, icon: ClipboardList, badge: "All types", tone: 1 },
          { label: "Pending Marks", value: waitingCount, icon: Clock, badge: "Awaiting entry", tone: 2 },
          { label: "Completed", value: completedCount, icon: CheckCircle2, badge: "Finalized", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search exams or tests..."
        filters={
          <>
            <AdminFilterSelect value={typeFilter} onChange={setTypeFilter}>
              <option value="">All Types</option>
              <option value="exam">Exam</option>
              <option value="test">Test</option>
              <option value="mcq_quiz">MCQ Quiz</option>
              <option value="paper">Paper</option>
              <option value="assignment">Assignment</option>
            </AdminFilterSelect>
            <AdminFilterSelect value={statusFilter} onChange={setStatusFilter}>
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="waiting_marks">Waiting Marks</option>
              <option value="completed">Completed</option>
            </AdminFilterSelect>
          </>
        }
        actions={
          <Can permission="exams.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Create Assessment</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={assessments}
          loading={isLoading}
          emptyMessage="No assessments found."
          mobileCardRender={(a) => (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <Link href={`/exams/${a.slug || a.id}`} className="font-bold">{a.title}</Link>
                <AdminStatusPill label={a.status.replace(/_/g, " ")} />
              </div>
              <div className="text-muted-foreground">{a.subject} • {a.totalMarks} marks</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Link href={`/evaluate-marks?assessmentId=${a.id}`}><Button variant="outline" size="sm">Marks</Button></Link>
                <Can permission="exams.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(a.id)}>Delete</Button></Can>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-lg font-bold">Create Assessment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="font-semibold block mb-1">Title</label>
                <Input placeholder="Term 1 Physics Exam" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Type</label>
                <Select value={type} onChange={(e) => setType(e.target.value as AssessmentRecord["type"])} className="h-9 rounded-xl">
                  <option value="exam">Exam</option>
                  <option value="test">Test</option>
                  <option value="mcq_quiz">MCQ Quiz</option>
                  <option value="paper">Paper</option>
                  <option value="assignment">Assignment</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Subject</label>
                <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="h-9 rounded-xl">
                  <option value="">Select Subject</option>
                  {(subjectsData?.data || []).map((s: { id: string; name: string }) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="font-semibold block mb-1">Class</label>
                <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="h-9 rounded-xl">
                  <option value="">Select Class</option>
                  {(classesData?.data || []).map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Date</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Start</label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">End</label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Total Marks</label>
                <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(Number(e.target.value))} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Pass Mark</label>
                <Input type="number" value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Weight</label>
                <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="h-9 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Evaluator Staff (Optional)</label>
              <Select value={evaluatorId} onChange={(e) => setEvaluatorId(e.target.value)} className="h-9 rounded-xl">
                <option value="">None</option>
                {(staffData?.data || []).map((s: { id: string; name: string }) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title || !subjectId || !selectedClassId || !date || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete assessment?"
        description="Past records are preserved."
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
      />
    </div>
  );
}
