"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trophy,
  Crown,
  Medal,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "@/components/teacher/CardThemeBar";

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
}

interface LeaderboardResponse {
  snapshot: {
    _id: string;
    syncedAt: string;
    source: "cron" | "manual";
  } | null;
  top10: FormattedLeaderboardEntry[];
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

export function StaffLeaderboardView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedGrade, setSelectedGrade] = React.useState("all");
  const [confirmSyncOpen, setConfirmSyncOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ data: LeaderboardResponse }>({
    queryKey: ["staff-leaderboard", selectedGrade],
    queryFn: async () => {
      const q = selectedGrade !== "all" ? `?grade=${encodeURIComponent(selectedGrade)}` : "";
      const res = await fetch(`/api/v1/leaderboard${q}`);
      if (!res.ok) throw new Error("Failed to load leaderboard");
      return res.json();
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/leaderboard/sync", {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to sync leaderboard");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Leaderboard synced successfully!");
      queryClient.invalidateQueries({ queryKey: ["staff-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["student-leaderboard"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading || !data?.data) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="size-7 text-primary" />
              Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Top student performers in your center.
            </p>
          </div>
        </div>
        <DataLoader text="Loading leaderboard rankings..." minHeight="min-h-[320px]" />
      </div>
    );
  }

  const { snapshot, top10, canSync } = data.data;

  const formattedSyncTime = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "Not synced yet";

  return (
    <div className="space-y-6">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="size-7 text-primary" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Top student performers in your center.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground text-right hidden sm:block">
            <div>Last Synced:</div>
            <div className="font-semibold text-foreground">
              {formattedSyncTime} ({snapshot?.source || "cron"})
            </div>
          </div>

          {canSync && (
            <Button
              onClick={() => setConfirmSyncOpen(true)}
              disabled={syncMutation.isPending}
              className="rounded-full h-11 px-5 gap-2"
            >
              <RefreshCw className={cn("size-4", syncMutation.isPending && "animate-spin")} />
              Sync Now
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Super Admin */}
      <AlertDialog open={confirmSyncOpen} onOpenChange={setConfirmSyncOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Center Leaderboard?</AlertDialogTitle>
            <AlertDialogDescription>
              This will recompute performance scores and rank standings for all active students in your center. Ranks will update for all users immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => syncMutation.mutate()}
              className="rounded-full"
            >
              Confirm & Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Grade Filter Tabs + Theme Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GRADE_PILLS.map((pill) => {
            const isActive = selectedGrade === pill.value;
            return (
              <button
                key={pill.value}
                onClick={() => setSelectedGrade(pill.value)}
                className={cn(
                  "h-9 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* Quick Color Palette Bar */}
        <CardThemeBar />
      </div>

      {/* Best Student Spotlight - Full size image, clean layout, no background color, no shadows */}
      {top10.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2 px-1 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="relative w-44 sm:w-52 aspect-[4/3] shrink-0 flex items-center justify-center">
              <Image
                src="/images/super-student.webp"
                alt="Super Student"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                <Crown className="size-3.5 fill-amber-500 text-amber-500" />
                <span>Rank #1 • Best Student</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground">
                {top10[0].studentName}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                {top10[0].grade} • Highest Performance Score in Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-center sm:text-right">
            <div>
              <span className="text-3xl sm:text-4xl font-black text-primary tabular-nums block">
                {top10[0].score}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Overall Score
              </span>
            </div>
            <div className="hidden sm:block text-left border-l border-border/80 pl-4 space-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Academic Marks: </span>
                <span className="font-extrabold text-foreground">{top10[0].marksScore}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Attendance: </span>
                <span className="font-extrabold text-foreground">{top10[0].attendanceScore}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Table Card */}
      <Card className="rounded-3xl border border-border card-themed overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-lg font-bold flex items-center justify-between">
            <span>Top Students</span>
            <span className="text-xs font-normal text-muted-foreground sm:hidden">
              Sync: {formattedSyncTime}
            </span>
          </CardTitle>
          <CardDescription>
            Rankings based on overall assessment marks and attendance.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {top10.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <Trophy className="size-10 mx-auto opacity-30 text-primary" />
              <p className="text-base font-semibold">No students on the leaderboard yet</p>
              <p className="text-xs">
                Students will appear once marks and attendance records are evaluated.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {top10.map((entry) => {
                const displayRank = selectedGrade === "all" ? entry.rank : entry.gradeRank;
                const initials = entry.studentName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                const isTop1 = displayRank === 1;

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/40 transition-colors gap-4"
                  >
                    {/* Left: Rank, Avatar, Name, Grade */}
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-8 flex items-center justify-center shrink-0">
                        {isTop1 ? (
                          <Crown className="size-6 text-amber-500 stroke-[2.2]" />
                        ) : displayRank === 2 ? (
                          <Medal className="size-5 text-slate-500 stroke-[2.2]" />
                        ) : displayRank === 3 ? (
                          <Medal className="size-5 text-amber-700 stroke-[2.2]" />
                        ) : (
                          <span className="text-sm font-black text-muted-foreground tabular-nums">
                            #{displayRank}
                          </span>
                        )}
                      </div>

                      <Avatar className="size-10 shrink-0 border border-border">
                        <AvatarFallback className="text-xs font-bold bg-secondary text-primary">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm sm:text-base truncate">
                            {entry.studentName}
                          </span>
                          {/* Movement */}
                          <span className="inline-flex items-center text-xs font-semibold shrink-0">
                            {entry.movement === "up" && (
                              <span className="text-emerald-600 flex items-center">
                                <ArrowUp className="size-3.5 stroke-[2.5]" />
                                {entry.movementDelta}
                              </span>
                            )}
                            {entry.movement === "down" && (
                              <span className="text-rose-600 flex items-center">
                                <ArrowDown className="size-3.5 stroke-[2.5]" />
                                {entry.movementDelta}
                              </span>
                            )}
                            {entry.movement === "same" && (
                              <span className="text-muted-foreground">
                                <Minus className="size-3" />
                              </span>
                            )}
                            {entry.movement === "new" && (
                              <span className="text-primary text-[10px] font-bold uppercase tracking-wider">
                                New
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground font-medium block">
                          {entry.grade}
                        </span>
                      </div>
                    </div>

                    {/* Right: Scores & Analysis Link */}
                    <div className="flex items-center gap-4 sm:gap-8 shrink-0 text-right">
                      <div className="hidden md:block">
                        <span className="text-xs text-muted-foreground block font-medium">
                          Marks / Att.
                        </span>
                        <span className="text-xs font-semibold tabular-nums text-foreground">
                          {entry.marksScore}% / {entry.attendanceScore}%
                        </span>
                      </div>

                      <div>
                        <span className="text-lg sm:text-xl font-black tabular-nums text-foreground">
                          {entry.score}
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Score
                        </span>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        title="View Student Analysis"
                        onClick={() => router.push(`/analysis?studentId=${entry.studentId}`)}
                        className="rounded-full size-9 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
