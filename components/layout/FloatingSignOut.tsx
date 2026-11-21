"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FloatingSignOut() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // Guarantee that the logging out overlay is clean on unmount
  React.useEffect(() => {
    return () => {
      setIsLoggingOut(false);
    };
  }, []);

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    setOpen(false);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    // Brief visual pause for pleasant feedback
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Reset state before navigation so cached router tree never preserves isLoggingOut = true
    setIsLoggingOut(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]">
        <AlertDialog open={open} onOpenChange={setOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label="Sign Out"
                    className="flex gap-2 w-32 py-5 backdrop-blur-sm items-center justify-center rounded-full bg-red-500/50 text-foreground border border-red-600 shadow-lg transition-all hover:bg-red-600 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Sign Out
                    <LogOut className="size-6 stroke-[2]" />
                  </button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent side="left" className="rounded-full px-4 py-1.5 font-medium">
                Sign Out
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

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
      </div>

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
