"use client";

import * as React from "react";
import Link from "next/link";
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

interface DockItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const DOCK_ITEMS: DockItem[] = [
  { title: "Home", href: "/dashboard", icon: Home },
  { title: "Marks", href: "/marks", icon: FileText },
  { title: "Activities", href: "/analysis", icon: Sparkles },
  { title: "Top 10", href: "/leaderboard", icon: Trophy },
  { title: "News", href: "/announcements", icon: Megaphone },
  { title: "Profile", href: "/settings", icon: User },
];

export function StudentDock() {
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
    <>
      <nav
        aria-label="Student Mobile Navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xl max-w-[calc(100vw-1.5rem)] sm:max-w-xl">
          {DOCK_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            if (isActive) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current="page"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#184880] text-white font-semibold text-xs sm:text-sm shadow-sm transition-all duration-200 shrink-0"
                >
                  <Icon className="size-4 sm:size-5 stroke-[2.2]" />
                  <span className="whitespace-nowrap">{item.title}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.title}
                title={item.title}
                className="flex items-center justify-center size-9 sm:size-11 rounded-full text-slate-500 hover:text-[#184880] hover:bg-slate-100 transition-colors shrink-0"
              >
                <Icon className="size-4 sm:size-5 stroke-[1.8]" />
              </Link>
            );
          })}

          {/* Mobile-only Sign Out Button */}
          <button
            type="button"
            aria-label="Sign Out"
            title="Sign Out"
            onClick={() => setOpenSignOut(true)}
            className="flex items-center justify-center size-9 sm:size-11 rounded-full bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 shadow-xs transition-all active:scale-95 shrink-0"
          >
            <LogOut className="size-4 sm:size-5 stroke-[2]" />
          </button>
        </div>
      </nav>

      {/* Confirmation Dialog */}
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
    </>
  );
}
