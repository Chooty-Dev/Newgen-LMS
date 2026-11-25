"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
  BookOpen,
} from "lucide-react";
import { AdminAssetTiles, AdminSectionHeader, AdminSurface } from "./AdminUI";

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

export function AdminAnalysisView() {
  const { user } = useAuth();
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");

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

  const overallSummary =
    analysis?.explanation?.overallSummary ||
    (analysis?.explanation as unknown as { summary?: string })?.summary ||
    "";
  const strengths = analysis?.explanation?.strengths || [];
  const weaknesses =
    analysis?.explanation?.weaknesses ||
    (analysis?.explanation as unknown as { weakPoints?: string[] })?.weakPoints ||
    [];
  const recommendations = analysis?.explanation?.recommendations || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 print-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex-1 max-w-md">
          <Select value={activeStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="h-10 rounded-full text-xs">
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} (@{st.username})
              </option>
            ))}
          </Select>
        </div>

        {analysis && (
          <Button variant="outline" onClick={() => window.print()} className="rounded-full h-10 px-5 text-xs font-bold gap-1.5 w-fit">
            <Printer className="size-3.5" />
            <span>Print Report</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <Skeleton className="h-32 rounded-[24px]" />
            <Skeleton className="h-32 rounded-[24px]" />
            <Skeleton className="h-32 rounded-[24px]" />
            <Skeleton className="h-32 rounded-[24px]" />
          </div>
          <Skeleton className="h-72 rounded-[24px]" />
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          <AdminAssetTiles
            columns={4}
            items={[
              { label: "Overall Score", value: `${analysis.score}%`, icon: TrendingUp, badge: analysis.groupLabel, tone: 1 },
              { label: "Marks Score", value: `${analysis.scoreBreakdown.marksScore}%`, icon: Award, badge: "Assessments", tone: 2 },
              { label: "Attendance", value: `${analysis.scoreBreakdown.attendanceScore}%`, icon: CheckCircle2, badge: "Presence", tone: 3 },
              { label: "Improvement", value: `${analysis.scoreBreakdown.improvementScore}%`, icon: BookOpen, badge: "Growth", tone: 1 },
            ]}
          />

          <AdminSurface tinted className="p-5 flex items-start gap-3">
            <Lightbulb className="size-5 text-[var(--primary)] shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm font-medium text-foreground leading-relaxed">{overallSummary}</p>
          </AdminSurface>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminSurface className="p-5">
              <AdminSectionHeader title="Performance Trend" />
              <AreaTrendChart data={analysis.trendData} />
            </AdminSurface>
            <AdminSurface className="p-5">
              <AdminSectionHeader title="Subject Breakdown" />
              <SubjectBarChart data={analysis.subjectComparison} />
            </AdminSurface>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <AdminSurface className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="size-4 text-[var(--primary)]" />
                <span>Strengths</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {strengths.length > 0 ? strengths.map((s, idx) => <li key={idx}>• {s}</li>) : <li>—</li>}
              </ul>
            </AdminSurface>

            <AdminSurface className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="size-4 text-rose-600" />
                <span>Needs Attention</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {weaknesses.length > 0 ? weaknesses.map((w, idx) => <li key={idx}>• {w}</li>) : <li>—</li>}
              </ul>
            </AdminSurface>

            <AdminSurface className="p-5 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Lightbulb className="size-4 text-[var(--primary)]" />
                <span>Recommendations</span>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {recommendations.length > 0 ? recommendations.map((r, idx) => <li key={idx}>• {r}</li>) : <li>—</li>}
              </ul>
            </AdminSurface>
          </div>
        </div>
      ) : (
        <AdminSurface className="p-12 text-center text-xs text-muted-foreground">
          Select a student to inspect performance.
        </AdminSurface>
      )}
    </div>
  );
}
