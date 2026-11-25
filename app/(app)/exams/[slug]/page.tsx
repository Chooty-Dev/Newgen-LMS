"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  FileCheck,
  BookOpen,
  UserCheck,
  Award,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  TrendingUp,
  Search,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { SmartBackButton } from "@/components/shared/BackNavigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoader } from "@/components/ui/data-loader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: FileCheck },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "staff", label: "Evaluators", icon: UserCheck },
  { id: "results", label: "Results", icon: Award },
] as const;

type TabType = (typeof TABS)[number]["id"];

export default function ExamDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6 animate-pulse">
          <div className="h-44 bg-muted/60 rounded-3xl" />
          <div className="h-12 bg-muted/40 rounded-2xl w-96" />
          <div className="h-64 bg-card rounded-3xl border border-border" />
        </div>
      }
    >
      <ExamDetailsContent />
    </React.Suspense>
  );
}

function ExamDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const slugParam = (params?.slug as string) || "";
  const currentTab = (searchParams?.get("tab") as TabType) || "overview";

  const setTab = (tab: TabType) => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.set("tab", tab);
    router.replace(`/exams/${slugParam}?${sp.toString()}`);
  };

  // Fetch Assessment Details
  const { data: examData, isLoading, error } = useQuery({
    queryKey: ["exam-details", slugParam],
    queryFn: async () => {
      const res = await fetch(`/api/v1/exams/${slugParam}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to load exam details");
      }
      return res.json();
    },
    enabled: !!slugParam,
  });

  const rawData = examData?.data;
  const exam = rawData?.assessment || rawData;

  // If accessed by Mongo ID and document has a slug, redirect to canonical slug
  React.useEffect(() => {
    if (exam?.slug && slugParam !== exam.slug) {
      const sp = searchParams?.toString();
      router.replace(`/exams/${exam.slug}${sp ? `?${sp}` : ""}`);
    }
  }, [exam?.slug, slugParam, router, searchParams]);

  // Evaluator Assignment
  const [evaluatorModalOpen, setEvaluatorModalOpen] = React.useState(false);
  const [selectedStaffId, setSelectedStaffId] = React.useState("");

  const { data: allStaffData, isLoading: allStaffLoading } = useQuery({
    queryKey: ["all-staff-picker", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/staff?limit=100");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: evaluatorModalOpen,
  });

  const assignEvaluatorMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const res = await fetch(`/api/v1/exams/${exam.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to assign evaluator");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Evaluator assigned to assessment");
      queryClient.invalidateQueries({ queryKey: ["exam-details", slugParam] });
      setEvaluatorModalOpen(false);
      setSelectedStaffId("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const [staffToUnassign, setStaffToUnassign] = React.useState<{ id: string; name: string } | null>(null);
  const unassignEvaluatorMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const res = await fetch(`/api/v1/exams/${exam.id}/staff`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) throw new Error("Failed to unassign evaluator");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Evaluator unassigned");
      queryClient.invalidateQueries({ queryKey: ["exam-details", slugParam] });
      setStaffToUnassign(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Results search state
  const [resultSearch, setResultSearch] = React.useState("");

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-muted/60 rounded-3xl" />
        <div className="h-12 bg-muted/40 rounded-2xl w-96" />
        <div className="h-64 bg-card rounded-3xl border border-border" />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
        <AlertCircle className="size-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-foreground">Assessment Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error instanceof Error ? error.message : "The exam or test you are looking for does not exist."}
        </p>
        <SmartBackButton
          fallbackHref="/exams"
          fallbackLabel="Back to Exams & Tests"
          variant="button"
        />
      </div>
    );
  }

  const assignedClasses = rawData?.classes || exam?.assignedClasses || [];
  const evaluators = rawData?.staff || exam?.evaluators || [];
  const rawResults = rawData?.results || exam?.results;
  const results = {
    summary: {
      totalStudents: rawResults?.summary?.totalStudents ?? rawResults?.totalEvaluated ?? 0,
      submittedCount: rawResults?.summary?.submittedCount ?? rawResults?.submittedCount ?? 0,
      passCount: rawResults?.summary?.passCount ?? rawResults?.passCount ?? 0,
      passRate: rawResults?.summary?.passRate ?? rawResults?.passRate ?? 0,
      averageScore: rawResults?.summary?.averageScore ?? rawResults?.average ?? 0,
      highestScore: rawResults?.summary?.highestScore ?? rawResults?.highest ?? 0,
      lowestScore: rawResults?.summary?.lowestScore ?? rawResults?.lowest ?? 0,
    },
    distribution: rawResults?.distribution || rawResults?.gradeDistribution || { A: 0, B: 0, C: 0, S: 0, F: 0 },
    marks: rawResults?.studentMarks || rawResults?.marks || [],
  };

  const filteredMarks = (results.marks || []).filter((m: { studentName: string; studentUsername: string }) => {
    if (!resultSearch) return true;
    const q = resultSearch.toLowerCase();
    return m.studentName.toLowerCase().includes(q) || m.studentUsername.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <SmartBackButton
          fallbackHref="/exams"
          fallbackLabel="Back to Exams & Tests"
          className="text-muted-foreground hover:text-foreground"
        />
      </div>

      {/* Banner */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)]">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white">
              {exam.type || "exam"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-white/10 text-white">
              {(exam.status || "scheduled").replace("_", " ")}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
              Total: {exam.totalMarks || 100} Marks
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {exam.title}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            {exam.subject || exam.subjectName || "Subject Assessment"} • Scheduled for {exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleDateString() : (exam.sessions?.[0]?.date || "Upcoming")}
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <BookOpen className="size-3.5 text-white" />
              <span>{assignedClasses.length} Classes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <UserCheck className="size-3.5 text-white" />
              <span>{evaluators.length} Evaluators</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Award className="size-3.5 text-white" />
              <span>{results.summary.submittedCount} Submissions</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 p-1.5 bg-card border border-border rounded-2xl shadow-xs overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
              {tab.id === "classes" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {assignedClasses.length}
                </span>
              )}
              {tab.id === "staff" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {evaluators.length}
                </span>
              )}
              {tab.id === "results" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {results.summary.submittedCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {currentTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-foreground">Assessment Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Scheduled Date</span>
                  <p className="text-sm font-bold text-foreground">
                    {exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleDateString() : (exam.sessions?.[0]?.date || "Upcoming")}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Duration</span>
                  <p className="text-sm font-bold text-foreground">{exam.durationMinutes || 60} Minutes</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Pass Mark</span>
                  <p className="text-sm font-bold text-foreground">{exam.passMark || 40} / {exam.totalMarks || 100}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Weight Multiplier</span>
                  <p className="text-sm font-bold text-foreground">{exam.weight || 1}x</p>
                </div>
              </div>

              {exam.description && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground mb-1">Description & Guidelines</h4>
                  <p className="text-xs text-foreground leading-relaxed p-3.5 rounded-2xl bg-secondary/20 border border-border">
                    {exam.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-foreground">Result Quick Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Class Average</span>
                  <span className="text-sm font-black text-primary">{results.summary.averageScore}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Pass Rate</span>
                  <span className="text-sm font-black text-emerald-600">{results.summary.passRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Highest Score</span>
                  <span className="text-sm font-black text-foreground">{results.summary.highestScore}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Classes */}
      {currentTab === "classes" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-extrabold text-foreground">Assigned Classes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Classes sitting for this assessment.</p>
          </div>

          {assignedClasses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No classes linked.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {assignedClasses.map((c: { id: string; name: string; slug?: string; grade?: string; type?: string; enrolledCount?: number }) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/classes/${c.slug || c.id}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{c.name}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade: {c.grade || "-"} • {c.type} • {c.enrolledCount || 0} Students Enrolled
                    </p>
                  </div>
                  <Link
                    href={`/classes/${c.slug || c.id}`}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View Class
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff (Evaluators) */}
      {currentTab === "staff" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-extrabold text-foreground">Assigned Evaluators</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Staff members authorized to grade submissions.</p>
            </div>
            <Button
              onClick={() => setEvaluatorModalOpen(true)}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              <Plus className="size-3.5 mr-1.5" />
              Assign Evaluator
            </Button>
          </div>

          {evaluators.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <UserCheck className="size-10 mx-auto opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No evaluators assigned</p>
              <p className="text-xs">Click Assign Evaluator to allocate staff for grading.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {evaluators.map((st: { id: string; name: string; username: string; title?: string }) => (
                <div key={st.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/staff/${st.username}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{st.name}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">@{st.username} • {st.title || "Staff"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStaffToUnassign({ id: st.id, name: st.name })}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full size-8 p-0"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Results */}
      {currentTab === "results" && (
        <div className="space-y-6">
          {/* Summary Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Class Average</span>
              <p className="text-xl font-black text-primary mt-1">{results.summary.averageScore}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pass Rate</span>
              <p className="text-xl font-black text-emerald-600 mt-1">{results.summary.passRate}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Highest Mark</span>
              <p className="text-xl font-black text-foreground mt-1">{results.summary.highestScore}</p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lowest Mark</span>
              <p className="text-xl font-black text-rose-600 mt-1">{results.summary.lowestScore}</p>
            </div>
          </div>

          {/* Grade Distribution */}
          <div className="bg-card border border-border rounded-3xl p-5 shadow-xs">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-3">Grade Distribution</h4>
            <div className="flex flex-wrap items-center gap-3">
              {(["A", "B", "C", "S", "F"] as const).map((g) => (
                <div key={g} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border text-xs">
                  <span className="font-black text-foreground">Grade {g}:</span>
                  <span className="font-bold text-primary">{results.distribution[g] || 0}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student Marks List */}
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <h3 className="text-base font-extrabold text-foreground">Student Scores</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Individual marks recorded for this assessment.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-full bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {filteredMarks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No student marks matching your criteria.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {filteredMarks.map((m: { id: string; studentId: string; studentName: string; studentUsername: string; score: number; percentage: number; grade: string; feedback?: string }) => (
                  <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <Link
                        href={`/students/${m.studentUsername}`}
                        className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <span>{m.studentName}</span>
                        <ExternalLink className="size-3 text-muted-foreground" />
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        @{m.studentUsername} {m.feedback ? `• "${m.feedback}"` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <span className="text-sm font-bold text-foreground block tabular-nums">{m.score}</span>
                        <span className="text-[10px] text-muted-foreground">{m.percentage}%</span>
                      </div>
                      <span className="inline-flex size-8 rounded-full bg-secondary text-primary border border-border items-center justify-center font-black text-xs">
                        {m.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Evaluator Dialog */}
      <Dialog open={evaluatorModalOpen} onOpenChange={setEvaluatorModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Assign Evaluator</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="max-h-60 overflow-y-auto divide-y divide-border/50 border border-border rounded-2xl p-2">
              {allStaffLoading ? (
                <DataLoader text="Loading evaluators..." minHeight="min-h-[140px]" />
              ) : (() => {
                const available = ((allStaffData?.data || []) as Array<{ id: string; name: string; username: string; title?: string }>)
                  .filter((s) => !evaluators.some((as: { id: string }) => as.id === s.id));
                if (available.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      No additional staff members available to assign.
                    </p>
                  );
                }
                return available.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-secondary/40 rounded-xl cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="evaluatorSelection"
                      checked={selectedStaffId === s.id}
                      onChange={() => setSelectedStaffId(s.id)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-bold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">@{s.username} • {s.title || "Staff"}</p>
                    </div>
                  </label>
                ));
              })()}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEvaluatorModalOpen(false)} className="rounded-full text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => assignEvaluatorMutation.mutate(selectedStaffId)}
              disabled={!selectedStaffId || assignEvaluatorMutation.isPending}
              className="rounded-full bg-primary text-primary-foreground text-xs font-bold"
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Confirmation */}
      <ConfirmDialog
        open={!!staffToUnassign}
        onOpenChange={(open) => { if (!open) setStaffToUnassign(null); }}
        title="Unassign Evaluator"
        description={`Are you sure you want to remove ${staffToUnassign?.name} as evaluator from this assessment?`}
        confirmLabel="Unassign"
        isDestructive={true}
        onConfirm={() => {
          if (staffToUnassign) unassignEvaluatorMutation.mutate(staffToUnassign.id);
        }}
      />
    </div>
  );
}
