"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BentoCard } from "./BentoCard";
import { ScoreRing } from "./ScoreRing";
import { AttendanceDots } from "./AttendanceDots";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { CelebrationDialog } from "./CelebrationDialog";
import { ScoreInfoDialog } from "@/components/shared/ScoreInfoDialog";
import { ScoreHistoryLineChart } from "@/components/charts/ScoreHistoryLineChart";
import { NewsReaderSheet, StudentAnnouncement } from "./NewsReaderSheet";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Calendar,
  BookOpen,
  ArrowRight,
  Flame,
  Lightbulb,
  Megaphone,
  TrendingUp,
  Award,
  ChevronRight,
  Crown,
  Medal,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function StudentHomeView() {
  const [selectedNews, setSelectedNews] = React.useState<StudentAnnouncement | null>(null);
  const [newsSheetOpen, setNewsSheetOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ data: HomeData }>({
    queryKey: ["student-home"],
    queryFn: async () => {
      const res = await fetch("/api/v1/student/home");
      if (!res.ok) throw new Error("Failed to load student home");
      return res.json();
    },
  });

  if (isLoading || !data?.data) {
    return <FriendlySkeletons />;
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <CelebrationDialog />

      {/* 1. Greeting Banner with #N in LMS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {home.greeting}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            Welcome to your personal learning space for {home.student.grade}.
          </p>
        </div>

        {home.lmsRank && (
          <div className="flex items-center gap-2.5 pt-1 shrink-0">
            {home.lmsRank === 1 ? (
              <Crown className="size-7 text-yellow-600 dark:text-yellow-400 stroke-[2.2]" />
            ) : home.lmsRank === 2 ? (
              <Medal className="size-7 text-slate-600 dark:text-slate-300 stroke-[2.2]" />
            ) : home.lmsRank === 3 ? (
              <Medal className="size-7 text-amber-700 dark:text-amber-400 stroke-[2.2]" />
            ) : (
              <Trophy className="size-6 text-muted-foreground stroke-[2.2]" />
            )}
            <span
              className={cn(
                "font-black tracking-tight",
                home.lmsRank === 1
                  ? "text-2xl md:text-3xl text-yellow-600 dark:text-yellow-400"
                  : home.lmsRank === 2
                  ? "text-2xl md:text-3xl text-slate-600 dark:text-slate-300"
                  : home.lmsRank === 3
                  ? "text-2xl md:text-3xl text-amber-700 dark:text-amber-400"
                  : "text-xl md:text-2xl text-foreground"
              )}
            >
              #{home.lmsRank} in LMS
            </span>
          </div>
        )}
      </div>

      {/* 2. Full-Width Bento Grid: 1 col mobile, 6 cols tablet, 12 cols desktop */}
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-6">
        {/* Card 1 (Hero): Overall Score Ring (7 cols on lg, 6 on md) */}
        <BentoCard variant="hero" className="md:col-span-6 lg:col-span-7 justify-between relative overflow-hidden">
          {/* Decorative Pattern Background */}
          <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden rounded-[2.5rem]">
            <Image
              src="/new-bg.webp"
              alt=""
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 650px"
              className="object-cover opacity-20 dark:opacity-25"
            />
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between pb-4">
              <span className="text-sm uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Overall Progress
              </span>
              <div className="flex items-center gap-3">
                <ScoreInfoDialog studentId={home.student.id} />
                <Link
                  href="/analysis"
                  className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline"
                >
                  See Story <ChevronRight className="size-4" />
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
              <div className="relative flex items-center justify-center">
                <ScoreRing score={home.overallScore} label={home.groupLabel} />
              </div>
              <div className="space-y-3 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    {home.groupLabel}
                  </h2>
                  <ScoreInfoDialog studentId={home.student.id} />
                </div>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                  You are performing at a {home.overallScore}% average across all your subjects this term.
                </p>
                <div className="pt-1">
                  <Link href="/marks">
                    <Button variant="outline" className="rounded-full h-11 px-5 text-sm font-semibold gap-2">
                      <BookOpen className="size-4" />
                      View Marks
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Card 2: Next Up (5 cols on lg, 6 on md) */}
        <BentoCard variant="soft" className="md:col-span-6 lg:col-span-5 justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <span className="text-sm uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                Next Up
              </span>
            </div>

            {home.nextUp && home.nextUp.length > 0 ? (
              <div className="space-y-3">
                {home.nextUp.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-card border border-border space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base md:text-lg text-foreground truncate">
                        {item.title}
                      </span>
                      <span className="text-xs font-semibold text-primary capitalize px-2.5 py-0.5 rounded-full bg-primary/10">
                        {item.kind}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.subtitle}
                    </p>
                    <p className="text-xs font-medium text-foreground pt-1 flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {item.time}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <p className="text-lg font-bold text-foreground">
                  No classes today!
                </p>
                <p className="text-base text-muted-foreground">
                  Take some time to rest and review your favourite topics.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border mt-4">
            <span className="text-xs text-muted-foreground font-medium">
              Center: {home.student.centerName}
            </span>
          </div>
        </BentoCard>

        {/* Card 3: Subject Highlights (6 cols on lg, 3 on md) */}
        <BentoCard variant="soft" className="md:col-span-3 lg:col-span-6 justify-between">
          <div>
            <div className="flex items-center justify-between pb-4">
              <span className="text-sm uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-2">
                <Award className="size-4 text-primary" />
                Subject Highlights
              </span>
              <Link
                href="/marks"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                All Subjects <ChevronRight className="size-4" />
              </Link>
            </div>

            <div className="space-y-4 pt-2">
              {home.subjectHighlights.map((sub) => (
                <div key={sub.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-base">
                    <span className="font-semibold text-foreground">
                      {sub.subject}
                    </span>
                    <span className="font-bold text-foreground tabular-nums">
                      {sub.score}%
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.max(5, sub.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BentoCard>

        {/* Card 4: Score History Line Chart (6 cols on lg, 3 on md) */}
        <BentoCard variant="soft" className="md:col-span-3 lg:col-span-6 justify-between">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                My Score History
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                Out of 100
              </span>
            </div>
            <div className="pt-2">
              <ScoreHistoryLineChart studentId={home.student.id} height={200} />
            </div>
          </div>
        </BentoCard>

        {/* Card 5: Attendance this month (4 cols on lg, 2 on md) */}
        <BentoCard variant="soft" className="md:col-span-2 lg:col-span-4">
          <AttendanceDots
            dots={home.attendance.dots}
            attendedCount={home.attendance.attendedCount}
            totalCount={home.attendance.totalCount}
          />
        </BentoCard>

        {/* Card 6: One Thing to Focus On (4 cols on lg, 2 on md) */}
        <BentoCard variant="soft" className="md:col-span-2 lg:col-span-4 justify-between bg-primary/5 border-primary/20">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
              <Lightbulb className="size-5" />
              Focus For Today
            </div>
            <p className="text-lg md:text-xl font-semibold text-foreground leading-snug">
              {home.focusTip}
            </p>
          </div>
          <div className="pt-4">
            <span className="text-xs text-muted-foreground font-medium">
              Daily tip from your Newgen learning coach
            </span>
          </div>
        </BentoCard>

        {/* Card 7: Learning Streak & News (4 cols on lg, 2 on md) */}
        <div className="md:col-span-2 lg:col-span-4 flex flex-col gap-6">
          {/* Streak Card */}
          <BentoCard variant="soft" className="p-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Flame className="size-8 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-foreground tabular-nums">
                  {home.streak} Sessions
                </span>
                <p className="text-sm text-muted-foreground font-medium">
                  Active learning streak! Keep it going.
                </p>
              </div>
            </div>
          </BentoCard>

          {/* Latest News Card */}
          {home.latestNews && (
            <BentoCard variant="soft" className="p-6 justify-between flex-1">
              <div>
                <div className="flex items-center justify-between pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5 text-primary">
                    <Megaphone className="size-3.5" />
                    Latest News
                  </span>
                  <span>{home.latestNews.date}</span>
                </div>
                <h3 className="font-bold text-base text-foreground line-clamp-1">
                  {home.latestNews.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 pt-1">
                  {home.latestNews.snippet}
                </p>
              </div>
              <div className="pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => home.latestNews && handleOpenNews(home.latestNews)}
                  className="rounded-full h-9 px-4 text-xs font-semibold gap-1.5"
                >
                  Read News <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </BentoCard>
          )}
        </div>
      </div>

      {/* News Reader Sheet */}
      <NewsReaderSheet
        announcement={selectedNews}
        open={newsSheetOpen}
        onOpenChange={setNewsSheetOpen}
      />
    </div>
  );
}
