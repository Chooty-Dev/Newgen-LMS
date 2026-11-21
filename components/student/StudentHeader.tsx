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
          <div className="size-10 rounded-2xl bg-[#EBF3FE] text-[#184880] flex items-center justify-center shadow-xs">
            <BookOpen className="size-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-[#184880] tracking-tight block leading-tight">
              Newgen LMS
            </span>
          </div>
        </Link>

        {/* Desktop Greeting (From Reference Design) */}
        <div className="hidden md:block">
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Hello, {firstName}! <span>👋</span>
          </h1>
          <p className="text-xs lg:text-sm text-slate-500 font-medium mt-0.5">
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
          className="relative size-10 rounded-full bg-white border border-slate-200/80 text-slate-600 hover:text-[#184880] hover:bg-slate-50 flex items-center justify-center shadow-xs transition-colors"
        >
          <Bell className="size-5 stroke-[2]" />
          <span className="absolute top-2 right-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
        </Link>

        {/* User Pill / Profile Card */}
        <Link
          href="/settings"
          className="flex items-center gap-2.5 bg-sky-400/20 border border-slate-200/80 rounded-full pl-1.5 pr-3 py-2 shadow-xs hover:bg-slate-50 transition-colors"
        >
          <div className="size-10 rounded-full bg-[#EBF3FE] text-[#184880] font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
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
            <p className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
              {user?.name || "Student"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Student</p>
          </div>
          <ChevronDown className="size-3.5 text-slate-400 ml-0.5 hidden sm:block" />
        </Link>
      </div>
    </header>
  );
}
