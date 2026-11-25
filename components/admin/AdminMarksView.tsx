"use client";

import * as React from "react";
import { DataTable } from "@/components/shared/DataTable";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ColumnDef } from "@tanstack/react-table";
import { Download, GraduationCap, Award, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  AdminAssetTiles,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "./AdminUI";

interface MarkRecord {
  id: string;
  title: string;
  date: string;
  subject: string;
  class: string;
  studentName: string;
  studentUsername: string;
  type: "exam" | "test" | "mcq_quiz" | "paper" | "assignment";
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  attendanceStatus: "present" | "absent" | "excused";
  status: "draft" | "submitted";
}

interface StudentItem {
  id: string;
  name: string;
  username: string;
  admissionNo: string;
  grade: string;
  performanceScore: number;
  group: string;
}

export function AdminMarksView() {
  const [search, setSearch] = React.useState("");
  const [selectedStudent, setSelectedStudent] = React.useState<StudentItem | null>(null);
  const [modalTab, setModalTab] = React.useState<"exams" | "tests" | "all">("exams");

  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students-for-marks", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", search });
      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const { data: marksData, isLoading: marksLoading } = useQuery({
    queryKey: ["marks-list", selectedStudent?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/marks?studentId=${selectedStudent?.id}`);
      if (!res.ok) throw new Error("Failed to load marks");
      return res.json();
    },
    enabled: !!selectedStudent,
  });

  const studentsList: StudentItem[] = studentsData?.data || [];
  const marks: MarkRecord[] = marksData?.data || [];

  const filteredModalMarks = marks.filter((m) => {
    if (modalTab === "exams") return m.type === "exam" || m.type === "paper";
    if (modalTab === "tests") return m.type === "test" || m.type === "mcq_quiz" || m.type === "assignment";
    return true;
  });

  const avgPerformance =
    studentsList.length > 0
      ? Math.round(studentsList.reduce((acc, s) => acc + (s.performanceScore || 0), 0) / studentsList.length)
      : 0;
  const topPerformers = studentsList.filter((s) => s.group === "excellent").length;

  const studentColumns: ColumnDef<StudentItem>[] = [
    {
      accessorKey: "admissionNo",
      header: "Adm No",
      cell: ({ row }) => <span className="text-xs font-mono font-semibold">{row.original.admissionNo}</span>,
    },
    {
      accessorKey: "name",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground text-xs block">{row.original.name}</span>
          <span className="text-[11px] text-muted-foreground">@{row.original.username}</span>
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <span className="text-xs">{row.original.grade || "—"}</span>,
    },
    {
      accessorKey: "performanceScore",
      header: "Score",
      cell: ({ row }) => <span className="text-xs font-bold tabular-nums">{row.original.performanceScore}/100</span>,
    },
    {
      id: "actions",
      header: "Records",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs" onClick={() => setSelectedStudent(row.original)}>
          View Marks
        </Button>
      ),
    },
  ];

  const markColumns: ColumnDef<MarkRecord>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => <span className="text-xs">{row.original.date}</span> },
    { accessorKey: "subject", header: "Subject", cell: ({ row }) => <span className="text-xs font-semibold">{row.original.subject}</span> },
    {
      accessorKey: "title",
      header: "Assessment",
      cell: ({ row }) => (
        <div>
          <span className="text-xs font-bold block">{row.original.title}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{row.original.type.replace(/_/g, " ")}</span>
        </div>
      ),
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => (
        <span className="text-xs font-bold tabular-nums">
          {row.original.score}/{row.original.totalMarks} ({row.original.percentage}%)
        </span>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <AdminStatusPill label={row.original.grade} />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Students Listed", value: studentsList.length, icon: GraduationCap, badge: "Records", tone: 1 },
          { label: "Mean Standing", value: `${avgPerformance}%`, icon: TrendingUp, badge: "Average", tone: 2 },
          { label: "Excellent Tier", value: topPerformers, icon: Award, badge: "Distinction", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search students..."
        actions={
          <Can permission="marks.export">
            <Button
              variant="outline"
              onClick={() => window.open("/api/v1/marks/export", "_blank")}
              className="rounded-full h-10 px-4 text-xs font-bold gap-1.5"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={studentColumns}
          data={studentsList}
          loading={studentsLoading}
          emptyMessage="No students found."
          mobileCardRender={(st) => (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold">{st.name}</span>
                <AdminStatusPill label={`${st.performanceScore}/100`} />
              </div>
              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => setSelectedStudent(st)}>View Marks</Button>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl rounded-3xl p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{selectedStudent?.name} — Marks</DialogTitle>
          </DialogHeader>
          <div className="inline-flex gap-1 p-1 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] w-fit my-2">
            {(["exams", "tests", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setModalTab(t)}
                className={cn(
                  "px-3.5 py-1 rounded-full text-xs font-bold capitalize cursor-pointer",
                  modalTab === t ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <DataTable columns={markColumns} data={filteredModalMarks} loading={marksLoading} emptyMessage="No marks found." />
        </DialogContent>
      </Dialog>
    </div>
  );
}
