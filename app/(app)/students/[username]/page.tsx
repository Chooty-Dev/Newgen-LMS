"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Users,
  BookOpen,
  Award,
  TrendingUp,
  KeyRound,
  Copy,
  Check,
  Calendar,
  Phone,
  Mail,
  Shield,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: Users },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "marks", label: "Marks", icon: Award },
  { id: "analysis", label: "Analysis", icon: TrendingUp },
  { id: "account", label: "Account", icon: KeyRound },
] as const;

type TabType = (typeof TABS)[number]["id"];

export default function StudentDetailsPage() {
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
      <StudentDetailsContent />
    </React.Suspense>
  );
}

function StudentDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const usernameParam = (params?.username as string) || "";
  const currentTab = (searchParams?.get("tab") as TabType) || "overview";

  const setTab = (tab: TabType) => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.set("tab", tab);
    router.replace(`/students/${usernameParam}?${sp.toString()}`);
  };

  // Fetch Student Details
  const { data: studentData, isLoading, error } = useQuery({
    queryKey: ["student-details", usernameParam],
    queryFn: async () => {
      const res = await fetch(`/api/v1/students/${usernameParam}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to load student");
      }
      return res.json();
    },
    enabled: !!usernameParam,
  });

  const student = studentData?.data;

  // If accessed by Mongo ID and user has a username, canonicalize to username
  React.useEffect(() => {
    if (student?.username && usernameParam !== student.username) {
      const sp = searchParams?.toString();
      router.replace(`/students/${student.username}${sp ? `?${sp}` : ""}`);
    }
  }, [student?.username, usernameParam, router, searchParams]);

  // Reset Password State
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/v1/users/${userId}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to reset password");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setResetConfirmOpen(false);
      setTempPassword(data.data?.temporaryPassword || null);
      toast.success("Password reset successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-muted/60 rounded-3xl" />
        <div className="h-12 bg-muted/40 rounded-2xl w-96" />
        <div className="h-64 bg-card rounded-3xl border border-border" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
        <AlertCircle className="size-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-foreground">Student Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error instanceof Error ? error.message : "The student profile was not found or access is restricted."}
        </p>
        <Button onClick={() => router.push("/students")} variant="outline" className="rounded-full">
          <ArrowLeft className="size-4 mr-2" />
          Back to Students
        </Button>
      </div>
    );
  }

  const enrollments = student.enrollments || [];
  const marks = student.marks || [];
  const snapshots = student.snapshots || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Students</span>
        </Link>
      </div>

      {/* Banner */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)]">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white">
              Student Profile
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold capitalize",
                student.status === "active" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white"
              )}
            >
              {student.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
              Grade: {student.grade || "-"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-white/10 text-white">
              Group: {student.group}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {student.name}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            @{student.username} • Adm No: {student.admissionNo} • Performance Score: {student.performanceScore}%
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <BookOpen className="size-3.5 text-white" />
              <span>{enrollments.length} Enrolled Classes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Award className="size-3.5 text-white" />
              <span>{marks.length} Assessments Taken</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Calendar className="size-3.5 text-white" />
              <span>Joined {new Date(student.joinedAt).toLocaleDateString()}</span>
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
                  {enrollments.length}
                </span>
              )}
              {tab.id === "marks" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {marks.length}
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
              <h3 className="text-base font-extrabold text-foreground">Personal & Academic Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Admission Number</span>
                  <p className="text-sm font-bold text-foreground">{student.admissionNo}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Grade</span>
                  <p className="text-sm font-bold text-foreground">{student.grade || "-"}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Date of Birth</span>
                  <p className="text-sm font-bold text-foreground">
                    {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "-"}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Phone</span>
                  <p className="text-sm font-bold text-foreground">{student.phone || "-"}</p>
                </div>
                <div className="col-span-2 p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Email</span>
                  <p className="text-sm font-bold text-foreground">{student.email || "-"}</p>
                </div>
              </div>

              {student.guardian && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-muted-foreground mb-2">Guardian Information</h4>
                  <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border text-xs space-y-1">
                    <p className="font-bold text-foreground">{student.guardian.name} ({student.guardian.relation})</p>
                    <p className="text-muted-foreground">Phone: {student.guardian.phone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-foreground">Performance Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Overall Score</span>
                  <span className="text-sm font-black text-primary">{student.performanceScore}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Academic Group</span>
                  <span className="text-sm font-black capitalize text-foreground">{student.group}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Enrolled Classes</span>
                  <span className="text-sm font-black text-foreground">{enrollments.length}</span>
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
            <h3 className="text-base font-extrabold text-foreground">Enrolled Classes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Classes in which this student is currently registered.</p>
          </div>

          {enrollments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">Not enrolled in any classes.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {enrollments.map((e: { id: string; classId: string; className: string; slug?: string; grade?: string; type?: string; status: string; enrolledAt: string }) => (
                <div key={e.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/classes/${e.slug || e.classId}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{e.className}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade: {e.grade || "-"} • {e.type} • Enrolled: {new Date(e.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize",
                      e.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                    )}
                  >
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Marks */}
      {currentTab === "marks" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-extrabold text-foreground">Assessment Marks</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Recorded scores for all quizzes, tests and term examinations.</p>
          </div>

          {marks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No assessment marks recorded yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {marks.map((m: { id: string; assessmentId: string; assessmentTitle: string; assessmentSlug?: string; score: number; totalMarks: number; percentage: number; grade: string; feedback?: string; evaluatedAt: string }) => (
                <div key={m.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/exams/${m.assessmentSlug || m.assessmentId}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{m.assessmentTitle}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Date: {new Date(m.evaluatedAt).toLocaleDateString()} {m.feedback ? `• Feedback: "${m.feedback}"` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-sm font-bold text-foreground block tabular-nums">
                        {m.score} / {m.totalMarks}
                      </span>
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
      )}

      {/* Tab 4: Analysis */}
      {currentTab === "analysis" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-extrabold text-foreground">Performance History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Weekly performance snapshots and group classifications.</p>
          </div>

          {snapshots.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No performance snapshots available.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {snapshots.map((s: { id: string; period: string; score: number; group: string; attendanceRate: number; rank?: number }) => (
                <div key={s.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">Period: {s.period}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Attendance: {s.attendanceRate}% {s.rank ? `• Rank #${s.rank}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-primary tabular-nums">{s.score}%</span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize",
                        s.group === "excellent"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : s.group === "weak"
                          ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {s.group}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Account (Reset Password) */}
      {currentTab === "account" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 max-w-xl">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-extrabold text-foreground">Account & Credentials</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reset temporary password for this student.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/30 border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <KeyRound className="size-4 text-primary" />
              <span>Password Reset</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If the student has forgotten their password or cannot log in, generating a new temporary password will revoke existing sessions and require a password change on next login.
            </p>
            <Button
              onClick={() => setResetConfirmOpen(true)}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              Reset Temporary Password
            </Button>
          </div>
        </div>
      )}

      {/* Confirm Password Reset */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Student Password"
        description={`Are you sure you want to generate a new temporary password for ${student.name}? Their existing login sessions will be terminated.`}
        confirmLabel="Reset Password"
        isDestructive={false}
        onConfirm={() => resetPasswordMutation.mutate(student.id)}
      />

      {/* Temporary Password Display Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Temporary Password Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Please share this temporary password with the student. They will be prompted to change it immediately after signing in.
            </p>
            <div className="p-4 rounded-2xl bg-secondary border border-border flex items-center justify-between gap-2">
              <span className="font-mono text-base font-bold text-foreground select-all">{tempPassword}</span>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="rounded-full size-8 p-0">
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)} className="rounded-full bg-primary text-primary-foreground font-bold text-xs">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
