"use client";

import * as React from "react";
import { Info, Sparkles, BookOpen, Calendar, Lightbulb } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ScoreExplanationData {
  student: {
    id: string;
    name: string;
  };
  score: number | null;
  marksScore: number;
  attendanceScore: number;
  weights: {
    marks: number;
    attendance: number;
  };
  marksPoints: number;
  attendancePoints: number;
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    score: number;
    assessmentCount: number;
    assessments: Array<{
      id: string;
      title: string;
      type: string;
      score: number;
      totalMarks: number;
      percentage: number;
    }>;
  }>;
  attendanceBreakdown: {
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    totalFinalized: number;
    countedSessions: number;
  };
  tip: string;
  summarySentence: string;
}

interface ScoreInfoDialogProps {
  studentId?: string; // omit or "me" for logged in student
  className?: string;
  showSubjectsTable?: boolean; // true for teacher/admin inspection
}

export function ScoreInfoDialog({
  studentId = "me",
  className,
  showSubjectsTable = false,
}: ScoreInfoDialogProps) {
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery<{ data: ScoreExplanationData }>({
    queryKey: ["score-explanation", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/students/${studentId}/score-explanation`);
      if (!res.ok) throw new Error("Failed to load score explanation");
      return res.json();
    },
    enabled: open,
  });

  const explanation = data?.data;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="How is my score made?"
          className={cn(
            "size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0",
            className
          )}
        >
          <Info className="size-5 stroke-[2]" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] p-6 sm:p-8 bg-card border border-border">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <Sparkles className="size-4" />
            <span>Score Calculation</span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            How is my score made?
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Your score is out of 100. It comes from two things.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : explanation ? (
          <div className="space-y-6 py-2">
            {/* The 2 Components */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Marks */}
              <div className="p-5 rounded-2xl bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground flex items-center gap-2">
                    <BookOpen className="size-4 text-primary" />
                    1. Your marks ({explanation.weights.marks}%)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The average of your exams, tests, quizzes and assignments in all your subjects. Exams count a little more.
                </p>
              </div>

              {/* 2. Attendance */}
              <div className="p-5 rounded-2xl bg-muted/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-foreground flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    2. Coming to class ({explanation.weights.attendance}%)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Present counts as 1, late counts as half, absent counts as 0. Excused classes are skipped.
                </p>
              </div>
            </div>

            {/* Live Numbers Box */}
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-primary block">
                Your Live Numbers
              </span>
              <p className="text-lg font-bold text-foreground leading-snug">
                {explanation.summarySentence}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-sm">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-xs text-muted-foreground block">Marks Average</span>
                  <span className="text-xl font-extrabold text-foreground tabular-nums">
                    {explanation.marksScore}%
                  </span>
                  <span className="text-xs text-primary font-medium block">
                    +{explanation.marksPoints} pts
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-xs text-muted-foreground block">Class Attendance</span>
                  <span className="text-xl font-extrabold text-foreground tabular-nums">
                    {explanation.attendanceScore}%
                  </span>
                  <span className="text-xs text-primary font-medium block">
                    +{explanation.attendancePoints} pts
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border col-span-2 sm:col-span-1">
                  <span className="text-xs text-muted-foreground block">Final Score</span>
                  <span className="text-xl font-extrabold text-primary tabular-nums">
                    {explanation.score ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground block">out of 100</span>
                </div>
              </div>
            </div>

            {/* Kind Tip */}
            {explanation.tip && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border">
                <Lightbulb className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-bold uppercase text-primary tracking-wider">Helpful Tip</span>
                  <p className="text-sm font-medium text-foreground">{explanation.tip}</p>
                </div>
              </div>
            )}

            {/* Subject details table for teachers / inspect mode */}
            {showSubjectsTable && explanation.subjects.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-sm font-bold text-foreground">Subjects Used in Marks Score:</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {explanation.subjects.map((sub) => (
                    <div key={sub.subjectId} className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between text-sm">
                      <span className="font-semibold text-foreground">{sub.subjectName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{sub.assessmentCount} tests</span>
                        <span className="font-bold text-foreground tabular-nums">{Math.round(sub.score)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-xs text-muted-foreground">
              Your score updates when new marks or attendance are added. The Top 10 list updates once a day.
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <Button
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-full text-sm font-semibold"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
