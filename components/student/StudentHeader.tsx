"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronDown, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export function StudentHeader() {
  const { user } = useAuth();

  const firstName = user?.name
    ? user.name.split(" ")[0]
    : "Student";

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "ST";

  return (
    <header className="w-full flex items-center justify-between py-5 px-4 sm:px-6 lg:px-8 select-none">
      {/* Left: Desktop Greeting / Mobile Logo */}
      <div className="flex items-center gap-3">
        {/* Mobile Logo (Visible on mobile only) */}
        <Link
          href="/dashboard"
          className="flex md:hidden items-center gap-2.5 group"
        >
          <div className="size-10 rounded-2xl bg-secondary text-primary flex items-center justify-center shadow-xs">
            <BookOpen className="size-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-primary tracking-tight block leading-tight">
              Danuma LMS
            </span>
          </div>
        </Link>

        {/* Desktop Greeting (From Reference Design) */}
        <div className="hidden md:block">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            Hello, {firstName}! <span>👋</span>
          </h1>
          <p className="text-xs lg:text-sm text-muted-foreground font-medium mt-0.5">
            Welcome back to your learning journey!
          </p>
        </div>
      </div>

      {/* Right: Notifications Bell + Profile Card */}
      <div className="flex items-center gap-3">
        {/* Notification Bell with Red Dot */}
        <Link
          href="/announcements"
          aria-label="Announcements"
          className="relative size-10 rounded-full bg-card border border-border text-muted-foreground hover:text-primary hover:bg-secondary flex items-center justify-center shadow-xs transition-colors"
        >
          <Bell className="size-5 stroke-[2]" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive ring-2 ring-card" />
        </Link>

        {/* User Pill / Profile Card */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 bg-card border border-border rounded-full pl-1.5 pr-3 py-1.5 shadow-xs hover:bg-secondary/60 transition-colors"
        >
          <div className="size-9 rounded-full bg-secondary text-primary font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.name || "Student"}
                width={32}
                height={32}
                className="size-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-xs font-bold text-foreground truncate max-w-[110px]">
              {user?.name || "Student"}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">Student</p>
          </div>
          <ChevronDown className="size-3.5 text-slate-400 ml-0.5 hidden sm:block" />
        </Link>
      </div>
    </header>
  );
}
