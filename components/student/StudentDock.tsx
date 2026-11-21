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
  { title: "Analysis", href: "/analysis", icon: Sparkles },
  { title: "Top 10", href: "/leaderboard", icon: Trophy },
  { title: "News", href: "/announcements", icon: Megaphone },
  { title: "Me", href: "/settings", icon: User },
];

export function StudentDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [openSignOut, setOpenSignOut] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Guarantee that the logging out overlay is clean on unmount
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
    // Brief visual pause for pleasant feedback
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoggingOut(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <nav
        aria-label="Student Navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl max-w-[calc(100vw-1.5rem)] sm:max-w-xl">
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
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
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
                className="flex items-center justify-center size-9 sm:size-11 md:size-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
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
            className="flex items-center justify-center size-9 sm:size-11 md:hidden rounded-full bg-red-500/50 text-foreground border border-red-600 hover:bg-red-600 shadow-sm transition-all active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="size-4 sm:size-5 stroke-[2]" />
          </button>
        </div>
      </nav>

      {/* Confirmation Dialog */}
      <AlertDialog open={openSignOut} onOpenChange={setOpenSignOut}>
        <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 md:p-8">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              Do you want to sign out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground">
              You will need to sign in again to access your account and records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="h-12 rounded-full px-6 text-base font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSignOut}
              className="h-12 rounded-full px-6 text-base font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 text-foreground backdrop-blur-md transition-all duration-300 animate-in fade-in"
        >
          <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-6">
            <div className="relative flex items-center justify-center size-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="size-16 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" />
              <LogOut className="size-7 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                Logging you out...
              </h2>
              <p className="text-base text-muted-foreground">
                Clearing your active session and redirecting to the login screen
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
