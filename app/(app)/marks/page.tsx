"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/hooks/useAuth";
import { Download, GraduationCap, Award, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

import { StudentMarksView } from "@/components/student/StudentMarksView";

export default function MarksPage() {
  const { user } = useAuth();
  if (user?.role === "student") {
    return <StudentMarksView />;
  }
  return <StaffMarksPage />;
}

function StaffMarksPage() {
  const { user } = useAuth();
  const isStudent = false;

  // State for student marks table
  const [search, setSearch] = React.useState("");
  const [subjectFilter, setSubjectFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");

  // Teacher/Admin state: selected student for modal
  const [selectedStudent, setSelectedStudent] = React.useState<StudentItem | null>(null);
  const [studentModalTab, setStudentModalTab] = React.useState("exams");

  // 1. Fetch marks
  const { data: marksData, isLoading: marksLoading } = useQuery({
    queryKey: ["marks-list", isStudent ? user?.id : selectedStudent?.id, subjectFilter, typeFilter],
    queryFn: async () => {
      const targetStudentId = isStudent ? user?.id : selectedStudent?.id;
      const params = new URLSearchParams();
      if (targetStudentId) params.append("studentId", targetStudentId);
      if (typeFilter) params.append("type", typeFilter);

      const res = await fetch(`/api/v1/marks?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load marks");
      return res.json();
    },
    enabled: isStudent || !!selectedStudent,
  });

  const marks: MarkRecord[] = marksData?.data || [];

  // 2. Teacher/Admin: Fetch student list to select from
  const { data: studentsData, isLoading: studentsLoading } = useQuery({
    queryKey: ["students-for-marks", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50", search });
      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
    enabled: !isStudent,
  });

  const studentsList: StudentItem[] = studentsData?.data || [];

  // Filter marks by search
  const filteredMarks = marks.filter((m) => {
    const matchesSearch =
      !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.subject.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !subjectFilter || m.subject.includes(subjectFilter);
    return matchesSearch && matchesSubject;
  });

  // Calculate stats
  const totalSubmissions = marks.length;
  const avgPercentage =
    totalSubmissions > 0
      ? Math.round(marks.reduce((sum, m) => sum + m.percentage, 0) / totalSubmissions)
      : 0;
  const aGradesCount = marks.filter((m) => m.grade === "A").length;

  const marksColumns: ColumnDef<MarkRecord>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.date}</span>,
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.subject}</span>,
    },
    {
      accessorKey: "title",
      header: "Assessment",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground text-base block">{row.original.title}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.type.replace(/_/g, " ")} • {row.original.class}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "score",
      header: "Score",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-foreground">
          {row.original.score} / {row.original.totalMarks}
        </span>
      ),
    },
    {
      accessorKey: "percentage",
      header: "Percentage",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-foreground">
          {row.original.percentage}%
        </span>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => (
        <span className="inline-block size-8 rounded-full bg-muted font-bold text-center leading-8 text-foreground">
          {row.original.grade}
        </span>
      ),
    },
  ];

  const studentListColumns: ColumnDef<StudentItem>[] = [
    {
      accessorKey: "admissionNo",
      header: "Adm No",
      cell: ({ row }) => <span className="font-semibold">{row.original.admissionNo}</span>,
    },
    {
      accessorKey: "name",
      header: "Student Name",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground text-base block">{row.original.name}</span>
          <span className="text-xs text-muted-foreground">{row.original.username}</span>
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <span>{row.original.grade || "-"}</span>,
    },
    {
      accessorKey: "performanceScore",
      header: "Score",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-foreground">
          {row.original.performanceScore}/100
        </span>
      ),
    },
    {
      id: "actions",
      header: "View Records",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setSelectedStudent(row.original)}
        >
          View Marks
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Marks"
        description={
          isStudent
            ? "Track your test results, exams, and grades across all subjects."
            : "Review and analyze student marks across subjects, exams, and tests."
        }
      >
        <Can permission="marks.export">
          <Button
            variant="outline"
            className="rounded-full h-12"
            onClick={() => window.open("/api/v1/marks/export", "_blank")}
          >
            <Download className="size-5 mr-2" />
            Export CSV
          </Button>
        </Can>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label={isStudent ? "Average Percentage" : "Recorded Submissions"}
          value={isStudent ? `${avgPercentage}%` : totalSubmissions}
          subtitle={isStudent ? "Overall academic standing" : "Evaluated assessments"}
          icon={TrendingUp}
        />
        <StatCard
          label="Distinction Grades (A)"
          value={aGradesCount}
          subtitle="Top tier accomplishments"
          icon={Award}
        />
        <StatCard
          label="Total Assessments"
          value={totalSubmissions}
          subtitle="Evaluated to date"
          icon={GraduationCap}
        />
      </div>

      {/* STUDENT VIEW */}
      {isStudent ? (
        <div className="space-y-4">
          <FilterBar>
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search assessment title or subject..."
            />
            <div className="flex items-center gap-3">
              <div className="w-40">
                <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="exam">Exams</option>
                  <option value="test">Tests</option>
                  <option value="mcq_quiz">MCQ Quizzes</option>
                  <option value="paper">Papers</option>
                </Select>
              </div>
              <div className="w-40">
                <Input
                  placeholder="Filter subject..."
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                />
              </div>
            </div>
          </FilterBar>

          <DataTable
            columns={marksColumns}
            data={filteredMarks}
            loading={marksLoading}
            emptyMessage="No marks recorded yet."
            mobileCardRender={(m) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-base">{m.title}</span>
                  <span className="size-7 rounded-full bg-muted font-bold text-center leading-7 text-xs">
                    {m.grade}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">{m.subject} • {m.date}</div>
                <div className="text-base font-semibold text-foreground">
                  Score: {m.score} / {m.totalMarks} ({m.percentage}%)
                </div>
              </div>
            )}
          />
        </div>
      ) : (
        /* TEACHER & ADMIN VIEW: Pick a student to inspect their 3 tabs */
        <div className="space-y-4">
          <FilterBar>
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search student by name or username..."
            />
          </FilterBar>

          <DataTable
            columns={studentListColumns}
            data={studentsList}
            loading={studentsLoading}
            emptyMessage="No students found."
            mobileCardRender={(st) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-base">{st.name}</span>
                  <span className="text-sm font-semibold">{st.performanceScore}/100</span>
                </div>
                <div className="text-sm text-muted-foreground">{st.admissionNo} • {st.grade}</div>
                <div className="pt-2 border-t border-border flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setSelectedStudent(st)}>
                    View Marks
                  </Button>
                </div>
              </div>
            )}
          />
        </div>
      )}

      {/* Teacher/Admin Modal: 3 Tabs (Subjects, Exams, Tests) */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.name}&apos;s Marks Record</DialogTitle>
            <DialogDescription>
              Admission: {selectedStudent?.admissionNo} • Grade: {selectedStudent?.grade}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={studentModalTab} onValueChange={setStudentModalTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="exams">Exams</TabsTrigger>
              <TabsTrigger value="tests">Tests & Quizzes</TabsTrigger>
              <TabsTrigger value="subjects">Subjects Summary</TabsTrigger>
            </TabsList>

            {/* Exams Tab */}
            <TabsContent value="exams" className="space-y-3">
              {marks.filter((m) => m.type === "exam").length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No exam marks recorded.</p>
              ) : (
                <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {marks
                    .filter((m) => m.type === "exam")
                    .map((m) => (
                      <div key={m.id} className="p-4 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground block">{m.title}</span>
                          <span className="text-xs text-muted-foreground">{m.subject} • {m.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground block">
                            {m.score}/{m.totalMarks} ({m.percentage}%)
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">Grade: {m.grade}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Tests & Quizzes Tab */}
            <TabsContent value="tests" className="space-y-3">
              {marks.filter((m) => m.type !== "exam").length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No test marks recorded.</p>
              ) : (
                <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {marks
                    .filter((m) => m.type !== "exam")
                    .map((m) => (
                      <div key={m.id} className="p-4 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground block">{m.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {m.type.replace(/_/g, " ").toUpperCase()} • {m.subject} • {m.date}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground block">
                            {m.score}/{m.totalMarks} ({m.percentage}%)
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">Grade: {m.grade}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* Subjects Summary Tab */}
            <TabsContent value="subjects" className="space-y-3">
              <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                {Array.from(new Set(marks.map((m) => m.subject))).map((subj) => {
                  const subMarks = marks.filter((m) => m.subject === subj);
                  const subAvg = Math.round(
                    subMarks.reduce((sum, m) => sum + m.percentage, 0) / subMarks.length
                  );
                  return (
                    <div key={subj} className="p-4 flex items-center justify-between">
                      <span className="font-semibold text-foreground">{subj}</span>
                      <span className="text-base font-bold tabular-nums">
                        Average: {subAvg}% ({subMarks.length} items)
                      </span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
