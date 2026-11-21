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
import { Button } from "@/components/ui/button";
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
      <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-[2.5rem]">
        <SheetHeader className="text-left space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Award className="size-5" />
            <span>{feedbackBadge}</span>
          </div>
          <SheetTitle className="text-3xl font-bold tracking-tight text-foreground">
            {mark.title}
          </SheetTitle>
          <SheetDescription className="text-base text-muted-foreground flex items-center gap-2">
            <BookOpen className="size-4" />
            <span>{mark.subject}</span>
            <span>•</span>
            <Calendar className="size-4" />
            <span>{mark.date}</span>
          </SheetDescription>
        </SheetHeader>

        {/* Big Score Box */}
        <div className="my-6 p-6 rounded-[2rem] bg-muted/60 border border-border flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block">
              Your Mark
            </span>
            <div className="text-4xl md:text-5xl font-bold text-foreground tabular-nums pt-1">
              {mark.score}{" "}
              <span className="text-2xl font-normal text-muted-foreground">
                / {mark.totalMarks}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl md:text-4xl font-extrabold text-primary tabular-nums">
              {mark.percentage}%
            </div>
            <span className="text-sm font-semibold text-muted-foreground">
              Grade {mark.grade}
            </span>
          </div>
        </div>

        {/* Details & Remarks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border text-base">
            <span className="text-muted-foreground">Assessment Type</span>
            <span className="font-semibold text-foreground capitalize">
              {mark.type.replace("_", " ")}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border text-base">
            <span className="text-muted-foreground">Attendance</span>
            <span className="font-semibold text-foreground capitalize flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              {mark.attendanceStatus}
            </span>
          </div>

          {mark.remarks && (
            <div className="pt-2">
              <span className="text-sm font-semibold text-muted-foreground block mb-1">
                Teacher&apos;s Note
              </span>
              <div className="p-4 rounded-2xl bg-card border border-border text-foreground italic text-base">
                &ldquo;{mark.remarks}&rdquo;
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="mt-8">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-full text-base font-semibold"
          >
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
