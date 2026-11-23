"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Flame,
  Lightbulb,
  Megaphone,
  Minus,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  User,
  X,
} from "lucide-react";

import { CelebrationDialog } from "./CelebrationDialog";
import { NewsReaderSheet, StudentAnnouncement } from "./NewsReaderSheet";
import { FriendlySkeletons } from "./FriendlySkeletons";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface HomeData {
  student: {
    id: string;
    name: string;
    firstName: string;
    username: string;
    admissionNo: string;
    grade: string;
    centerName: string;
    avatarUrl: string | null;
  };
  score: number | null;
  overallScore: number;
  statusText?: string;
  groupLabel: string;
  lmsRank?: number | null;
  distanceToTop10?: number | null;
  greeting: string;
  focusTip: string;
  tips?: string[];
  nextUp: Array<{
    id: string;
    title: string;
    subtitle: string;
    time: string;
    kind: "class" | "test";
  }>;
  subjectHighlights: Array<{
    subject: string;
    score: number;
  }>;
  attendance: {
    dots: Array<{ date: string; status: string }>;
    attendedCount: number;
    totalCount: number;
    percentage: number;
    message: string;
  };
  streak: number;
  latestNews: {
    id: string;
    title: string;
    snippet: string;
    date: string;
    isPinned: boolean;
  } | null;
}

function parseDate(value: string) {
  return new Date(value.length === 10 ? `${value}T00:00:00` : value);
}

function dayLetter(value: string) {
  const d = parseDate(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { weekday: "narrow" });
}

function dotMeta(status: string) {
  const s = status.toLowerCase();
  if (s === "present" || s === "attended") {
    return {
      Icon: Check,
      label: "Present",
      className: "bg-primary text-primary-foreground",
    };
  }
  if (s === "late") {
    return {
      Icon: Clock,
      label: "Late",
      className: "bg-amber-400 text-white",
    };
  }
  if (s === "absent") {
    return {
      Icon: X,
      label: "Absent",
      className: "border border-slate-200 text-slate-400",
    };
  }
  return {
    Icon: Minus,
    label: "Excused",
    className: "bg-slate-100 text-slate-400",
  };
}

/* -------------------------------------------------------------------------- */
/* Main view                                                                  */
/* -------------------------------------------------------------------------- */

