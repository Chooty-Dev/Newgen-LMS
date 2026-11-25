"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Bell,
  LogOut,
  Check,
  ClipboardList,
  CalendarCheck,
  Megaphone,
  LayoutDashboard,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [openSignOut, setOpenSignOut] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Fetch real announcements count
  const { data: announcementsData } = useQuery({
    queryKey: ["announcements-count", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/announcements?limit=5");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const announcementCount = announcementsData?.data?.length || 0;

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    setOpenSignOut(false);
    try {
      localStorage.removeItem("newgen_last_active");
      localStorage.setItem("newgen_logout_event", String(Date.now()));
    } catch {
      // Ignore
    }
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    router.push("/login");
  };

  const navItems = [
    { title: "Overview", href: "/dashboard" },
    { title: "Evaluations", href: "/evaluate-marks", show: hasPermission("marks.evaluate") },
    { title: "Attendance", href: "/attendance", show: hasPermission("attendance.view") || hasPermission("attendance.mark") },
    { title: "Announcements", href: "/announcements", show: hasPermission("announcements.view") },
    { title: "Students", href: "/students", show: hasPermission("students.view") },
  ].filter((item) => item.show !== false);

  const firstName = user?.name ? user.name.split(" ")[0] : "Staff";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <div className="min-h-screen bg-[#F4F6FA] text-foreground font-sans antialiased flex flex-col">
      {/* 1. TOP HEADER (Matching the Reference UI) */}
      <header className="sticky top-0 z-40 bg-[#F4F6FA]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 border-b border-border/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Avatar + "Hello, {Name}" */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="size-10 sm:size-11 rounded-full bg-primary/10 text-primary border-2 border-white shadow-xs flex items-center justify-center font-extrabold text-sm overflow-hidden shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                  Hello, {firstName}
                </span>
                <span className="inline-block animate-wave text-sm select-none">👋</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium hidden sm:block">
                Staff Portal • {user?.centerName || "Danuma Center"}
              </p>
            </div>
          </div>

          {/* Center: Pill Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-white/80 p-1.5 rounded-full border border-border/60 shadow-xs">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 select-none",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Right: Search button, Notification bell, and Sign Out */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Pill Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="size-9 sm:size-10 rounded-full bg-white border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Search tasks or students"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>

            {/* Notification Bell with Badge */}
            <Link
              href="/announcements"
              className="relative size-9 sm:size-10 rounded-full bg-white border border-border/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shadow-2xs active:scale-95"
              title="Announcements & Notifications"
            >
              <Bell className="size-4" />
              {announcementCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-black tracking-tight shadow-xs border-2 border-white">
                  {announcementCount}
                </span>
              )}
            </Link>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={() => setOpenSignOut(true)}
              disabled={isLoggingOut}
              className="size-9 sm:size-10 rounded-full bg-white border border-border/80 flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:border-rose-300 transition-all shadow-2xs cursor-pointer active:scale-95"
              title="Sign Out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav Bar */}
        <div className="md:hidden flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-border/40 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all select-none shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground bg-white border border-border/60"
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      </header>

      {/* 2. MAIN VIEW CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Quick Search Dialog */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
          <div className="bg-card rounded-3xl border border-border shadow-2xl p-5 max-w-lg w-full space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-bold text-sm text-foreground">Quick Staff Navigation</span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Jump to evaluation, attendance, or news..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-2xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              <Link
                href="/evaluate-marks"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-border flex items-center gap-2 font-bold text-foreground transition-all"
              >
                <ClipboardList className="size-4 text-primary" />
                <span>Pending Evaluations</span>
              </Link>
              <Link
                href="/attendance"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-border flex items-center gap-2 font-bold text-foreground transition-all"
              >
                <CalendarCheck className="size-4 text-emerald-600" />
                <span>Mark Attendance</span>
              </Link>
              <Link
                href="/announcements"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-border flex items-center gap-2 font-bold text-foreground transition-all"
              >
                <Megaphone className="size-4 text-purple-600" />
                <span>Announcements</span>
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setSearchOpen(false)}
                className="p-3 rounded-2xl bg-secondary/40 hover:bg-secondary border border-border flex items-center gap-2 font-bold text-foreground transition-all"
              >
                <LayoutDashboard className="size-4 text-blue-600" />
                <span>Staff Overview</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={openSignOut} onOpenChange={setOpenSignOut}>
        <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 md:p-8 max-w-md shadow-2xl">
          <AlertDialogHeader className="space-y-3">
            <div className="size-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="size-6 stroke-[2]" />
            </div>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-center text-foreground">
              Sign Out from Staff Portal?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to log out? Any unsaved evaluation or attendance drafts should be saved first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              disabled={isLoggingOut}
              className="w-full sm:w-1/2 h-11 rounded-full text-sm font-semibold border-border hover:bg-muted"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSignOut}
              disabled={isLoggingOut}
              className="w-full sm:w-1/2 h-11 rounded-full text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95"
            >
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
