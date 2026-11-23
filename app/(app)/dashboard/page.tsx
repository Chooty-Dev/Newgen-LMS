"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ProfileCard } from "@/components/shared/ProfileCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaTrendChart } from "@/components/charts/AreaTrendChart";
import { SubjectTreemap } from "@/components/charts/SubjectTreemap";
import { MultiStudentTrendChart } from "@/components/charts/MultiStudentTrendChart";
import {
  ArrowRight,
  TrendingDown,
  Award,
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  ClipboardList,
  Calendar,
  Layers,
  Search,
} from "lucide-react";

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  date: string;
}

interface RankedStudent {
  id: string;
  name: string;
  username: string;
  score: number;
}

interface StaffAssessment {
  id: string;
  title: string;
  subject: string;
}

interface StaffSession {
  id: string;
  title: string;
  status: string;
}

interface ActivityLogItem {
  id: string;
  actorName: string;
  summary: string;
  result: string;
  time: string;
}

import { StudentHomeView } from "@/components/student/StudentHomeView";
import { TeacherDashboardView } from "@/components/teacher/TeacherDashboardView";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "student") {
    return <StudentHomeView />;
  }

  if (user.role === "teacher") {
    return <TeacherDashboardView />;
  }

  if (user.role === "staff") {
    return <StaffDashboard />;
  }

  return <AdminDashboard />;
}