export function StudentHomeView() {
  const [selectedNews, setSelectedNews] =
    React.useState<StudentAnnouncement | null>(null);
  const [newsSheetOpen, setNewsSheetOpen] = React.useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{ data: HomeData }>({
    queryKey: ["student-home"],
    queryFn: async () => {
      const res = await fetch("/api/v1/student/home");
      if (!res.ok) throw new Error("Failed to load student home");
      return res.json();
    },
  });

  if (isLoading) {
    return <FriendlySkeletons />;
  }

  if (isError || !data?.data) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center space-y-4 shadow-sm">
        <p className="text-xl font-bold text-slate-900">
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const home = data.data;

  const handleOpenNews = (news: NonNullable<typeof home.latestNews>) => {
    setSelectedNews({
      id: news.id,
      title: news.title,
      body: news.snippet,
      date: news.date,
      pinned: news.isPinned,
    });
    setNewsSheetOpen(true);
  };

  const progressScore = Math.min(100, Math.max(0, home.overallScore || 0));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressScore / 100) * circumference;

  return (
    <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <CelebrationDialog />

      {/* 1. Hero banner */}
      <section className="bg-secondary border border-border rounded-3xl p-6 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] relative overflow-hidden min-h-[250px] md:min-h-[280px]">
        <div className="relative z-10 max-w-sm sm:max-w-md md:max-w-[48%] lg:max-w-[50%] space-y-3 sm:space-y-4 text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
            Dream Big,
            <br />
            Learn More!
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground font-medium">
            Every lesson brings you closer to your goals.
          </p>
          <div className="pt-2">
            <Link
              href="/marks"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-sm transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>View Marks</span>
              <ArrowRight className="size-4 shrink-0" />
            </Link>
          </div>
        </div>

        {/* Right Illustration: enlarged to fill the right side cleanly */}
        <div className="relative w-full h-48 sm:h-56 md:h-auto md:absolute md:right-0 md:top-0 md:bottom-0 md:w-[50%] lg:w-[48%] xl:w-[46%] flex items-end justify-center md:justify-end pointer-events-none z-10">
          <div className="relative w-full h-full flex items-end justify-center md:justify-end">
            <Image
              src="/images/reading-group.webp"
              alt="Dream Big, Learn More!"
              fill
              priority
              className="object-contain object-bottom md:object-right-bottom drop-shadow-sm"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* 2. Four Stat KPI Cards with Corner Watermark Images */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: My Marks */}
        <Link
          href="/marks"
          className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between group cursor-pointer"
        >
          {/* Watermark Illustration at bottom right */}
          <div className="pointer-events-none absolute -bottom-2 -right-2 size-32 sm:size-32 opacity-25 group-hover:opacity-35 transition-opacity">
            <Image
              src="/images/stat-marks.webp"
              alt=""
              fill
              className="object-contain object-bottom-right w-full h-full"
            />
          </div>

          <div className="relative z-10">
            <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs mb-3 group-hover:scale-105 transition-transform">
              <Star className="size-5 fill-white shrink-0" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              My Marks
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1 tabular-nums">
              {home.overallScore}%
            </p>
          </div>
          <p className="relative z-10 text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-3">
            <span>↑ +2% this term</span>
          </p>
        </Link>

        {/* Card 2: My Analysis */}
        <Link
          href="/analysis"
          className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between group cursor-pointer"
        >
          {/* Watermark Illustration at bottom right */}
          <div className="pointer-events-none absolute -bottom-2 -right-2 size-32 sm:size-32 opacity-25 group-hover:opacity-35 transition-opacity">
            <Image
              src="/images/stat-analysis.webp"
              alt=""
              fill
              className="object-contain object-bottom-right w-full h-full"
            />
          </div>

          <div className="relative z-10">
            <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs mb-3 group-hover:scale-105 transition-transform">
              <BarChart3 className="size-5 shrink-0" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              My Analysis
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-primary mt-1 truncate">
              {home.groupLabel || "Good"}
            </p>
          </div>
          <p className="relative z-10 text-xs font-medium text-muted-foreground mt-3">
            Keep it up!
          </p>
        </Link>

        {/* Card 3: Leaderboard */}
        <Link
          href="/leaderboard"
          className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between group cursor-pointer"
        >
          {/* Watermark Illustration at bottom right */}
          <div className="pointer-events-none absolute -bottom-2 -right-2 size-32 sm:size-32 opacity-25 group-hover:opacity-35 transition-opacity">
            <Image
              src="/images/stat-leaderboard.webp"
              alt=""
              fill
              className="object-contain object-bottom-right w-full h-full"
            />
          </div>

          <div className="relative z-10">
            <div className="size-11 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs mb-3 group-hover:scale-105 transition-transform">
              <Trophy className="size-5 fill-white shrink-0" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Leaderboard
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              #{home.lmsRank || 1}
            </p>
          </div>
          <p className="relative z-10 text-xs font-medium text-muted-foreground mt-3">
            {home.lmsRank && home.lmsRank <= 5 ? "Top 5 Student" : "Top 10 Student"}
          </p>
        </Link>

        {/* Card 4: Latest News */}
        <div
          onClick={() => {
            if (home.latestNews) {
              handleOpenNews(home.latestNews);
            }
          }}
          className="relative overflow-hidden bg-card rounded-3xl p-5 sm:p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between group cursor-pointer"
        >
          {/* Watermark Illustration at bottom right */}
          <div className="pointer-events-none absolute -bottom-2 -right-2 size-32 sm:size-32 opacity-25 group-hover:opacity-35 transition-opacity">
            <Image
              src="/images/stat-news.webp"
              alt=""
              fill
              className="object-contain object-bottom-right w-full h-full"
            />
          </div>

          <div className="relative z-10">
            <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs mb-3 group-hover:scale-105 transition-transform">
              <Megaphone className="size-5 shrink-0" />
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Latest News
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground mt-1">
              {home.latestNews ? "3 New" : "All Read"}
            </p>
          </div>
          <div className="relative z-10 text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 mt-3">
            <span>{home.latestNews ? "Read now" : "View all"}</span>
            <ArrowRight className="size-3 shrink-0" />
          </div>
        </div>
      </section>

      {/* 3. Bottom Row: Your Learning Progress (60%) & Quick Access (40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Your Learning Progress */}
        <div className="lg:col-span-7 bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-border transition-all flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary shrink-0" />
              <h3 className="font-extrabold text-lg sm:text-xl text-foreground">
                Your Learning Progress
              </h3>
            </div>
            <Link
              href="/analysis"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline"
            >
              <span>View Details</span>
              <ArrowRight className="size-3.5 shrink-0" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 py-2">
            {/* Circular Ring */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg width="130" height="130" className="rotate-[-90deg]">
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-border"
                />
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="text-primary transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-foreground tracking-tight tabular-nums">
                  {progressScore}%
                </span>
              </div>
            </div>

            {/* Linear Progress & Feedback */}
            <div className="flex-1 w-full space-y-3 text-center sm:text-left">
              <div>
                <p className="font-bold text-base text-foreground">
                  Overall Progress
                </p>
                <div className="h-3.5 w-full rounded-full bg-secondary overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${progressScore}%` }}
                  />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground pt-1">
                You&apos;re doing great! Keep going! 😊
              </p>
            </div>
          </div>

          {/* Attendance Dots in Week */}
          {home.attendance.dots.length > 0 && (
            <div className="pt-4 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Attendance History
                </span>
                {home.streak >= 2 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                    <Flame className="size-3.5 shrink-0" />
                    <span>{home.streak} days streak</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-2.5">
                {home.attendance.dots.slice(-14).map((dot, idx) => {
                  const meta = dotMeta(dot.status);
                  return (
                    <div
                      key={`${dot.date}-${idx}`}
                      className="flex flex-col items-center gap-1"
                      title={`${dot.date}: ${meta.label}`}
                    >
                      <div
                        className={`size-8 sm:size-9 rounded-full flex items-center justify-center text-xs shadow-xs ${meta.className}`}
                      >
                        <meta.Icon className="size-4 shrink-0" />
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {dayLetter(dot.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Access */}
        <div className="lg:col-span-5 bg-card rounded-3xl p-6 sm:p-8 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-border transition-all flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <Sparkles className="size-5 text-primary shrink-0" />
            <h3 className="font-extrabold text-lg sm:text-xl text-foreground">
              Quick Access
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4">
            <Link
              href="/marks"
              className="p-4 rounded-2xl bg-secondary/70 hover:bg-secondary transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer border border-border/60"
            >
              <div className="size-11 rounded-full bg-card text-primary flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <BookOpen className="size-5 stroke-[2.2] shrink-0" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-primary">
                My Marks
              </span>
            </Link>

            <Link
              href="/analysis"
              className="p-4 rounded-2xl bg-secondary/70 hover:bg-secondary transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer border border-border/60"
            >
              <div className="size-11 rounded-full bg-card text-primary flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="size-5 stroke-[2.2] shrink-0" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-primary">
                Activities
              </span>
            </Link>

            <Link
              href="/leaderboard"
              className="p-4 rounded-2xl bg-secondary/70 hover:bg-secondary transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer border border-border/60"
            >
              <div className="size-11 rounded-full bg-card text-primary flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Trophy className="size-5 stroke-[2.2] shrink-0" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-primary">
                Leaderboard
              </span>
            </Link>

            <Link
              href="/settings"
              className="p-4 rounded-2xl bg-secondary/70 hover:bg-secondary transition-all flex flex-col items-center justify-center gap-2 text-center group cursor-pointer border border-border/60"
            >
              <div className="size-11 rounded-full bg-card text-primary flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <User className="size-5 stroke-[2.2] shrink-0" />
              </div>
              <span className="font-bold text-xs sm:text-sm text-primary">
                My Profile
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Secondary Row: Next Up Classes & Today's Tip */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card: Next Up Classes */}
        <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-border transition-all space-y-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-secondary text-primary flex items-center justify-center">
              <Calendar className="size-4 shrink-0" />
            </div>
            <h4 className="font-bold text-base text-foreground">Next Up Today</h4>
          </div>

          {home.nextUp && home.nextUp.length > 0 ? (
            <div className="space-y-3">
              {home.nextUp.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-background/80 border border-border shadow-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-sm text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-secondary capitalize">
                    {item.kind}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center space-y-1">
              <p className="font-bold text-sm text-foreground">No classes scheduled</p>
              <p className="text-xs text-muted-foreground">Enjoy your study break!</p>
            </div>
          )}
        </div>

        {/* Card: Subject Highlights */}
        <div className="bg-card rounded-3xl p-6 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-border transition-all space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-full bg-secondary text-primary flex items-center justify-center">
                <BookOpen className="size-4 shrink-0" />
              </div>
              <h4 className="font-bold text-base text-foreground">Subject Highlights</h4>
            </div>
            <Link
              href="/marks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <span>All Subjects</span>
              <ArrowRight className="size-3 shrink-0" />
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {home.subjectHighlights.slice(0, 3).map((sub) => (
              <div key={sub.subject} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground">{sub.subject}</span>
                  <span className="text-primary font-bold tabular-nums">{sub.score}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, Math.max(5, sub.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card: Focus For Today */}
        <div className="bg-secondary/60 border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Lightbulb className="size-4 shrink-0" />
              <span>Today&apos;s Learning Tip</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-foreground leading-snug">
              {home.focusTip}
            </p>
          </div>
          <div className="pt-2 border-t border-border">
            <span className="text-[11px] font-medium text-muted-foreground">
              Personalized tip from your learning coach
            </span>
          </div>
        </div>
      </section>

      {/* News Reader Sheet */}
      <NewsReaderSheet
        announcement={selectedNews}
        open={newsSheetOpen}
        onOpenChange={setNewsSheetOpen}
      />
    </div>
  );
}
