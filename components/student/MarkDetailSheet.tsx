"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Award, Calendar, BookOpen, CheckCircle2 } from "lucide-react";

export interface StudentMarkItem {
  id: string;
  title: string;
  date: string;
  subject: string;
  class: string;
  type: string;
  score: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  attendanceStatus: string;
  remarks?: string;
}

interface MarkDetailSheetProps {
  mark: StudentMarkItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkDetailSheet({
  mark,
  open,
  onOpenChange,
}: MarkDetailSheetProps) {
  if (!mark) return null;

  let feedbackBadge = "Good effort!";
  if (mark.percentage >= 85) feedbackBadge = "🌟 Outstanding Result!";
  else if (mark.percentage >= 70) feedbackBadge = "✨ Well Done!";
  else if (mark.percentage >= 50) feedbackBadge = "👍 Good Progress!";
  else feedbackBadge = "💪 You can do it!";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="sm:max-w-xl mx-auto rounded-t-3xl bg-card text-foreground border-t border-border p-6 sm:p-8"
      >
        <SheetHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Award className="size-4" />
            <span>{feedbackBadge}</span>
          </div>
          <SheetTitle className="text-2xl font-black tracking-tight text-foreground">
            {mark.title}
          </SheetTitle>
          <SheetDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
            <BookOpen className="size-3.5 text-muted-foreground" />
            <span>{mark.subject}</span>
            <span>•</span>
            <Calendar className="size-3.5 text-muted-foreground" />
            <span>{mark.date}</span>
          </SheetDescription>
        </SheetHeader>

        {/* Big Score Box (Clean Light Blue) */}
        <div className="my-5 p-5 rounded-3xl bg-secondary border border-border flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-primary tracking-wider block">
              Your Mark
            </span>
            <div className="text-3xl sm:text-4xl font-black text-foreground tabular-nums pt-1">
              {mark.score}{" "}
              <span className="text-xl font-normal text-muted-foreground">
                / {mark.totalMarks}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black text-primary tabular-nums">
              {mark.percentage}%
            </div>
            <span className="text-xs font-bold text-primary">
              Grade {mark.grade}
            </span>
          </div>
        </div>

        {/* Details & Remarks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border text-sm">
            <span className="text-muted-foreground">Assessment Type</span>
            <span className="font-bold text-foreground capitalize">
              {mark.type.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border text-sm">
            <span className="text-muted-foreground">Attendance</span>
            <span className="font-bold text-foreground capitalize flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-emerald-600" />
              {mark.attendanceStatus}
            </span>
          </div>

          {mark.remarks && (
            <div className="pt-2">
              <span className="text-xs font-bold text-muted-foreground block mb-1">
                Teacher&apos;s Note
              </span>
              <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border text-foreground italic text-xs leading-relaxed">
                &ldquo;{mark.remarks}&rdquo;
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-full text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer"
          >
            Close
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
