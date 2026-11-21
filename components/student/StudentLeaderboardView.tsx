"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { BentoCard } from "./BentoCard";
import { FriendlySkeletons } from "./FriendlySkeletons";
import { CelebrationDialog } from "./CelebrationDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  Crown,
  Medal,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FormattedLeaderboardEntry {
  id: string;
  rank: number;
  gradeRank: number;
  previousRank?: number;
  movement: "up" | "down" | "same" | "new";
  movementDelta: number;
  studentId: string;
  studentName: string;
  grade: string;
  score: number;
  marksScore: number;
  attendanceScore: number;
  isCurrentUser?: boolean;
}

interface LeaderboardResponse {
  snapshot: {
    _id: string;
    syncedAt: string;
    source: "cron" | "manual";
  } | null;
  top10: FormattedLeaderboardEntry[];
  myEntry: {
    entry: FormattedLeaderboardEntry | null;
    distanceToTop10: number | null;
    hasEnoughData: boolean;
  } | null;
  canSync: boolean;
}

const GRADE_PILLS = [
  { label: "All grades", value: "all" },
  { label: "Grade 6", value: "Grade 6" },
  { label: "Grade 7", value: "Grade 7" },
  { label: "Grade 8", value: "Grade 8" },
  { label: "Grade 9", value: "Grade 9" },
  { label: "Grade 10", value: "Grade 10" },
  { label: "Grade 11", value: "Grade 11" },
];

