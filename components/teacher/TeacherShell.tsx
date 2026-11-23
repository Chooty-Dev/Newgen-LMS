"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  Calendar,
  FileCheck,
  Bell,
  Award,
  Trophy,
  Settings,
  ShieldCheck,
  LogOut,
  Search,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TeacherShellProps {
  children: React.ReactNode;
}

export function TeacherShell({ children }: TeacherShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors
    } finally {
      window.location.href = "/login";
    }
  };

  const navMenuItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "My Classes",
      href: "/classes",
      icon: BookOpen,
    },
    {
      label: "Students",
      href: "/students",
      icon: Users,
    },
    {
      label: "Schedule",
      href: "/attendance",
      icon: Calendar,
    },
    {
      label: "Assignments",
      href: "/exams",
      icon: FileCheck,
    },
    {
      label: "Messages",
      href: "/announcements",
      icon: Bell,
      badge: "3",
    },
    {
      label: "Performance",
      href: "/analysis",
      icon: Award,
    },
    {
      label: "Leaderboard",
      href: "/leaderboard",
      icon: Trophy,
    },
  ];

  const accountMenuItems = [
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      label: "Security",
      href: "/security",
      icon: ShieldCheck,
    },
  ];

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "TE";

  // Formatted current date e.g. "Monday, 23 November 2026"
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div>
              <span className="font-extrabold text-xl tracking-tight text-foreground block">
                Danuma LMS
              </span>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground block">
                Teacher Academy
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Menu Section */}
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider px-3 mb-2">
            Menu
          </p>
          {navMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-4.5 transition-transform group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-rose-500 text-white"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Account Section */}
        <div className="space-y-1 pt-2 border-t border-border/60">
          <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider px-3 mb-2">
            Account
          </p>
          {accountMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <Icon
                  className={cn(
                    "size-4.5 transition-transform group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-left group"
          >
            <LogOut className="size-4.5 text-rose-500 transition-transform group-hover:scale-110" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Bottom Promo Card (Matches Trophy Card in reference UI) */}
      <div className="mt-6 p-4 rounded-3xl bg-secondary border border-border shadow-xs text-center relative overflow-hidden space-y-3">
        <div className="size-11 rounded-2xl bg-amber-400/20 text-amber-600 mx-auto flex items-center justify-center shadow-xs">
          <Trophy className="size-5 fill-amber-500 text-amber-500" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">Teacher Faculty</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active Term 2026/27
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center w-full px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-xs transition-all"
        >
          View Profile
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row antialiased">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-background border-r border-border h-screen sticky top-0 overflow-hidden z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-background border-r border-border shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden size-10 rounded-full flex items-center justify-center text-foreground hover:bg-secondary border border-border"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>

            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight capitalize">
                {pathname.replace(/^\//, "").split("/")[0] || "Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Search bar in the center */}
          <div className="hidden md:flex flex-1 max-w-md mx-4 relative">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search classes, lessons, students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary/80 hover:bg-secondary focus:bg-background border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Right quick actions & Profile pill */}
          <div className="flex items-center gap-3">
            <Link
              href="/announcements"
              className="relative size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
              title="Announcements"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
            </Link>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:pr-3 rounded-full hover:bg-secondary border border-border transition-all"
              >
                <div className="size-8 rounded-full bg-primary text-primary-foreground font-extrabold text-xs flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <p className="font-bold text-foreground truncate max-w-[120px]">
                    {user?.name || "Teacher"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Faculty
                  </p>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-card border border-border shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-bold text-foreground truncate">
                      {user?.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <Settings className="size-3.5" />
                    <span>Settings</span>
                  </Link>
                  <Link
                    href="/security"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>Security</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Logout Overlay */}
      {isLoggingOut && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 text-foreground backdrop-blur-md animate-in fade-in"
        >
          <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-6">
            <div className="relative flex items-center justify-center size-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="size-16 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" />
              <LogOut className="size-7 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Signing you out...
              </h2>
              <p className="text-sm text-muted-foreground">
                Ending teacher faculty session securely
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
