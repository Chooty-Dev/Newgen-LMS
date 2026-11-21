"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

interface IdleTimeoutProps {
  idleMinutes?: number;
}

export function IdleTimeout({ idleMinutes = 30 }: IdleTimeoutProps) {
  const [showWarning, setShowWarning] = React.useState(false);
  const router = useRouter();

  // Warning triggers 1 minute before timeout
  const warningMs = Math.max(1, idleMinutes - 1) * 60 * 1000;
  const timeoutMs = idleMinutes * 60 * 1000;

  const warningTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startTimers = React.useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, warningMs);

    logoutTimerRef.current = setTimeout(async () => {
      try {
        await fetch("/api/v1/auth/logout", { method: "POST" });
      } catch {
        // Ignore network errors on logout
      }
      router.push("/login?reason=idle");
    }, timeoutMs);
  }, [warningMs, timeoutMs]);

  const handleStaySignedIn = React.useCallback(async () => {
    try {
      await fetch("/api/v1/auth/refresh", { method: "POST" });
    } catch {
      // Ignore
    }
    setShowWarning(false);
    startTimers();
  }, [startTimers]);

  React.useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => {
      if (!showWarning) {
        startTimers();
      }
    };

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    startTimers();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, [showWarning, startTimers]);

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You will be signed out soon</AlertDialogTitle>
          <AlertDialogDescription>
            You have been inactive. For your security, your session will close in 1 minute.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleStaySignedIn}>
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
