"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Crown, Medal, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CelebrationData {
  shouldCelebrate: boolean;
  rank?: number;
  snapshotId?: string;
  name?: string;
}

export function CelebrationDialog() {
  const [dismissed, setDismissed] = React.useState(false);
  const [confettiEnded, setConfettiEnded] = React.useState(false);

  const { data } = useQuery<{ data: CelebrationData }>({
    queryKey: ["student-celebration"],
    queryFn: async () => {
      const res = await fetch("/api/v1/students/me/celebration");
      if (!res.ok) throw new Error("Failed to check celebration");
      return res.json();
    },
  });

  const cel = data?.data;
  const open = Boolean(cel?.shouldCelebrate && !dismissed);
  const isFirst = cel?.rank === 1;
  const showConfetti = open && !confettiEnded;

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        setConfettiEnded(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const canvasRef = React.useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;

      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true,
      });

      myConfetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: isFirst
          ? ["#facc15", "#eab308", "#ca8a04", "#ffffff", "#fbbf24"]
          : ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa"],
      });

      const t1 = setTimeout(() => {
        myConfetti({
          particleCount: 60,
          angle: 60,
          spread: 65,
          origin: { x: 0, y: 0.65 },
          colors: isFirst
            ? ["#facc15", "#eab308", "#ffffff"]
            : ["#60a5fa", "#34d399", "#fbbf24"],
        });
      }, 250);

      const t2 = setTimeout(() => {
        myConfetti({
          particleCount: 60,
          angle: 120,
          spread: 65,
          origin: { x: 1, y: 0.65 },
          colors: isFirst
            ? ["#facc15", "#eab308", "#ffffff"]
            : ["#f472b6", "#a78bfa", "#fbbf24"],
        });
      }, 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    },
    [isFirst]
  );

  const acknowledgeMutation = useMutation({
    mutationFn: async () => {
      if (!cel?.snapshotId || !cel?.rank) return;
      await fetch("/api/v1/students/me/celebration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: cel.snapshotId, rank: cel.rank }),
      });
    },
  });

  const handleClose = () => {
    setDismissed(true);
    setConfettiEnded(true);
    acknowledgeMutation.mutate();
  };

  if (!cel?.shouldCelebrate || !cel.rank) return null;

  return (
    <>
      {showConfetti && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 h-full w-full z-[100]"
        />
      )}

      <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
        <DialogContent
          data-student-portal=""
          className="student-portal max-w-sm text-center p-8 rounded-3xl !bg-white !text-slate-800 border border-slate-100 shadow-2xl space-y-5"
        >
          <DialogHeader className="items-center text-center space-y-3">
            <div
              className={`size-20 rounded-full flex items-center justify-center mx-auto border ${
                isFirst
                  ? "bg-yellow-50 text-yellow-500 border-yellow-200"
                  : cel.rank === 2
                  ? "bg-slate-50 text-slate-500 border-slate-200"
                  : "bg-amber-50 text-amber-600 border-amber-200"
              }`}
            >
              {isFirst ? (
                <Crown className="size-11 stroke-[2.2] fill-yellow-400" />
              ) : cel.rank <= 3 ? (
                <Medal className="size-11 stroke-[2.2]" />
              ) : (
                <Trophy className="size-11 stroke-[2.2]" />
              )}
            </div>

            <DialogTitle
              className={`text-2xl font-black tracking-tight ${
                isFirst ? "text-yellow-600" : "text-slate-900"
              }`}
            >
              {isFirst ? "You are #1 in LMS!" : "You made the Top 10!"}
            </DialogTitle>

            <DialogDescription className="text-sm text-slate-500 leading-relaxed">
              {isFirst
                ? `Great job, ${cel.name}! You are holding the top spot in our education center today.`
                : `Congratulations, ${cel.name}! You are ranked #${cel.rank} across the center.`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-2xl bg-[#EBF3FE] text-xs font-bold text-[#184880]">
            {isFirst
              ? "Be a role model and keep up your outstanding learning habits!"
              : "Keep going to stay strong in the Top 10!"}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full h-11 rounded-full text-sm font-bold bg-[#184880] hover:bg-[#0F2C59] text-white shadow-sm transition-all"
          >
            Awesome!
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
