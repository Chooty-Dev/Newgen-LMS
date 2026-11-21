"use client";

import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { Crown, Medal, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

      // Main center burst
      myConfetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: isFirst
          ? ["#facc15", "#eab308", "#ca8a04", "#ffffff", "#fbbf24"]
          : ["#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa"],
      });

      // Left and right cannons for full screen coverage
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
        <DialogContent className="max-w-md text-center p-8 rounded-[2.5rem] bg-card border-2 border-primary/30 shadow-2xl space-y-6">
          <DialogHeader className="items-center text-center space-y-4">
            <div
              className={cn(
                "size-20 rounded-full flex items-center justify-center animate-bounce motion-reduce:animate-none mx-auto border",
                isFirst
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
                  : cel.rank === 2
                  ? "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30"
                  : cel.rank === 3
                  ? "bg-amber-600/10 text-amber-700 dark:text-amber-400 border-amber-600/30"
                  : "bg-primary/10 text-primary border-primary/20"
              )}
            >
              {isFirst ? (
                <Crown className="size-11 stroke-[2.2]" />
              ) : cel.rank <= 3 ? (
                <Medal className="size-11 stroke-[2.2]" />
              ) : (
                <Trophy className="size-11 stroke-[2.2]" />
              )}
            </div>
            <DialogTitle
              className={cn(
                "text-3xl font-extrabold tracking-tight",
                isFirst
                  ? "text-yellow-600 dark:text-yellow-400"
                  : cel.rank === 2
                  ? "text-slate-700 dark:text-slate-200"
                  : cel.rank === 3
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-foreground"
              )}
            >
              {isFirst ? "You are #1 in LMS!" : "You made the Top 10!"}
            </DialogTitle>
            <DialogDescription className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {isFirst
                ? `Great job, ${cel.name}! You are holding the top spot in our education center today.`
                : `Congratulations, ${cel.name}! You are ranked #${cel.rank} across the center.`}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-2xl bg-muted/60 text-sm font-semibold text-foreground">
            {isFirst
              ? "Be a role model and keep up your outstanding learning habits!"
              : "Keep going to stay strong in the Top 10!"}
          </div>

          <Button
            onClick={handleClose}
            className="w-full h-12 rounded-full text-base font-semibold"
          >
            Awesome!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
