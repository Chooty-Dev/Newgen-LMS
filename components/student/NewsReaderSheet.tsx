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
import { Megaphone, Calendar, User } from "lucide-react";

export interface StudentAnnouncement {
  id: string;
  title: string;
  body: string;
  publishAt?: string;
  createdAt?: string;
  date?: string;
  authorName?: string;
  authorRole?: string;
  audience?: string;
  pinned?: boolean;
}

interface NewsReaderSheetProps {
  announcement: StudentAnnouncement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewsReaderSheet({
  announcement,
  open,
  onOpenChange,
}: NewsReaderSheetProps) {
  if (!announcement) return null;

  const dateStr = announcement.date || announcement.publishAt || announcement.createdAt || "Recent";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-xl mx-auto rounded-t-[2.5rem]">
        <SheetHeader className="text-left space-y-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Megaphone className="size-5" />
            <span>School News</span>
          </div>
          <SheetTitle className="text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-snug">
            {announcement.title}
          </SheetTitle>
          <SheetDescription className="text-sm md:text-base text-muted-foreground flex flex-wrap items-center gap-3">
            {announcement.authorName && (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <User className="size-4 text-muted-foreground" />
                {announcement.authorName} {announcement.authorRole ? `(${announcement.authorRole})` : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              {dateStr}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="my-6 p-6 rounded-[2rem] bg-card border border-border overflow-y-auto max-h-[50vh]">
          <p className="text-base md:text-lg leading-relaxed text-foreground whitespace-pre-wrap">
            {announcement.body}
          </p>
        </div>

        <SheetFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-12 rounded-full text-base font-semibold"
          >
            Done Reading
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
