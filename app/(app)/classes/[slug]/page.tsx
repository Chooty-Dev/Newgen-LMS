"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  BookOpen,
  Users,
  UserCheck,
  FileCheck,
  Bell,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "students", label: "Students", icon: Users },
  { id: "staff", label: "Staff", icon: UserCheck },
  { id: "exams", label: "Exams & Tests", icon: FileCheck },
  { id: "announcements", label: "Announcements", icon: Bell },
] as const;

type TabType = (typeof TABS)[number]["id"];

export default function ClassDetailsPage() {
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
      <ClassDetailsContent />
    </React.Suspense>
  );
}

function ClassDetailsContent() {
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
    router.replace(`/classes/${slugParam}?${sp.toString()}`);
  };

  // Fetch Class Details
  const { data: classData, isLoading, error } = useQuery({
    queryKey: ["class-details", slugParam],
    queryFn: async () => {
      const res = await fetch(`/api/v1/classes/${slugParam}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to load class");
      }
      return res.json();
    },
    enabled: !!slugParam,
  });

  const rawData = classData?.data;
  const cls = rawData?.class || rawData;

  // If accessed by Mongo ID and document has a slug, redirect to canonical slug
  React.useEffect(() => {
    if (cls?.slug && slugParam !== cls.slug) {
      const sp = searchParams?.toString();
      router.replace(`/classes/${cls.slug}${sp ? `?${sp}` : ""}`);
    }
  }, [cls?.slug, slugParam, router, searchParams]);

  // Fetch Students Enrolled in Class
  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["class-students", cls?.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/classes/${cls.id}/students`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
    enabled: !!cls?.id,
  });

  // Fetch Available Students to Enroll
  const [enrollModalOpen, setEnrollModalOpen] = React.useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([]);
  const [studentSearch, setStudentSearch] = React.useState("");

  const { data: allStudentsData } = useQuery({
    queryKey: ["all-students-picker", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/students?limit=200");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: enrollModalOpen,
  });

  // Fetch Available Staff for Assignment
  const [staffModalOpen, setStaffModalOpen] = React.useState(false);
  const [selectedStaffId, setSelectedStaffId] = React.useState("");

  const { data: allStaffData } = useQuery({
    queryKey: ["all-staff-picker", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/staff?limit=100");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: staffModalOpen,
  });

  // Enroll Mutation
  const enrollMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      const res = await fetch(`/api/v1/classes/${cls.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to enroll students");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.data?.message || "Students enrolled successfully");
      queryClient.invalidateQueries({ queryKey: ["class-students", cls?.id] });
      queryClient.invalidateQueries({ queryKey: ["class-details", slugParam] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setEnrollModalOpen(false);
      setSelectedStudentIds([]);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Remove Student Mutation
  const [studentToRemove, setStudentToRemove] = React.useState<{ id: string; name: string } | null>(null);
  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const res = await fetch(`/api/v1/classes/${cls.id}/students`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [studentId] }),
      });
      if (!res.ok) throw new Error("Failed to remove student");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Student removed from class");
      queryClient.invalidateQueries({ queryKey: ["class-students", cls?.id] });
      queryClient.invalidateQueries({ queryKey: ["class-details", slugParam] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setStudentToRemove(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Assign Staff Mutation
  const assignStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const res = await fetch(`/api/v1/classes/${cls.id}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "Failed to assign staff");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Staff member assigned to class");
      queryClient.invalidateQueries({ queryKey: ["class-details", slugParam] });
      setStaffModalOpen(false);
      setSelectedStaffId("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Unassign Staff Mutation
  const [staffToUnassign, setStaffToUnassign] = React.useState<{ id: string; name: string } | null>(null);
  const unassignStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      const res = await fetch(`/api/v1/classes/${cls.id}/staff`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      if (!res.ok) throw new Error("Failed to unassign staff");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Staff member unassigned");
      queryClient.invalidateQueries({ queryKey: ["class-details", slugParam] });
      setStaffToUnassign(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-muted/60 rounded-3xl" />
        <div className="h-12 bg-muted/40 rounded-2xl w-96" />
        <div className="h-64 bg-card rounded-3xl border border-border" />
      </div>
    );
  }

  if (error || !cls) {
    return (
      <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
        <AlertCircle className="size-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-foreground">Class Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error instanceof Error ? error.message : "The class you are looking for does not exist or you do not have permission to view it."}
        </p>
        <Button onClick={() => router.push("/classes")} variant="outline" className="rounded-full">
          <ArrowLeft className="size-4 mr-2" />
          Back to Classes
        </Button>
      </div>
    );
  }

  const enrolledStudents = studentsData?.data || rawData?.students || [];
  const assignedStaff = rawData?.staff || cls?.assignedStaff || [];
  const assessments = rawData?.assessments || cls?.assessments || [];
  const announcements = rawData?.announcements || cls?.announcements || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Back Link */}
      <div>
        <Link
          href="/classes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Classes</span>
        </Link>
      </div>

      {/* Class Banner (Single Blue, matches Teacher theme) */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)]">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
              {cls.type === "special" ? "Special Revision" : "Regular Batch"}
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold capitalize",
                cls.status === "active" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white/80"
              )}
            >
              {cls.status}
            </span>
            {cls.grade && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
                Grade {cls.grade}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {cls.name}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            {cls.subject || cls.subjectName || "Subject Batch"} • Enrolled: {cls.enrolledCount ?? enrolledStudents.length} / {cls.capacity || 50} capacity
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Clock className="size-3.5 text-white" />
              <span>{cls.schedule?.type === "special" ? "Special Schedule" : "Weekly Sessions"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <Users className="size-3.5 text-white" />
              <span>{enrolledStudents.length} Students</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <UserCheck className="size-3.5 text-white" />
              <span>{assignedStaff.length} Staff</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Navigation */}
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
              {tab.id === "students" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {enrolledStudents.length}
                </span>
              )}
              {tab.id === "staff" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {assignedStaff.length}
                </span>
              )}
              {tab.id === "exams" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {assessments.length}
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
              <h3 className="text-base font-extrabold text-foreground">Class Schedule & Timetable</h3>
              {cls.schedule?.type === "regular" && cls.schedule.regular ? (
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Calendar className="size-4 text-primary" />
                    <span>Weekly Days: {cls.schedule.regular.daysOfWeek?.join(", ") || "Scheduled"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" />
                    <span>Time: {cls.schedule.regular.startTime} - {cls.schedule.regular.endTime}</span>
                  </div>
                </div>
              ) : cls.schedule?.type === "special" && cls.schedule.special?.sessions ? (
                <div className="space-y-2">
                  {cls.schedule.special.sessions.map((sess: { date: string; startTime: string; endTime: string }, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl bg-secondary/40 border border-border flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground">{new Date(sess.date).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">{sess.startTime} - {sess.endTime}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No timetable details specified.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-foreground">Recent Assessments</h3>
                <Button variant="ghost" size="sm" onClick={() => setTab("exams")} className="text-xs font-bold text-primary">
                  View All
                </Button>
              </div>
              {assessments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4">No assessments scheduled for this class yet.</p>
              ) : (
                <div className="divide-y divide-border/60">
                  {assessments.slice(0, 3).map((a: { id: string; title: string; slug?: string; scheduledAt: string; status: string }) => (
                    <div key={a.id} className="py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.scheduledAt).toLocaleDateString()}</p>
                      </div>
                      <Link
                        href={`/exams/${a.slug || a.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <span>Details</span>
                        <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-foreground">Class Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Capacity</span>
                  <span className="text-sm font-black text-foreground">{cls.capacity} seats</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Enrolled Students</span>
                  <span className="text-sm font-black text-primary">{enrolledStudents.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Assigned Staff</span>
                  <span className="text-sm font-black text-foreground">{assignedStaff.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Students */}
      {currentTab === "students" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-extrabold text-foreground">Enrolled Students</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage student enrollment for this class.
              </p>
            </div>
            <Button
              onClick={() => setEnrollModalOpen(true)}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              <Plus className="size-3.5 mr-1.5" />
              Enroll Students
            </Button>
          </div>

          {loadingStudents ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </div>
          ) : enrolledStudents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <Users className="size-10 mx-auto opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No students enrolled yet</p>
              <p className="text-xs">Click the Enroll Students button to add students to this class.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {enrolledStudents.map((st: { id: string; studentId: string; name: string; username: string; grade?: string; admissionNo?: string; enrolledAt: string }) => (
                <div key={st.id || st.studentId} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/students/${st.username}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{st.name}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{st.username} • Adm: {st.admissionNo || "-"} • Grade: {st.grade || "-"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStudentToRemove({ id: st.studentId || st.id, name: st.name })}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full size-8 p-0"
                      title="Remove from class"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Staff */}
      {currentTab === "staff" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-extrabold text-foreground">Assigned Staff Members</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Staff members assigned to assist with evaluation and coordination for this class.
              </p>
            </div>
            <Button
              onClick={() => setStaffModalOpen(true)}
              className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              <Plus className="size-3.5 mr-1.5" />
              Assign Staff Member
            </Button>
          </div>

          {assignedStaff.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <UserCheck className="size-10 mx-auto opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No staff members assigned</p>
              <p className="text-xs">Assign coordinators or evaluators to help manage this class.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {assignedStaff.map((st: { id: string; name: string; username: string; title?: string; position?: string }) => (
                <div key={st.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/staff/${st.username}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{st.name}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      @{st.username} • {st.title || "Staff"} • {st.position || "Coordinator"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStaffToUnassign({ id: st.id, name: st.name })}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full size-8 p-0"
                    title="Unassign staff"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Exams & Tests */}
      {currentTab === "exams" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-extrabold text-foreground">Class Exams & Tests</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                All term exams and weekly assessments conducted for this class.
              </p>
            </div>
            <Link
              href="/exams"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              <Plus className="size-3.5" />
              <span>Schedule New Exam</span>
            </Link>
          </div>

          {assessments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <FileCheck className="size-10 mx-auto opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No assessments scheduled yet</p>
              <p className="text-xs">Schedule an assessment to track marks for this class.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {assessments.map((a: { id: string; title: string; slug?: string; scheduledAt: string; status: string; totalMarks?: number; passMark?: number; type?: string }) => (
                <div key={a.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-secondary text-primary border border-border">
                        {a.type || "exam"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Link
                      href={`/exams/${a.slug || a.id}`}
                      className="text-base font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{a.title}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total Marks: {a.totalMarks || 100} • Pass: {a.passMark || 40}
                    </p>
                  </div>
                  <Link
                    href={`/exams/${a.slug || a.id}?tab=results`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-white transition-colors text-xs font-bold"
                  >
                    <span>View Results</span>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Announcements */}
      {currentTab === "announcements" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border/60">
            <div>
              <h3 className="text-base font-extrabold text-foreground">Class Announcements</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Announcements broadcast to students in this class.
              </p>
            </div>
            <Link
              href="/announcements"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              <Plus className="size-3.5" />
              <span>New Announcement</span>
            </Link>
          </div>

          {announcements.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-3">
              <Bell className="size-10 mx-auto opacity-30 text-primary" />
              <p className="text-sm font-bold text-foreground">No announcements posted for this class yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {announcements.map((an: { id: string; title: string; content: string; createdAt: string }) => (
                <div key={an.id} className="py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-foreground">{an.title}</h4>
                    <span className="text-xs text-muted-foreground">{new Date(an.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{an.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enroll Student Dialog (Multi-select picker) */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Enroll Students</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-border/50 border border-border rounded-2xl p-2">
              {((allStudentsData?.data || []) as Array<{ id: string; name: string; username: string; grade?: string }>)
                .filter((s) => !enrolledStudents.some((es: { studentId: string }) => es.studentId === s.id))
                .filter((s) => !studentSearch || s.name.toLowerCase().includes(studentSearch.toLowerCase()) || s.username.toLowerCase().includes(studentSearch.toLowerCase()))
                .map((s) => {
                  const isChecked = selectedStudentIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-2 hover:bg-secondary/40 rounded-xl cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedStudentIds((prev) =>
                            prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                          );
                        }}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-foreground truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{s.username} • {s.grade || "Grade -"}</p>
                      </div>
                    </label>
                  );
                })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEnrollModalOpen(false)} className="rounded-full text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => enrollMutation.mutate(selectedStudentIds)}
              disabled={selectedStudentIds.length === 0 || enrollMutation.isPending}
              className="rounded-full bg-primary text-primary-foreground text-xs font-bold"
            >
              Enroll ({selectedStudentIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Dialog */}
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Assign Staff Member</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="max-h-60 overflow-y-auto divide-y divide-border/50 border border-border rounded-2xl p-2">
              {((allStaffData?.data || []) as Array<{ id: string; name: string; username: string; title?: string }>)
                .filter((s) => !assignedStaff.some((as: { id: string }) => as.id === s.id))
                .map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 p-2 hover:bg-secondary/40 rounded-xl cursor-pointer text-xs"
                  >
                    <input
                      type="radio"
                      name="staffSelection"
                      checked={selectedStaffId === s.id}
                      onChange={() => setSelectedStaffId(s.id)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <p className="font-bold text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">@{s.username} • {s.title || "Staff"}</p>
                    </div>
                  </label>
                ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setStaffModalOpen(false)} className="rounded-full text-xs">
              Cancel
            </Button>
            <Button
              onClick={() => assignStaffMutation.mutate(selectedStaffId)}
              disabled={!selectedStaffId || assignStaffMutation.isPending}
              className="rounded-full bg-primary text-primary-foreground text-xs font-bold"
            >
              Assign Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Student Confirmation */}
      <ConfirmDialog
        open={!!studentToRemove}
        onOpenChange={(open) => { if (!open) setStudentToRemove(null); }}
        title="Remove Student from Class"
        description={`Are you sure you want to remove ${studentToRemove?.name} from this class? Their enrollment will be marked as left.`}
        confirmLabel="Remove Student"
        isDestructive={true}
        onConfirm={() => {
          if (studentToRemove) removeStudentMutation.mutate(studentToRemove.id);
        }}
      />

      {/* Unassign Staff Confirmation */}
      <ConfirmDialog
        open={!!staffToUnassign}
        onOpenChange={(open) => { if (!open) setStaffToUnassign(null); }}
        title="Unassign Staff Member"
        description={`Are you sure you want to unassign ${staffToUnassign?.name} from this class?`}
        confirmLabel="Unassign Staff"
        isDestructive={true}
        onConfirm={() => {
          if (staffToUnassign) unassignStaffMutation.mutate(staffToUnassign.id);
        }}
      />
    </div>
  );
}