// ============================================================================
// 2. Teacher Dashboard
// ============================================================================
function TeacherDashboard() {
  const { user } = useAuth();

  const { data: teacherAnalytics, isLoading } = useQuery({
    queryKey: ["analysis", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/analysis/teacher");
      if (!res.ok) throw new Error("Failed to load teacher analytics");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Teacher Dashboard" description="Overview of your classes and student progress." />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </div>
    );
  }

  const analytics = teacherAnalytics?.data;
  const treemapData = (analytics?.groupDistribution || []).map((g: { name: string; count: number }) => ({
    name: g.name,
    size: Math.max(1, g.count),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user?.name}`}
        description="Monitor student progress, identify weak points, and guide improvements."
      />

      {/* Profile & Class Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          {user && (
            <ProfileCard
              id={user.id}
              name={user.name}
              role={user.role}
              score={analytics?.topStudents?.[0]?.score ?? 82}
              scoreLabel="Class Top"
              metricTitle="Highest Student Score"
              email={user.email}
              phone={user.phone}
            />
          )}
        </div>
        <StatCard
          label="Students Needing Help"
          value={analytics?.lowPerformers?.length ?? 0}
          subtitle="Immediate guidance recommended"
        />
      </div>

      {/* Visualizations: Student Performance Distribution Treemap & Low Performer Trend Area Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Student Performance Groups</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Excellent vs Good vs Needs Help distribution</p>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <SubjectTreemap data={treemapData} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Low-Performing Students Trend</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Score changes over recent weeks</p>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <MultiStudentTrendChart students={analytics?.lowStudentTrends || []} />
          </CardContent>
        </Card>
      </div>

      {/* Lists Grid: Low Performers & Top Students */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low-Performing Students List */}
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="size-5 text-muted-foreground" />
              <CardTitle className="text-xl">Students Needing Attention</CardTitle>
            </div>
            <Link href="/analysis">
              <Button variant="ghost" size="sm" className="rounded-full gap-1">
                View All <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {analytics?.lowPerformers && analytics.lowPerformers.length > 0 ? (
              analytics.lowPerformers.map((st: RankedStudent) => (
                <div key={st.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <p className="text-base font-medium">{st.name}</p>
                    <p className="text-sm text-muted-foreground">{st.username}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums">{st.score}%</span>
                    <Link href={`/analysis?studentId=${st.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full">
                        Inspect
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">All students currently meeting targets.</p>
            )}
          </CardContent>
        </Card>

        {/* Highest-Ranking Students List */}
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="size-5 text-muted-foreground" />
              <CardTitle className="text-xl">Top Ranking Students</CardTitle>
            </div>
            <Link href="/analysis">
              <Button variant="ghost" size="sm" className="rounded-full gap-1">
                View All <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {analytics?.topStudents && analytics.topStudents.length > 0 ? (
              analytics.topStudents.map((st: RankedStudent) => (
                <div key={st.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <p className="text-base font-medium">{st.name}</p>
                    <p className="text-sm text-muted-foreground">{st.username}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold tabular-nums">{st.score}%</span>
                    <span className="text-xs font-medium px-3 py-1 rounded-full bg-accent text-accent-foreground">
                      Excellent
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No student records found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// 3. Staff Dashboard
// ============================================================================
function StaffDashboard() {
  const { user } = useAuth();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ["dashboard", "staff", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/dashboard");
      if (!res.ok) throw new Error("Failed to load staff dashboard");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Staff Tasks" description="Manage evaluations, attendance, and administrative duties." />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    );
  }

  const data = dashData?.data;
  const stats = data?.stats;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Staff Portal & Duties
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Track assigned evaluation tasks, enter assessment marks, and oversee class attendance sessions for today. Select a task below to begin.
            </p>
            <div className="pt-2">
              <Link href="/evaluate-marks">
                <Button className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95">
                  <ClipboardList className="size-4" />
                  <span>Enter Pending Marks</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/group-learn.webp"
              alt="Staff Duties"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.pendingMarksCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Marks to Evaluate
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Calendar className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.sessionsTodayCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Attendance Today
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.completedMarksCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Evaluations Done
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Layers className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {data?.todaySessions?.length ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Active Batches
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link href="/attendance" className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-full text-xs font-semibold h-9">
                Open Attendance
              </Button>
            </Link>
            <Link href="/evaluate-marks" className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-full text-xs font-semibold h-9">
                Evaluation Grid
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Task Grids: Marks to Evaluate & Attendance Sessions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Pending Marks Entry</CardTitle>
            <Link href="/evaluate-marks">
              <Button variant="ghost" size="sm" className="rounded-full gap-1">
                Open Evaluation <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {data?.pendingAssessments && data.pendingAssessments.length > 0 ? (
              data.pendingAssessments.map((item: StaffAssessment) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <p className="text-base font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.subject}
                    </p>
                  </div>
                  <Link href={`/evaluate-marks?assessmentId=${item.id}`}>
                    <Button size="sm" className="rounded-full">
                      Enter Marks
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No pending marks evaluations.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Today&apos;s Attendance Sessions</CardTitle>
            <Link href="/attendance">
              <Button variant="ghost" size="sm" className="rounded-full gap-1">
                Open Attendance <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {data?.todaySessions && data.todaySessions.length > 0 ? (
              data.todaySessions.map((item: StaffSession) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <p className="text-base font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">Status: {item.status}</p>
                  </div>
                  <Link href="/attendance">
                    <Button variant="outline" size="sm" className="rounded-full">
                      Mark Attendance
                    </Button>
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No attendance sessions scheduled for today.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="rounded-3xl p-6">
        <CardHeader className="p-0 mb-4">
          <CardTitle className="text-xl">Announcements</CardTitle>
          <p className="text-sm text-muted-foreground">Important center bulletins</p>
        </CardHeader>
        <CardContent className="p-0 space-y-4">
          {data?.announcements && data.announcements.length > 0 ? (
            data.announcements.map((ann: AnnouncementItem) => (
              <div key={ann.id} className="p-4 rounded-2xl bg-accent/20 border border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-base font-semibold">{ann.title}</p>
                  <span className="text-xs text-muted-foreground">{ann.date}</span>
                </div>
                <p className="text-sm text-muted-foreground">{ann.content}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No announcements right now.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// 4. Admin & Super Admin Dashboard
// ============================================================================
function AdminDashboard() {
  const { user } = useAuth();

  const { data: dashData, isLoading } = useQuery({
    queryKey: ["dashboard", "admin", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/dashboard");
      if (!res.ok) throw new Error("Failed to load admin dashboard");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Education Center Overview" description="Summary of center metrics, performance, and operations." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      </div>
    );
  }

  const data = dashData?.data;
  const stats = data?.stats;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Center Management Hub
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Comprehensive overview of center operations, faculty distribution, and student academic performance. Track active enrollments and evaluation status in real-time.
            </p>
            <div className="pt-2">
              <Link href="/classes">
                <Button className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95">
                  <BookOpen className="size-4" />
                  <span>Manage Center Batches</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/bulb-on-books.webp"
              alt="Admin Dashboard"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.totalStudents ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Students
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <BookOpen className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.totalTeachers ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Faculty
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.classesToday ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Active Classes
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {stats?.marksWaiting ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Marks Waiting
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Link href="/announcements" className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-full text-xs font-semibold h-9">
                Announcements
              </Button>
            </Link>
            <Link href="/analysis" className="flex-1">
              <Button variant="outline" size="sm" className="w-full rounded-full text-xs font-semibold h-9">
                Performance
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Center Performance Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Student Performance Groups</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Center-wide distribution across standing tiers</p>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <SubjectTreemap data={data?.treemapData || []} />
          </CardContent>
        </Card>

        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Average Center Performance</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Mean performance score trend over recent periods</p>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <AreaTrendChart data={data?.trendData || []} />
          </CardContent>
        </Card>
      </div>

      {/* Activity Log and Center Announcements */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            {user?.role === "super_admin" && (
              <Link href="/audit-trail">
                <Button variant="ghost" size="sm" className="rounded-full gap-1">
                  Full Audit Trail <ArrowRight className="size-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent className="p-0 space-y-3">
            {data?.recentActivities && data.recentActivities.length > 0 ? (
              data.recentActivities.map((act: ActivityLogItem) => (
                <div key={act.id} className="flex items-center justify-between py-2 border-b border-border/50">
                  <div>
                    <p className="text-base font-medium">{act.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      By {act.actorName} • {act.time}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-accent text-accent-foreground">
                    {act.result}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity recorded.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl p-6">
          <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Announcements</CardTitle>
            <Link href="/announcements">
              <Button variant="ghost" size="sm" className="rounded-full gap-1">
                Manage <ArrowRight className="size-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0 space-y-4">
            {data?.announcements && data.announcements.length > 0 ? (
              data.announcements.map((ann: AnnouncementItem) => (
                <div key={ann.id} className="p-4 rounded-2xl bg-accent/20 border border-border/40">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-base font-semibold">{ann.title}</p>
                    <span className="text-xs text-muted-foreground">{ann.date}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ann.content}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active announcements.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
