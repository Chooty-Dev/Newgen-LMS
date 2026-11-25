"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  UserCheck,
  BookOpen,
  FileCheck,
  Calendar,
  Mail,
  Phone,
  Clock,
  Sparkles,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { SmartBackButton } from "@/components/shared/BackNavigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: UserCheck },
  { id: "classes", label: "Assigned Classes", icon: BookOpen },
  { id: "exams", label: "Assigned Assessments", icon: FileCheck },
] as const;

type TabType = (typeof TABS)[number]["id"];

export default function StaffDetailsPage() {
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
      <StaffDetailsContent />
    </React.Suspense>
  );
}

function StaffDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const usernameParam = (params?.username as string) || "";
  const currentTab = (searchParams?.get("tab") as TabType) || "overview";

  const setTab = (tab: TabType) => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.set("tab", tab);
    router.replace(`/staff/${usernameParam}?${sp.toString()}`);
  };

  // Fetch Staff Details
  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ["staff-details", usernameParam],
    queryFn: async () => {
      const res = await fetch(`/api/v1/staff/${usernameParam}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Failed to load staff member");
      }
      return res.json();
    },
    enabled: !!usernameParam,
  });

  const staff = staffData?.data;

  // Canonicalize to username if accessed by Mongo ID
  React.useEffect(() => {
    if (staff?.username && usernameParam !== staff.username) {
      const sp = searchParams?.toString();
      router.replace(`/staff/${staff.username}${sp ? `?${sp}` : ""}`);
    }
  }, [staff?.username, usernameParam, router, searchParams]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-muted/60 rounded-3xl" />
        <div className="h-12 bg-muted/40 rounded-2xl w-96" />
        <div className="h-64 bg-card rounded-3xl border border-border" />
      </div>
    );
  }

  if (error || !staff) {
    return (
      <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
        <AlertCircle className="size-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-foreground">Staff Member Not Found</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {error instanceof Error ? error.message : "The staff member does not exist."}
        </p>
        <SmartBackButton
          fallbackHref="/staff"
          fallbackLabel="Back to Staff Members"
          variant="button"
        />
      </div>
    );
  }

  const assignedClasses = staff.assignedClasses || [];
  const assignedAssessments = staff.assignedAssessments || [];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <div>
        <SmartBackButton
          fallbackHref="/staff"
          fallbackLabel="Back to Staff Members"
          className="text-muted-foreground hover:text-foreground"
        />
      </div>

      {/* Banner */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)]">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-white">
              {staff.title || "Staff Member"}
            </span>
            <span
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold capitalize",
                staff.status === "active" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-white"
              )}
            >
              {staff.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white">
              {staff.position || "Coordinator"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {staff.name}
          </h1>

          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            @{staff.username} • {staff.email || "No email"} • Joined {new Date(staff.joinedAt).toLocaleDateString()}
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs text-white/90">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <BookOpen className="size-3.5 text-white" />
              <span>{assignedClasses.length} Assigned Classes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
              <FileCheck className="size-3.5 text-white" />
              <span>{assignedAssessments.length} Active Assessments</span>
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
              {tab.id === "exams" && (
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px]", isActive ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground")}>
                  {assignedAssessments.length}
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
              <h3 className="text-base font-extrabold text-foreground">Staff Profile Details</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Title</span>
                  <p className="text-sm font-bold text-foreground">{staff.title || "Staff Member"}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Role / Position</span>
                  <p className="text-sm font-bold text-foreground">{staff.position || "Coordinator"}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Email</span>
                  <p className="text-sm font-bold text-foreground">{staff.email || "-"}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1">
                  <span className="text-muted-foreground font-semibold">Phone</span>
                  <p className="text-sm font-bold text-foreground">{staff.phone || "-"}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-border/60">
                <span className="text-muted-foreground font-semibold text-xs block mb-2">Delegated Permissions</span>
                <div className="flex flex-wrap gap-2">
                  {staff.permissions && staff.permissions.length > 0 ? (
                    staff.permissions.map((p: string) => (
                      <span key={p} className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        ✓ {p.replace("students.", "").toUpperCase()} STUDENTS
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">Default Staff Permissions</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-foreground">Assignment Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Classes Assigned</span>
                  <span className="text-sm font-black text-primary">{assignedClasses.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40">
                  <span className="text-xs font-semibold text-muted-foreground">Evaluator on Exams</span>
                  <span className="text-sm font-black text-foreground">{assignedAssessments.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Assigned Classes */}
      {currentTab === "classes" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-extrabold text-foreground">Assigned Classes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Classes where this staff member provides assistance.</p>
          </div>

          {assignedClasses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No classes assigned to this staff member.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {assignedClasses.map((c: { id: string; name: string; slug?: string; grade?: string; type?: string; status: string }) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/classes/${c.slug || c.id}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{c.name}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Grade: {c.grade || "-"} • {c.type}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-secondary text-primary">
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Assigned Assessments */}
      {currentTab === "exams" && (
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="pb-4 border-b border-border/60">
            <h3 className="text-base font-extrabold text-foreground">Assigned Assessments</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Assessments where this staff member is registered as an evaluator.</p>
          </div>

          {assignedAssessments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No assessments assigned for evaluation.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {assignedAssessments.map((a: { id: string; title: string; slug?: string; scheduledAt: string; status: string; totalMarks?: number; type?: string }) => (
                <div key={a.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/exams/${a.slug || a.id}`}
                      className="text-sm font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{a.title}</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Date: {new Date(a.scheduledAt).toLocaleDateString()} • Total Marks: {a.totalMarks || 100}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize bg-secondary text-primary">
                    {(a.status || "scheduled").replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
