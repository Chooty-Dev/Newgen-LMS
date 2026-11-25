"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Trophy, RefreshCw, Crown, Award, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataLoader } from "@/components/ui/data-loader";
import { AdminAssetTiles, AdminStatusPill, AdminSurface } from "./AdminUI";

interface FormattedLeaderboardEntry {
  id: string;
  rank: number;
  gradeRank: number;
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
  { label: "All", value: "all" },
  { label: "G6", value: "Grade 6" },
  { label: "G7", value: "Grade 7" },
  { label: "G8", value: "Grade 8" },
  { label: "G9", value: "Grade 9" },
  { label: "G10", value: "Grade 10" },
  { label: "G11", value: "Grade 11" },
];

export function AdminLeaderboardView() {
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
      const res = await fetch("/api/v1/leaderboard/sync", { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to sync");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Leaderboard synced");
      queryClient.invalidateQueries({ queryKey: ["staff-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["student-leaderboard"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || !data?.data) {
    return <DataLoader text="Loading rankings..." minHeight="min-h-[300px]" />;
  }

  const { snapshot, top10, canSync } = data.data;
  const formattedSyncTime = snapshot?.syncedAt
    ? new Date(snapshot.syncedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "Never";

  const top1 = top10[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Rank #1", value: top1 ? top1.studentName : "—", icon: Crown, badge: top1 ? `${top1.score} pts` : "Pending", tone: 1 },
          { label: "Top 10 Listed", value: top10.length, icon: Users, badge: selectedGrade === "all" ? "All Grades" : selectedGrade, tone: 2 },
          { label: "Last Sync", value: formattedSyncTime, icon: Award, badge: snapshot?.source || "auto", tone: 3 },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] overflow-x-auto">
          {GRADE_PILLS.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setSelectedGrade(pill.value)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                selectedGrade === pill.value
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {canSync && (
          <Button
            onClick={() => setConfirmSyncOpen(true)}
            disabled={syncMutation.isPending}
            className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", syncMutation.isPending && "animate-spin")} />
            <span>Sync Now</span>
          </Button>
        )}
      </div>

      <AdminSurface className="overflow-hidden">
        {top10.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1.5">
            <Trophy className="size-8 mx-auto opacity-30 text-[var(--primary)]" />
            <p className="font-semibold">No rankings yet</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[11px] font-semibold text-[var(--muted-foreground)]">
                <th className="py-3.5 px-5">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Marks</th>
                <th className="py-3.5 px-4">Attendance</th>
                <th className="py-3.5 px-5 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]/60 text-xs">
              {top10.map((entry) => {
                const displayRank = selectedGrade === "all" ? entry.rank : entry.gradeRank;
                return (
                  <tr key={entry.id} className="hover:bg-[var(--admin-surface)]/70 transition-colors">
                    <td className="py-3.5 px-5 font-bold tabular-nums">
                      <AdminStatusPill label={`#${displayRank}`} tone={displayRank === 1 ? "primary" : "neutral"} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">{entry.studentName}</div>
                      <div className="text-[11px] text-muted-foreground">{entry.grade}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold tabular-nums">{entry.marksScore}%</td>
                    <td className="py-3.5 px-4 font-semibold tabular-nums">{entry.attendanceScore}%</td>
                    <td className="py-3.5 px-5 text-right font-black text-[var(--primary)] tabular-nums text-sm">
                      {entry.score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminSurface>

      <AlertDialog open={confirmSyncOpen} onOpenChange={setConfirmSyncOpen}>
        <AlertDialogContent className="rounded-3xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sync Leaderboard?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Recomputes student rankings from latest marks and attendance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full h-9 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => syncMutation.mutate()} className="rounded-full h-9 text-xs">
              Sync
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
