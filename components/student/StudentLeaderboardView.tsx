"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { CelebrationDialog } from "./CelebrationDialog";
import { FriendlySkeletons } from "./FriendlySkeletons";
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

  const rank1 = top10.find((e) => (selectedGrade === "all" ? e.rank === 1 : e.gradeRank === 1));
  const rank2 = top10.find((e) => (selectedGrade === "all" ? e.rank === 2 : e.gradeRank === 2));
  const rank3 = top10.find((e) => (selectedGrade === "all" ? e.rank === 3 : e.gradeRank === 3));

  const podiumList = [
    { rank: 2, entry: rank2, icon: Medal, label: "2nd", color: "text-slate-400" },
    { rank: 1, entry: rank1, icon: Crown, label: "1st", color: "text-yellow-500" },
    { rank: 3, entry: rank3, icon: Medal, label: "3rd", color: "text-amber-600" },
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
    : "Recently";

  const isUserInTop10 = top10.some((e) => e.isCurrentUser);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      <CelebrationDialog />

      {/* 1. Hero Banner */}
      <section className="bg-secondary border border-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] relative overflow-hidden min-h-[220px]">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
            Top 10 Leaderboard
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Celebrating the top learners. Track your standing and aim high!
          </p>
          <p className="text-xs text-muted-foreground font-medium pt-0.5">
            Updated at {formattedSyncTime}
          </p>
        </div>

        {/* Right Illustration */}
        <div className="relative w-full h-44 sm:h-52 md:h-full md:absolute md:right-4 md:top-0 md:bottom-0 md:w-56 lg:w-64 flex items-center justify-center md:justify-end shrink-0 z-10">
          <Image
            src="/images/achivements.webp"
            alt="Leaderboard Achievements"
            fill
            priority
            className="object-contain w-full h-full drop-shadow-sm"
            sizes="(max-width: 768px) 160px, 192px"
          />
        </div>
      </section>

      {/* 2. Grade Filter Pills */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {GRADE_PILLS.map((pill) => {
          const isActive = selectedGrade === pill.value;
          return (
            <button
              key={pill.value}
              type="button"
              onClick={() => setSelectedGrade(pill.value)}
              className={`h-10 px-5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card border border-border text-muted-foreground hover:bg-secondary"
                }`}
            >
              {pill.label}
            </button>
          );
        })}
      </section>

      {/* 3. Status Card for Current Student (if outside Top 10) */}
      {myEntry && (!isUserInTop10 || !myEntry.entry) && (
        <section className="relative overflow-hidden p-5 sm:p-6 rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span className="text-base font-bold text-foreground">
                  {myEntry.entry
                    ? `Your place: #${selectedGrade === "all" ? myEntry.entry.rank : myEntry.entry.gradeRank} in LMS`
                    : "Your place in LMS"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {myEntry.hasEnoughData
                  ? myEntry.distanceToTop10
                    ? `${myEntry.distanceToTop10} points away from Top 10. Keep going!`
                    : "Great work! Keep completing your tests."
                  : "Complete tests and attend classes to enter the leaderboard."}
              </p>
            </div>
            {myEntry.entry && (
              <div className="text-right shrink-0">
                <span className="text-2xl font-black tabular-nums text-foreground">
                  {myEntry.entry.score}
                </span>
                <span className="text-[11px] text-muted-foreground block font-medium">
                  out of 100
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Podium for Top 3 */}
      {top10.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2 items-end">
          {podiumList.map((item) => {
            const entry = item.entry;
            const Icon = item.icon;
            const isFirst = item.rank === 1;
            const isSecond = item.rank === 2;

            if (!entry) {
              return (
                <div
                  key={item.rank}
                  className={`rounded-3xl border border-dashed border-border p-6 text-center text-muted-foreground bg-card/50 ${isFirst ? "order-1 md:order-2 md:-mt-4" : isSecond ? "order-2 md:order-1" : "order-3"
                    }`}
                >
                  <Icon className="size-6 mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs font-semibold">{item.label} Place</p>
                  <p className="text-[11px]">No student yet</p>
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
                className={`relative overflow-hidden flex flex-col items-center p-6 sm:p-7 rounded-3xl border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] text-center transition-all bg-card ${isFirst
                  ? "order-1 md:order-2 md:-translate-y-4 border-amber-300 py-9 shadow-[0_6px_25px_-4px_rgba(24,72,128,0.12)]"
                  : isSecond
                    ? "order-2 md:order-1"
                    : "order-3 border-amber-200"
                  } ${entry.isCurrentUser ? "ring-2 ring-primary" : ""}`}
              >
                {/* Crown / Medal Icon */}
                <div className="mb-2">
                  <Icon
                    className={`size-8 stroke-[2.2] ${item.color} ${isFirst ? "size-10 fill-amber-400" : ""
                      }`}
                  />
                </div>

                {/* Avatar */}
                <Avatar
                  className={`mb-2 border-2 ${isFirst ? "size-16 border-amber-400 shadow-xs" : "size-14 border-border"
                    }`}
                >
                  <AvatarFallback className="text-sm font-bold bg-secondary text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Rank Badge */}
                <span
                  className={`text-xs font-bold uppercase tracking-wider mb-1 px-3 py-0.5 rounded-full ${isFirst
                    ? "bg-amber-100 text-amber-800"
                    : isSecond
                      ? "bg-secondary text-primary"
                      : "bg-amber-50 text-amber-800"
                    }`}
                >
                  {item.label} Place
                </span>

                {/* Student Name */}
                <h4 className="font-bold text-foreground truncate max-w-full px-2 text-base mt-0.5">
                  {entry.studentName}
                  {entry.isCurrentUser && (
                    <span className="text-xs text-primary font-normal block">(You)</span>
                  )}
                </h4>

                <p className="text-xs text-muted-foreground font-medium mb-3">
                  {entry.grade}
                </p>

                {/* Score */}
                <div className="mt-auto pt-1">
                  <span className="text-3xl font-black tabular-nums tracking-tight text-foreground">
                    {entry.score}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground block">
                    pts / 100
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* 5. Ranks 4 to 10 List */}
      {restEntries.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-base sm:text-lg font-bold text-foreground px-1">
            Ranks 4 to 10
          </h3>
          <div className="divide-y divide-border rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] overflow-hidden">
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
                  className={`flex items-center justify-between p-4 sm:p-5 transition-colors ${e.isCurrentUser ? "bg-secondary/60" : "hover:bg-secondary/40"
                    }`}
                >
                  {/* Left: Rank & Avatar & Name */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="w-7 text-center text-sm sm:text-base font-black tabular-nums text-muted-foreground">
                      #{displayRank}
                    </span>

                    <Avatar className="size-10 border border-border shrink-0">
                      <AvatarFallback className="text-xs font-bold bg-secondary text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-foreground truncate">
                        {e.studentName}
                        {e.isCurrentUser && (
                          <span className="text-xs text-primary font-medium ml-1.5">
                            (You)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        {e.grade}
                      </p>
                    </div>
                  </div>

                  {/* Right: Score & Movement */}
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                    {/* Movement Indicator */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 w-10 justify-end">
                      {e.movement === "up" && (
                        <span className="flex items-center text-emerald-600">
                          <ArrowUp className="size-3 stroke-[2.5]" />
                          {e.movementDelta}
                        </span>
                      )}
                      {e.movement === "down" && (
                        <span className="flex items-center text-amber-600">
                          <ArrowDown className="size-3 stroke-[2.5]" />
                          {e.movementDelta}
                        </span>
                      )}
                      {e.movement === "same" && (
                        <span className="flex items-center text-slate-400">
                          <Minus className="size-3" />
                        </span>
                      )}
                      {e.movement === "new" && (
                        <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>

                    {/* Score */}
                    <div>
                      <span className="text-base sm:text-lg font-black tabular-nums text-slate-900">
                        {e.score}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-medium">
                        pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {top10.length === 0 && (
        <div className="p-10 text-center rounded-2xl bg-white border border-slate-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-2">
          <Trophy className="size-10 mx-auto text-slate-300" />
          <h4 className="text-lg font-bold text-slate-800">
            No rankings yet
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Rankings appear after students complete at least 3 assessments.
          </p>
        </div>
      )}
    </div>
  );
}
