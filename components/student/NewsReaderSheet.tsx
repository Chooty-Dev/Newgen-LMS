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
      <SheetContent
        side="bottom"
        className="sm:max-w-xl mx-auto rounded-t-3xl bg-card text-foreground border-t border-border p-6 sm:p-8"
      >
        <SheetHeader className="text-left space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <Megaphone className="size-4" />
            <span>Center News</span>
          </div>
          <SheetTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-snug">
            {announcement.title}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
            {announcement.authorName && (
              <span className="flex items-center gap-1 font-medium text-foreground">
                <User className="size-3.5 text-muted-foreground" />
                {announcement.authorName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5 text-muted-foreground" />
              {dateStr}
            </span>
          </SheetDescription>
        </SheetHeader>

        {/* Content Body */}
        <div className="my-6 p-5 rounded-3xl bg-background border border-border text-sm text-foreground leading-relaxed whitespace-pre-line">
          {announcement.body}
        </div>

        <SheetFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-full text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer"
          >
            Close Notice
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
