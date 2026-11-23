"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";
import { SubjectBarChart } from "@/components/charts/SubjectBarChart";
import {
  Printer,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ArrowRight,
  BookOpen,
} from "lucide-react";

interface StudentAnalysisData {
  student: {
    id: string;
    name: string;
    username: string;
    admissionNo: string;
    grade: string;
    joinedAt: string;
  };
  score: number;
  group: "weak" | "medium" | "excellent";
  groupLabel: string;
  scoreBreakdown: {
    marksScore: number;
    attendanceScore: number;
    improvementScore: number;
  };
  explanation: {
    overallSummary: string;
    primaryReasons: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  bestSubject: string;
  worstSubject: string;
  subjectComparison: Array<{ subject: string; average: number; count: number }>;
  typeComparison: Array<{ type: string; average: number }>;
  trendData: Array<{ period: string; score: number; marks?: number; attendance?: number }>;
  monthlyAttendance: Array<{ month: string; percentage: number }>;
}

import { StudentAnalysisView } from "@/components/student/StudentAnalysisView";
import { TeacherAnalysisView } from "@/components/teacher/TeacherAnalysisView";

export default function AnalysisPage() {
  const { user } = useAuth();
  const isStudent = user?.role === "student";

  if (isStudent) {
    return <StudentAnalysisView />;
  }

  if (user?.role === "teacher") {
    return <TeacherAnalysisView />;
  }

  return <TeacherAdminAnalysisView />;
}

// -------------------------------------------------------------
// Teacher & Admin View (Select and inspect any student)
// -------------------------------------------------------------
function TeacherAdminAnalysisView() {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");

  // Fetch list of students
  const { data: studentsData } = useQuery<{ data: Array<{ id: string; name: string; username: string }> }>({
    queryKey: ["students", "list", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/students?limit=100");
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const students = studentsData?.data || [];
  const isSelectedValid = students.some((s) => s.id === selectedStudentId);
  const activeStudentId = (isSelectedValid ? selectedStudentId : "") || (students.length > 0 ? students[0].id : "");

  // Fetch selected student's analysis
  const { data: analysisData, isLoading } = useQuery<{ data: StudentAnalysisData }>({
    queryKey: ["analysis", "student", activeStudentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/analysis/student/${activeStudentId}`);
      if (!res.ok) throw new Error("Failed to load student analysis");
      return res.json();
    },
    enabled: !!activeStudentId,
  });

  const analysis = analysisData?.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Student Analysis"
          description="Detailed performance scores, strengths, and plain-language reasoning."
        />
        {analysis && (
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="print:hidden w-fit rounded-full px-6 gap-2"
          >
            <Printer className="size-5" />
            Print Report
          </Button>
        )}
      </div>

      {/* Student Picker Filter Bar */}
      <Card className="p-6 rounded-3xl print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Choose Student</label>
            <Select
              value={activeStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.username})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : analysis ? (
        <AnalysisDetailReport analysis={analysis} showTeacherFocus />
      ) : (
        <Card className="p-12 text-center rounded-3xl">
          <p className="text-muted-foreground">Select a student to view their performance analysis.</p>
        </Card>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 3. Shared Analysis Detail Report (Clean & Print Ready)
// -------------------------------------------------------------
function AnalysisDetailReport({
  analysis,
  showTeacherFocus = false,
}: {
  analysis: StudentAnalysisData;
  showTeacherFocus?: boolean;
}) {
  const primaryReasons =
    analysis.explanation?.primaryReasons ||
    (analysis.explanation as unknown as { reasons?: Array<{ text: string }> })?.reasons?.map((r) => r.text) ||
    [];
  const overallSummary =
    analysis.explanation?.overallSummary ||
    (analysis.explanation as unknown as { summary?: string })?.summary ||
    "";
  const strengths =
    analysis.explanation?.strengths || [];
  const weaknesses =
    analysis.explanation?.weaknesses ||
    (analysis.explanation as unknown as { weakPoints?: string[] })?.weakPoints ||
    [];
  const recommendations =
    analysis.explanation?.recommendations || [];

  return (
    <div className="space-y-8">
      {/* Printable Header - Visible in Print Only */}
      <div className="hidden print:block border-b border-border pb-4 mb-6">
        <h1 className="text-2xl font-bold">Danuma LMS — Student Performance Report</h1>
        <div className="mt-2 text-sm text-muted-foreground flex justify-between">
          <span>Student: {analysis.student.name} ({analysis.student.username})</span>
          <span>Admission No: {analysis.student.admissionNo}</span>
          <span>Date: {analysis.student.joinedAt ? new Date(analysis.student.joinedAt).toLocaleDateString() : "2026-11-20"}</span>
        </div>
      </div>

      {/* Primary Reason Callout for Teachers / Admins */}
      {showTeacherFocus && (
        <Card className="rounded-3xl border-2 border-border p-6 bg-accent/30">
          <div className="flex items-start gap-4">
            <Lightbulb className="size-6 text-foreground shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-1">
                {analysis.group === "weak"
                  ? "Why this student needs help"
                  : analysis.group === "excellent"
                    ? "Why this student is excelling"
                    : "Performance Summary"}
              </h3>
              <p className="text-base text-foreground mb-3">{overallSummary}</p>
              {primaryReasons.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-base text-muted-foreground">
                  {primaryReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Top 4 Score Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Performance Score"
          value={`${analysis.score}%`}
          subtitle={`Status: ${analysis.groupLabel}`}
        />
        <StatCard
          label="Marks Score"
          value={`${analysis.scoreBreakdown.marksScore}%`}
          subtitle="Average test & exam score"
        />
        <StatCard
          label="Attendance Score"
          value={`${analysis.scoreBreakdown.attendanceScore}%`}
          subtitle="Class attendance rate"
        />
        <StatCard
          label="Improvement Rate"
          value={`${analysis.scoreBreakdown.improvementScore}%`}
          subtitle="Recent trend progression"
        />
      </div>

      {/* Plain Language Summary & Standing */}
      {!showTeacherFocus && (
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Current Standing</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <p className="text-base text-foreground leading-relaxed">{overallSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Strengths & Weak Points Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center gap-2">
            <CheckCircle2 className="size-5 text-foreground" />
            <CardTitle className="text-xl">Key Strengths</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="space-y-3">
              {strengths.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-base">
                  <span className="size-2 rounded-full bg-primary mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center gap-2">
            <AlertCircle className="size-5 text-foreground" />
            <CardTitle className="text-xl">Areas to Improve</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="space-y-3">
              {weaknesses.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-base">
                  <span className="size-2 rounded-full bg-border mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend Area Chart */}
      <Card className="rounded-3xl p-6">
        <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">Performance Trend</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Overall progression over recent evaluation periods</p>
          </div>
          <TrendingUp className="size-5 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <AreaTrendChart data={analysis.trendData} />
        </CardContent>
      </Card>

      {/* Subject Comparison & Best/Worst Callouts */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl p-6 md:col-span-2">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Subject Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Average marks percentage by subject</p>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <SubjectBarChart data={analysis.subjectComparison} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl p-6">
            <CardHeader className="p-0 mb-2 flex flex-row items-center gap-2">
              <Award className="size-5 text-foreground" />
              <CardTitle className="text-base font-medium">Strongest Subject</CardTitle>
            </CardHeader>
            <p className="text-2xl font-bold">{analysis.bestSubject}</p>
            <p className="text-sm text-muted-foreground mt-1">Consistently highest scores in evaluations</p>
          </Card>
          <Card className="rounded-3xl p-6">
            <CardHeader className="p-0 mb-2 flex flex-row items-center gap-2">
              <BookOpen className="size-5 text-foreground" />
              <CardTitle className="text-base font-medium">Needs Attention</CardTitle>
            </CardHeader>
            <p className="text-2xl font-bold">{analysis.worstSubject}</p>
            <p className="text-sm text-muted-foreground mt-1">Recommended for additional study and review</p>
          </Card>
        </div>
      </div>

      {/* Assessment Types & Monthly Attendance Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Assessment Types</CardTitle>
            <p className="text-sm text-muted-foreground">Exams vs Tests vs Quizzes</p>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {analysis.typeComparison.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assessment marks recorded yet.</p>
            ) : (
              analysis.typeComparison.map((item) => (
                <div key={item.type} className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-base font-medium">{item.type}</span>
                  <span className="text-lg font-semibold tabular-nums">{item.average}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Monthly Attendance</CardTitle>
            <p className="text-sm text-muted-foreground">Attendance rate across recorded months</p>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {analysis.monthlyAttendance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance records yet.</p>
            ) : (
              analysis.monthlyAttendance.map((item) => (
                <div key={item.month} className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-base font-medium">{item.month}</span>
                  <span className="text-lg font-semibold tabular-nums">{item.percentage}%</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommended Next Actions */}
      <Card className="rounded-3xl p-6 bg-accent/20">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Lightbulb className="size-5" />
            Recommended Next Actions
          </CardTitle>
          <p className="text-sm text-muted-foreground">Targeted steps to raise performance score</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            {recommendations.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3 text-base">
                <ArrowRight className="size-5 shrink-0 mt-0.5 text-foreground" />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
