"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BookOpen,
  Settings2,
  TrendingUp,
  Users,
} from "lucide-react";
import { SmartBackButton } from "@/components/shared/BackNavigation";
import { cn } from "@/lib/utils";
import {
  StudentDetailRecord,
  formatStandingBadge,
} from "@/components/students/studentProfileTypes";
import {
  StudentClassesTab,
  StudentMarksTab,
  StudentOverviewTab,
} from "@/components/students/StudentOverviewTab";
import { StudentAnalysisTab } from "@/components/students/StudentAnalysisTab";
import { StudentActionsTab } from "@/components/students/StudentActionsTab";

const TABS = [
  { id: "overview", label: "Overview", icon: Users },
  { id: "classes", label: "Classes", icon: BookOpen },
  { id: "marks", label: "Marks", icon: Award },
  { id: "analysis", label: "Analysis", icon: TrendingUp },
  { id: "actions", label: "Actions", icon: Settings2 },
] as const;

type TabType = (typeof TABS)[number]["id"];

export default function StudentDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-5 animate-pulse">
          <div className="h-44 bg-[#F4F8FD] border border-[#DDE8F8] rounded-[28px]" />
          <div className="h-72 bg-white border border-[#DDE8F8] rounded-[28px]" />
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

  const usernameParam = (params?.username as string) || "";
  const rawTab = searchParams?.get("tab") || "overview";
  const currentTab: TabType =
    rawTab === "account"
      ? "actions"
      : TABS.some((t) => t.id === rawTab)
        ? (rawTab as TabType)
        : "overview";

  const setTab = (tab: TabType) => {
    const sp = new URLSearchParams(searchParams?.toString() || "");
    sp.set("tab", tab);
    router.replace(`/students/${usernameParam}?${sp.toString()}`);
  };

  const { data: studentData, isLoading, error } = useQuery<{ data: StudentDetailRecord }>({
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

  React.useEffect(() => {
    if (student?.username && usernameParam !== student.username) {
      const sp = searchParams?.toString();
      router.replace(`/students/${student.username}${sp ? `?${sp}` : ""}`);
    }
  }, [student?.username, usernameParam, router, searchParams]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-44 bg-[#F4F8FD] border border-[#DDE8F8] rounded-[28px]" />
        <div className="h-72 bg-white border border-[#DDE8F8] rounded-[28px]" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="bg-white border border-[#DDE8F8] rounded-[28px] p-12 text-center space-y-4">
        <AlertCircle className="size-12 text-rose-600 mx-auto" />
        <h2 className="text-xl font-black text-[#0F172A]">Student Not Found</h2>
        <p className="text-xs sm:text-sm text-[#627D98] max-w-md mx-auto">
          {error instanceof Error
            ? error.message
            : "The student profile was not found or access is restricted."}
        </p>
        <SmartBackButton
          fallbackHref="/students"
          fallbackLabel="Back to Students"
          variant="button"
          className="border-[#DDE8F8]"
        />
      </div>
    );
  }

  const standing = formatStandingBadge(student.group);
  const initials = student.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Back Bar */}
      <div className="flex items-center justify-between gap-3 no-print">
        <SmartBackButton
          fallbackHref="/students"
          fallbackLabel="Back to Students"
        />
        <span className="text-xs font-bold text-[#627D98] tabular-nums">
          Adm No: <span className="text-[#0F172A]">{student.admissionNo}</span>
        </span>
      </div>

      {/* Minimal 2-Card Hero Header + Clean Pill Navigation */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 bg-white border border-[#DDE8F8] rounded-[28px] p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0 flex-1">
              <div className="size-14 sm:size-16 rounded-2xl bg-[#EBF3FE] border border-[#DDE8F8] text-[#184880] flex items-center justify-center font-black text-lg sm:text-xl shrink-0">
                {initials || "ST"}
              </div>

              <div className="min-w-0 space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize",
                      student.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    )}
                  >
                    {student.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F4F8FD] text-[#184880] border border-[#DDE8F8]">
                    {student.grade || "Unassigned"}
                  </span>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
                      standing.className
                    )}
                  >
                    {standing.label}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight truncate">
                  {student.name}
                </h1>

                <p className="text-xs font-semibold text-[#627D98]">
                  @{student.username} • {student.enrollments.length} classes • {student.marks.length} assessments
                </p>
              </div>
            </div>

            {currentTab === "analysis" && (
              <div className="md:max-w-[300px] border-l-2 border-yellow-500 shrink-0 rounded-none pl-4 flex items-start gap-2.5">
                <AlertCircle className="size-4 text-yellow-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-extrabold text-yellow-500 leading-tight">
                    Notice
                  </p>
                  <p className="text-[11px] text-yellow-600 leading-snug font-medium">
                    This page uses Artificial Intelligence to generate insights, and it may not always be accurate. Don&apos;t rely on this alone—always check real records.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Clean Pill Tabs */}
          <div className="flex items-center gap-1.5 pt-4 border-t border-[#DDE8F8] overflow-x-auto no-print">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTab(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-colors shrink-0 cursor-pointer",
                    isActive
                      ? "bg-[#184880] text-white"
                      : "bg-[#F4F8FD] text-[#627D98] hover:text-[#0F172A] border border-[#DDE8F8]"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === "classes" && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] tabular-nums",
                        isActive ? "bg-white/20 text-white" : "bg-[#EBF3FE] text-[#184880]"
                      )}
                    >
                      {student.enrollments.length}
                    </span>
                  )}
                  {tab.id === "marks" && (
                    <span
                      className={cn(
                        "px-1.5 py-0.2 rounded-full text-[10px] tabular-nums",
                        isActive ? "bg-white/20 text-white" : "bg-[#EBF3FE] text-[#184880]"
                      )}
                    >
                      {student.marks.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Solid #184880 Performance Anchor Card */}
        <div className="lg:col-span-4 bg-[#184880] text-white rounded-[28px] p-6 sm:p-7 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold tracking-wide">
                OVERALL SCORE
              </span>
              <span className="text-xs font-bold text-white/80">
                {student.groupLabel || standing.label}
              </span>
            </div>

            <div className="pt-2">
              <p className="text-4xl sm:text-5xl font-black tabular-nums tracking-tight">
                {student.hasGradedScore === false && student.marks.length === 0
                  ? "—"
                  : `${student.performanceScore}%`}
              </p>
              <p className="text-xs text-white/80 font-medium mt-1">
                Combined marks & attendance index
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/15">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase text-white/75 block">Marks</span>
              <span className="text-base font-black tabular-nums mt-0.5 block">
                {student.marksScore !== null && student.marksScore !== undefined
                  ? `${student.marksScore}%`
                  : "—"}
              </span>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-2xl p-3">
              <span className="text-[10px] font-bold uppercase text-white/75 block">
                Attendance
              </span>
              <span className="text-base font-black tabular-nums mt-0.5 block">
                {student.attendanceScore !== null && student.attendanceScore !== undefined
                  ? `${student.attendanceScore}%`
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Active Tab Body */}
      {currentTab === "overview" && (
        <StudentOverviewTab student={student} onNavigateTab={setTab} />
      )}

      {currentTab === "classes" && <StudentClassesTab student={student} />}

      {currentTab === "marks" && <StudentMarksTab student={student} />}

      {currentTab === "analysis" && <StudentAnalysisTab studentId={student.id} />}

      {currentTab === "actions" && (
        <StudentActionsTab
          key={`${student.id}:${student.name}:${student.phone || ""}:${student.email || ""}:${student.grade}:${student.status}:${student.guardian?.phone || ""}`}
          student={student}
          onOpenAnalysis={() => setTab("analysis")}
        />
      )}
    </div>
  );
}
