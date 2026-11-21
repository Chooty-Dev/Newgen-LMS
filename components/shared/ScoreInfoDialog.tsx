"use client";

import * as React from "react";
import { Info, Sparkles, BookOpen, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  tip: string;
  summarySentence: string;
}

interface ScoreInfoDialogProps {
  studentId?: string;
  className?: string;
}

export function ScoreInfoDialog({
  studentId = "me",
  className,
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
          aria-label="How is my score calculated?"
          className={cn(
            "size-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#184880] hover:bg-slate-100 transition-colors shrink-0",
            className
          )}
        >
          <Info className="size-4 stroke-[2]" />
        </button>
      </DialogTrigger>

      <DialogContent
        data-student-portal=""
        className="student-portal max-w-md rounded-3xl p-6 sm:p-8 !bg-white !text-slate-800 border border-slate-100 shadow-2xl space-y-5"
      >
        <DialogHeader className="space-y-1.5 text-left">
          <DialogTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            How your score is made
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-slate-500">
            Your performance score combines your test marks and classroom attendance.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !explanation ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Marks Weight Box */}
            <div className="p-4 rounded-2xl bg-[#EBF3FE] border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-white text-[#184880] flex items-center justify-center shadow-xs">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Test Marks</h4>
                  <p className="text-[11px] text-slate-500">
                    Accounts for {explanation.weights?.marks || 70}% of your total score
                  </p>
                </div>
              </div>
              <span className="text-lg font-black text-[#184880] tabular-nums">
                {explanation.marksScore}%
              </span>
            </div>

            {/* Attendance Weight Box */}
            <div className="p-4 rounded-2xl bg-[#F0F6FF] border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-white text-[#184880] flex items-center justify-center shadow-xs">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Attendance</h4>
                  <p className="text-[11px] text-slate-500">
                    Accounts for {explanation.weights?.attendance || 30}% of your total score
                  </p>
                </div>
              </div>
              <span className="text-lg font-black text-[#184880] tabular-nums">
                {explanation.attendanceScore}%
              </span>
            </div>

            {/* Simple Tip */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              💡 {explanation.tip || "Regular attendance and daily revision will boost your score!"}
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-full text-sm font-bold bg-[#184880] hover:bg-[#0F2C59] text-white shadow-sm transition-all"
          >
            Got it, thanks!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
