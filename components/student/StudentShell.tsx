"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  FileText,
  Sparkles,
  Trophy,
  Megaphone,
  User,
  LogOut,
} from "lucide-react";
import { StudentHeader } from "./StudentHeader";
import { StudentDock } from "./StudentDock";
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

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "My Marks", href: "/marks", icon: FileText },
  { title: "Activities", href: "/analysis", icon: Sparkles },
  { title: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { title: "Latest News", href: "/announcements", icon: Megaphone },
  { title: "Profile", href: "/settings", icon: User },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [openSignOut, setOpenSignOut] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  React.useEffect(() => {
    return () => {
      setIsLoggingOut(false);
    };
  }, []);

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    setOpenSignOut(false);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoggingOut(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <div
      className="light min-h-screen flex bg-white text-slate-800 font-sans w-full antialiased selection:bg-blue-100 selection:text-[#184880]"
      style={{ colorScheme: "light" }}
    >
      {/* Desktop Sidebar*/}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 p-6 shrink-0 justify-between min-h-screen sticky top-0 h-screen overflow-y-auto z-20">
        <div className="space-y-8">
          {/* Brand Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group focus-visible:outline-none"
          >
            <div>
              <span className="font-extrabold text-xl text-[#184880] tracking-tight block leading-tight">
                Newgen LMS
              </span>
              <span className="text-[11px] text-slate-400 font-medium block">
                Learn · Grow · Achieve
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav aria-label="Student Desktop Navigation" className="space-y-1.5">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${isActive
                    ? "bg-[#184880] text-white shadow-sm"
                    : "text-slate-600 hover:text-[#184880] hover:bg-slate-50"
                    }`}
                >
                  <Icon className="size-5 stroke-[2]" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Card: Boy reading book + Encouragement */}
        <div className="pt-6 border-t border-slate-100 flex flex-col items-center text-center">
          <div className="relative w-28 h-28 mb-2">
            <Image
              src="/images/kid-reading-book-1.webp"
              alt="Keep learning"
              fill
              className="object-contain"
              sizes="112px"
            />
          </div>
          <p className="text-xs font-bold text-slate-700 leading-snug">
            Keep learning,
            <br />
            <span className="text-[#184880]">You&apos;re doing great!</span> ❤️
          </p>
          <button
            type="button"
            onClick={() => setOpenSignOut(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-semibold transition-colors"
          >
            <LogOut className="size-3.5 stroke-[2]" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <StudentHeader />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 pb-28 md:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Dock (Hidden on md:) */}
      <div className="md:hidden">
        <StudentDock />
      </div>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={openSignOut} onOpenChange={setOpenSignOut}>
        <AlertDialogContent className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 text-slate-800">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-slate-900">
              Do you want to sign out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-slate-500">
              You will need to sign in again to access your account and records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="h-12 rounded-full px-6 text-base font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSignOut}
              className="h-12 rounded-full px-6 text-base font-medium bg-red-600 text-white hover:bg-red-700"
            >
              Yes, Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fullscreen Logging Out Overlay */}
      {isLoggingOut && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 text-slate-900 backdrop-blur-md transition-all duration-300 animate-in fade-in"
        >
          <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-6">
            <div className="relative flex items-center justify-center size-20">
              <div className="absolute inset-0 rounded-full border-4 border-[#184880]/20 animate-pulse" />
              <div className="size-16 rounded-full border-4 border-transparent border-t-[#184880] border-r-[#184880] animate-spin" />
              <LogOut className="size-7 text-[#184880] animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                Logging you out...
              </h2>
              <p className="text-base text-slate-500">
                Clearing your active session and redirecting to the login screen
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
