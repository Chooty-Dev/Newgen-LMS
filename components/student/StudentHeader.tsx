"use client";

import * as React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { useAuth } from "@/hooks/useAuth";

export function StudentHeader() {
  const { user } = useAuth();
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <header className="w-full flex items-center justify-between py-4 px-2 select-none">
      {/* Left: School Mark + Title */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full px-2 py-1"
      >
        <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
          <GraduationCap className="size-6 stroke-[2]" />
        </div>
        <div>
          <span className="font-bold text-xl md:text-2xl tracking-tight block text-foreground leading-tight">
            Newgen LMS
          </span>
          <span className="text-xs md:text-sm text-muted-foreground font-medium block">
            Student Portal
          </span>
        </div>
      </Link>

      {/* Right: Theme Switch + Profile Avatar Link */}
      <div className="flex items-center gap-3">
        <ThemeSwitch />
        <Link
          href="/settings"
          aria-label="My Account"
          className="size-11 rounded-full bg-card border border-border text-foreground flex items-center justify-center font-bold text-sm shadow-sm hover:bg-muted hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {initials}
        </Link>
      </div>
    </header>
  );
}