export function StudentLeaderboardView() {
  const [selectedGrade, setSelectedGrade] = React.useState("all");

  const { data, isLoading } = useQuery<{ data: LeaderboardResponse }>({
    queryKey: ["student-leaderboard", selectedGrade],
    queryFn: async () => {
      const q = selectedGrade !== "all" ? `?grade=${encodeURIComponent(selectedGrade)}` : "";
      const res = await fetch(`/api/v1/leaderboard${q}`);
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return res.json();
    },
  });

  if (isLoading || !data?.data) {
    return <FriendlySkeletons />;
  }

  const { snapshot, top10, myEntry } = data.data;

  // Split Top 3 (podium) and Ranks 4-10
  const rank1 = top10.find((e) => (selectedGrade === "all" ? e.rank === 1 : e.gradeRank === 1));
  const rank2 = top10.find((e) => (selectedGrade === "all" ? e.rank === 2 : e.gradeRank === 2));
  const rank3 = top10.find((e) => (selectedGrade === "all" ? e.rank === 3 : e.gradeRank === 3));

  const podiumList = [
    { rank: 2, entry: rank2, icon: Medal, label: "2nd" },
    { rank: 1, entry: rank1, icon: Crown, label: "1st" },
    { rank: 3, entry: rank3, icon: Medal, label: "3rd" },
  ];

  const restEntries = top10.filter((e) => {
    const r = selectedGrade === "all" ? e.rank : e.gradeRank;
    return r > 3;
  });

  const formattedSyncTime = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "12:30 AM";

  const isUserInTop10 = top10.some((e) => e.isCurrentUser);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <CelebrationDialog />

      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="size-8 text-primary stroke-[2.2]" />
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Top 10
            </h1>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground font-medium">
            The best students in our center.
          </p>
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          Updated today at {formattedSyncTime}
        </div>
      </div>

      {/* 2. Grade Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {GRADE_PILLS.map((pill) => {
          const isActive = selectedGrade === pill.value;
          return (
            <button
              key={pill.value}
              onClick={() => setSelectedGrade(pill.value)}
              className={cn(
                "h-11 px-5 rounded-full text-sm font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/70 hover:bg-muted text-foreground"
              )}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* 3. Pinned Status Card for Current Student (if outside Top 10 or needs data) */}
      {myEntry && (!isUserInTop10 || !myEntry.entry) && (
        <BentoCard className="p-6 border-2 border-primary/20 bg-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {myEntry.entry && (selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank) === 1 ? (
                  <Crown className="size-5 text-yellow-600 dark:text-yellow-400 stroke-[2.2]" />
                ) : myEntry.entry && (selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank) === 2 ? (
                  <Medal className="size-5 text-slate-600 dark:text-slate-300 stroke-[2.2]" />
                ) : myEntry.entry && (selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank) === 3 ? (
                  <Medal className="size-5 text-amber-700 dark:text-amber-400 stroke-[2.2]" />
                ) : (
                  <Sparkles className="size-5 text-primary" />
                )}
                <span
                  className={cn(
                    "text-base font-bold",
                    myEntry.entry && (selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank) === 1
                      ? "text-yellow-600 dark:text-yellow-400"
                      : myEntry.entry && (selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank) === 2
                      ? "text-slate-600 dark:text-slate-300"
                      : myEntry.entry && (selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank) === 3
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-foreground"
                  )}
                >
                  {myEntry.entry
                    ? `Your place: #${selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank} in LMS`
                    : "Your place in LMS"}
                </span>
              </div>
              <p className="text-sm md:text-base text-muted-foreground">
                {myEntry.hasEnoughData
                  ? myEntry.distanceToTop10
                    ? `You are only ${myEntry.distanceToTop10} points away from the Top 10! Keep doing your tests.`
                    : "You are doing great! Keep attending classes and practicing."
                  : "Do your first tests and come to class to join the list."}
              </p>
            </div>
            {myEntry.entry && (
              <div className="text-right">
                <span className="text-2xl font-black tabular-nums text-foreground">
                  {myEntry.entry.score}
                </span>
                <span className="text-xs text-muted-foreground block font-medium">
                  out of 100
                </span>
              </div>
            )}
          </div>
        </BentoCard>
      )}

      {/* 4. Podium for Top 3 */}
      {top10.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 items-end">
          {podiumList.map((item) => {
            const entry = item.entry;
            const Icon = item.icon;
            const isFirst = item.rank === 1;
            const isSecond = item.rank === 2;

            if (!entry) {
              return (
                <div
                  key={item.rank}
                  className={cn(
                    "rounded-[2.5rem] border border-dashed border-border p-8 text-center text-muted-foreground",
                    isFirst ? "order-1 md:order-2 md:-mt-8" : isSecond ? "order-2 md:order-1" : "order-3"
                  )}
                >
                  <Icon className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">{item.label} Place</p>
                  <p className="text-xs">No student yet</p>
                </div>
              );
            }

            const initials = entry.studentName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <div
                key={entry.id}
                className={cn(
                  "relative flex flex-col items-center p-8 rounded-[2.5rem] bg-card border shadow-sm text-center transition-all",
                  entry.isCurrentUser && "ring-2 ring-primary bg-primary/[0.03]",
                  isFirst
                    ? "order-1 md:order-2 md:-translate-y-4 border-yellow-500/40 dark:border-yellow-500/30 shadow-md py-10"
                    : isSecond
                    ? "order-2 md:order-1 border-slate-400/40 dark:border-slate-600/40"
                    : "order-3 border-amber-600/40 dark:border-amber-600/30"
                )}
              >
                {/* Crown or Medal Icon */}
                <div className="mb-4">
                  <Icon
                    className={cn(
                      "stroke-[2.2]",
                      isFirst
                        ? "size-12 text-yellow-600 dark:text-yellow-400"
                        : isSecond
                        ? "size-9 text-slate-600 dark:text-slate-300"
                        : "size-9 text-amber-700 dark:text-amber-400"
                    )}
                  />
                </div>

                {/* Avatar */}
                <Avatar
                  className={cn(
                    "size-20 mb-3 border-2 shadow-sm",
                    isFirst
                      ? "size-24 border-yellow-500/40 dark:border-yellow-500/30"
                      : isSecond
                      ? "border-slate-400/40 dark:border-slate-600/40"
                      : "border-amber-600/40 dark:border-amber-600/30"
                  )}
                >
                  <AvatarFallback className="text-lg font-bold bg-muted text-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Rank Pill */}
                <div
                  className={cn(
                    "text-sm font-bold uppercase tracking-wider mb-1",
                    isFirst
                      ? "text-yellow-600 dark:text-yellow-400 text-base font-extrabold"
                      : isSecond
                      ? "text-slate-600 dark:text-slate-300"
                      : "text-amber-700 dark:text-amber-400"
                  )}
                >
                  {item.label} Place
                </div>

                {/* Name */}
                <h3 className={cn("font-bold text-foreground truncate max-w-full px-2", isFirst ? "text-xl md:text-2xl" : "text-lg")}>
                  {entry.studentName}
                  {entry.isCurrentUser && (
                    <span className="text-xs text-primary font-normal block">(You)</span>
                  )}
                </h3>

                {/* Grade */}
                <p className="text-xs text-muted-foreground font-medium mb-4">
                  {entry.grade}
                </p>

                {/* Big Score */}
                <div className="mt-auto pt-2">
                  <span className={cn("font-black tabular-nums tracking-tight text-foreground", isFirst ? "text-4xl md:text-5xl" : "text-3xl")}>
                    {entry.score}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground block">
                    points out of 100
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Ranks 4 to 10 Rows */}
      {restEntries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground px-2">
            Ranks 4 to 10
          </h2>
          <div className="divide-y divide-border rounded-[2.5rem] bg-card border border-border shadow-sm overflow-hidden">
            {restEntries.map((e) => {
              const displayRank = selectedGrade === "all" ? e.rank : e.gradeRank;
              const initials = e.studentName
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center justify-between p-4 sm:p-6 transition-colors",
                    e.isCurrentUser ? "bg-primary/[0.06] font-semibold" : "hover:bg-muted/40"
                  )}
                >
                  {/* Left: Rank & Avatar & Name */}
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    <span className="w-8 text-center text-lg sm:text-xl font-black tabular-nums text-muted-foreground">
                      #{displayRank}
                    </span>

                    <Avatar className="size-11 sm:size-12 border border-border shrink-0">
                      <AvatarFallback className="text-sm font-bold bg-muted text-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="text-base sm:text-lg font-bold text-foreground truncate">
                        {e.studentName}
                        {e.isCurrentUser && (
                          <span className="text-xs text-primary font-medium ml-2">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium">
                        {e.grade}
                      </p>
                    </div>
                  </div>

                  {/* Right: Score & Movement */}
                  <div className="flex items-center gap-6 sm:gap-10 shrink-0 text-right">
                    {/* Movement Indicator */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground w-12 justify-end">
                      {e.movement === "up" && (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                          <ArrowUp className="size-3.5 stroke-[2.5]" />
                          {e.movementDelta}
                        </span>
                      )}
                      {e.movement === "down" && (
                        <span className="flex items-center text-amber-600 dark:text-amber-400">
                          <ArrowDown className="size-3.5 stroke-[2.5]" />
                          {e.movementDelta}
                        </span>
                      )}
                      {e.movement === "same" && (
                        <span className="flex items-center text-muted-foreground">
                          <Minus className="size-3.5" />
                        </span>
                      )}
                      {e.movement === "new" && (
                        <span className="text-primary text-[11px] font-bold uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div>
                      <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground">
                        {e.score}
                      </span>
                      <span className="text-[10px] text-muted-foreground block font-medium">
                        pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {top10.length === 0 && (
        <div className="p-12 text-center rounded-[2.5rem] bg-card border border-border space-y-3">
          <Trophy className="size-12 mx-auto text-muted-foreground opacity-40" />
          <h3 className="text-xl font-bold text-foreground">
            No leaderboard rankings yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Rankings will appear after students complete at least 3 assessments and 5 attendance sessions.
          </p>
        </div>
      )}
    </div>
  );
}
