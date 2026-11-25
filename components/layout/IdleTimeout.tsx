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
import { useAuth } from "@/hooks/useAuth";
import { Clock, ShieldAlert } from "lucide-react";

interface IdleTimeoutProps {
  idleMinutes?: number;
}

const LAST_ACTIVE_KEY = "newgen_last_active";
const LOGOUT_EVENT_KEY = "newgen_logout_event";

export function IdleTimeout({ idleMinutes = 30 }: IdleTimeoutProps) {
  const { user, loading } = useAuth();
  const [showWarning, setShowWarning] = React.useState(false);
  const [secondsRemaining, setSecondsRemaining] = React.useState(60);

  const timeoutMs = idleMinutes * 60 * 1000;
  // Show warning 60 seconds before full timeout
  const warningMs = Math.max(0, timeoutMs - 60 * 1000);

  const lastActivityReportRef = React.useRef<number>(0);
  const isLoggingOutRef = React.useRef<boolean>(false);

  // Record user activity to localStorage (throttled to at most once per 5 seconds)
  const recordActivity = React.useCallback(() => {
    const now = Date.now();
    if (lastActivityReportRef.current === 0 || now - lastActivityReportRef.current >= 5000) {
      lastActivityReportRef.current = now;
      try {
        localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      } catch {
        // Ignore localStorage quota or private browsing exceptions
      }
    }
  }, []);

  const handleSignOut = React.useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      localStorage.removeItem(LAST_ACTIVE_KEY);
      localStorage.setItem(LOGOUT_EVENT_KEY, String(Date.now()));
    } catch {
      // Ignore
    }

    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }

    window.location.href = "/login?reason=idle";
  }, []);

  const handleStaySignedIn = React.useCallback(async () => {
    const now = Date.now();
    lastActivityReportRef.current = now;
    try {
      localStorage.setItem(LAST_ACTIVE_KEY, String(now));
    } catch {
      // Ignore
    }
    setShowWarning(false);

    try {
      await fetch("/api/v1/auth/refresh", { method: "POST" });
    } catch {
      // Ignore network errors
    }
  }, []);

  React.useEffect(() => {
    // Only track idle timeouts for logged-in users
    if (loading || !user) {
      return;
    }

    // Initialize last active timestamp if absent or stale
    const now = Date.now();
    let initialTimestamp = now;
    try {
      const stored = localStorage.getItem(LAST_ACTIVE_KEY);
      if (stored) {
        const parsed = Number(stored);
        if (!isNaN(parsed) && parsed > 0 && parsed <= now) {
          // If stored timestamp is older than timeoutMs already, reset it to now
          // (user just arrived / authenticated)
          if (now - parsed < timeoutMs) {
            initialTimestamp = parsed;
          } else {
            localStorage.setItem(LAST_ACTIVE_KEY, String(now));
          }
        } else {
          localStorage.setItem(LAST_ACTIVE_KEY, String(now));
        }
      } else {
        localStorage.setItem(LAST_ACTIVE_KEY, String(now));
      }
    } catch {
      // Ignore
    }
    lastActivityReportRef.current = initialTimestamp;

    // Listen to user events to mark activity
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    const onUserInteraction = () => {
      recordActivity();
      // If warning dialog was showing and user interacted, dismiss it
      if (showWarning) {
        setShowWarning(false);
      }
    };

    activityEvents.forEach((evt) =>
      window.addEventListener(evt, onUserInteraction, { passive: true })
    );

    // Cross-tab synchronization via storage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVE_KEY && e.newValue) {
        const updatedTime = Number(e.newValue);
        if (!isNaN(updatedTime)) {
          lastActivityReportRef.current = updatedTime;
          const currentIdle = Date.now() - updatedTime;
          if (currentIdle < warningMs) {
            setShowWarning(false);
          }
        }
      } else if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
        // Another tab logged out
        if (!isLoggingOutRef.current) {
          isLoggingOutRef.current = true;
          window.location.href = "/login";
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    // Heartbeat check every 5 seconds
    const intervalId = setInterval(() => {
      if (isLoggingOutRef.current) return;

      let lastActive = lastActivityReportRef.current || Date.now();
      try {
        const stored = localStorage.getItem(LAST_ACTIVE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed) && parsed > 0) {
            lastActive = Math.max(lastActive, parsed);
            lastActivityReportRef.current = lastActive;
          }
        }
      } catch {
        // Ignore
      }

      const idleDuration = Date.now() - lastActive;

      if (idleDuration >= timeoutMs) {
        // Idle timeout reached
        handleSignOut();
      } else if (idleDuration >= warningMs) {
        // In the warning window (last 60s)
        const remaining = Math.max(1, Math.ceil((timeoutMs - idleDuration) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        // Active
        setShowWarning(false);
      }
    }, 5000);

    return () => {
      activityEvents.forEach((evt) =>
        window.removeEventListener(evt, onUserInteraction)
      );
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [loading, user, timeoutMs, warningMs, recordActivity, handleSignOut, showWarning]);

  if (loading || !user) {
    return null;
  }

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent className="rounded-3xl border border-border bg-card p-6 md:p-8 max-w-md shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="size-6 stroke-[2]" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Session Timeout Warning
              </AlertDialogTitle>
              <span className="text-xs text-muted-foreground font-medium">
                Danuma Security Notice
              </span>
            </div>
          </div>
          <AlertDialogDescription className="text-base text-muted-foreground pt-1 leading-relaxed">
            You have been inactive for a while. For your security, your session will automatically close in{" "}
            <span className="font-semibold text-foreground inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full bg-muted border border-border">
              <Clock className="size-3.5" />
              {secondsRemaining}s
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={handleStaySignedIn}
            className="w-full sm:w-auto h-12 rounded-full px-6 text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95"
          >
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
