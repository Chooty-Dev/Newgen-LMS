"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Users,
  Award,
  AlertCircle,
  TrendingUp,
  Search,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface StudentRecord {
  id: string;
  name: string;
  username: string;
  admissionNo: string;
  grade: string;
  performanceScore: number;
  group: "weak" | "medium" | "excellent";
}

export function TeacherStudentsView() {
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<"all" | "excellent" | "medium" | "weak">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["students", "teacher-directory", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/students?limit=200");
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const students: StudentRecord[] = data?.data || [];

  const filtered = students.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(search.toLowerCase()));
    const matchesGroup = groupFilter === "all" || s.group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const excellentCount = students.filter((s) => s.group === "excellent").length;
  const mediumCount = students.filter((s) => s.group === "medium").length;
  const weakCount = students.filter((s) => s.group === "weak").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              My Students Directory
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Monitor student rankings, verify learning progress, and spot learners requiring academic support. Click below to view detailed AI performance insights.
            </p>
            <div className="pt-2">
              <Link
                href="/analysis"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <TrendingUp className="size-4" />
                <span>Performance Insights</span>
              </Link>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/group-learn.webp"
              alt="Students"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        {/* 4 Stats Cards + Search Bar: 4 cols on lg (1/3 width) */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* 4 Stats Cards tightly grouped in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {students.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Enrolled
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {excellentCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  High Performers
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                <UserCheck className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {mediumCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Good Standing
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {weakCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Needs Help
                </p>
              </div>
            </div>
          </div>

          {/* Combined Option 01 (Quick Actions) + Option 02 (Live Status Widget) */}
          <div className="bg-card border border-border/80 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold text-foreground truncate">
                {students.length} Total Students Enrolled
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setGroupFilter(groupFilter === "weak" ? "all" : "weak")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all active:scale-95",
                  groupFilter === "weak"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
                )}
              >
                <AlertCircle className="size-3" />
                <span>Needs Help</span>
              </button>
              <button
                type="button"
                onClick={() => setGroupFilter(groupFilter === "excellent" ? "all" : "excellent")}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all active:scale-95",
                  groupFilter === "excellent"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-primary/10 hover:bg-primary/20 text-primary"
                )}
              >
                <Award className="size-3" />
                <span>Top</span>
              </button>
            </div>
          </div>

          {/* Search bar directly beneath cards */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* 2. Filter Tabs */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "all", label: "All Students", count: students.length },
          { id: "excellent", label: "High Performers", count: excellentCount },
          { id: "medium", label: "Good", count: mediumCount },
          { id: "weak", label: "Needs Help", count: weakCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setGroupFilter(tab.id as any)}
            className={cn(
              "h-10 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
              groupFilter === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full",
                groupFilter === tab.id ? "bg-white/20 text-white" : "bg-secondary text-primary"
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </section>

      {/* 4. Students Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Users className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No students match</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or switching to &quot;All Students&quot;.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((st) => {
            const initials = st.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            const isEx = st.group === "excellent";
            const isWeak = st.group === "weak";

            return (
              <div
                key={st.id}
                className="bg-card border border-border rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-12 rounded-2xl bg-secondary text-primary font-black text-sm flex items-center justify-center border border-border shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                        {st.name}
                      </h4>
                      <p className="text-xs text-muted-foreground font-medium">
                        {st.username}
                      </p>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shrink-0",
                      isEx
                        ? "bg-emerald-100 text-emerald-700"
                        : isWeak
                        ? "bg-amber-100 text-amber-700"
                        : "bg-secondary text-primary border border-border"
                    )}
                  >
                    {isEx ? "Excellent" : isWeak ? "Needs Help" : "Good"}
                  </span>
                </div>

                {/* Score & Standing */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Standing Score</span>
                    <span className="text-lg font-black text-foreground tabular-nums">
                      {st.performanceScore || 70}/100
                    </span>
                  </div>

                  <Link
                    href={`/analysis?studentId=${st.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-colors text-xs font-bold border border-border"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
