"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  NAV_HISTORY_EVENT,
  NAV_HISTORY_STORAGE_KEY,
  applyRouteVisit,
  consumeHistoryOnBack,
  readStoredNavHistory,
  resolveBackLabel,
  resolvePreviousUrl,
  writeStoredNavHistory,
} from "@/lib/nav-history";

function subscribeNavHistory(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onStoreChange();
  window.addEventListener(NAV_HISTORY_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(NAV_HISTORY_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getRawNavHistorySnapshot(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerNavHistorySnapshot(): string | null {
  return null;
}

/**
 * Tracks in-app navigation history in sessionStorage (preserving query strings such as ?tab=classes)
 * so every Back button returns the user cleanly to the exact page & tab they came from.
 */
export function RouteHistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString() || "";
    const fullUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentHistory = readStoredNavHistory();
    const nextHistory = applyRouteVisit(currentHistory, fullUrl);
    if (
      nextHistory.length !== currentHistory.length ||
      nextHistory.some((item, idx) => item !== currentHistory[idx])
    ) {
      writeStoredNavHistory(nextHistory);
    }
  }, [pathname, searchParams]);

  return null;
}

interface SmartBackButtonProps {
  fallbackHref: string;
  fallbackLabel: string;
  variant?: "link" | "button" | "hero";
  className?: string;
}

export function SmartBackButton(props: SmartBackButtonProps) {
  return (
    <React.Suspense
      fallback={
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#627D98]">
          <ArrowLeft className="size-3.5" />
          <span>{props.fallbackLabel}</span>
        </span>
      }
    >
      <SmartBackButtonInner {...props} />
    </React.Suspense>
  );
}

function SmartBackButtonInner({
  fallbackHref,
  fallbackLabel,
  variant = "link",
  className,
}: SmartBackButtonProps) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const qs = searchParams?.toString() || "";
  const currentUrl = qs ? `${pathname}?${qs}` : pathname;
  const explicitFrom = searchParams?.get("from");

  const rawHistoryJson = React.useSyncExternalStore(
    subscribeNavHistory,
    getRawNavHistorySnapshot,
    getServerNavHistorySnapshot
  );

  const history = React.useMemo<string[]>(() => {
    if (!rawHistoryJson) return [];
    try {
      const parsed = JSON.parse(rawHistoryJson);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [];
    } catch {
      return [];
    }
  }, [rawHistoryJson]);

  const targetUrl = React.useMemo(
    () =>
      resolvePreviousUrl({
        history,
        currentUrl,
        explicitFrom,
        fallbackHref,
      }),
    [history, currentUrl, explicitFrom, fallbackHref]
  );

  const label = React.useMemo(
    () => resolveBackLabel(targetUrl, fallbackLabel, fallbackHref),
    [targetUrl, fallbackLabel, fallbackHref]
  );

  const handleBack = () => {
    const latestHistory = readStoredNavHistory();
    const exactTarget = resolvePreviousUrl({
      history: latestHistory,
      currentUrl,
      explicitFrom,
      fallbackHref,
    });
    const poppedHistory = consumeHistoryOnBack(latestHistory, currentUrl);
    writeStoredNavHistory(poppedHistory);
    router.push(exactTarget);
  };

  if (variant === "button") {
    return (
      <Button
        type="button"
        onClick={handleBack}
        variant="outline"
        className={cn("rounded-full", className)}
      >
        <ArrowLeft className="size-4 mr-2" />
        <span>{label}</span>
      </Button>
    );
  }

  if (variant === "hero") {
    return (
      <button
        type="button"
        onClick={handleBack}
        className={cn(
          "inline-flex items-center justify-center bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer",
          className
        )}
      >
        <ArrowLeft className="size-4" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold text-[#627D98] hover:text-[#184880] transition-colors group cursor-pointer",
        className
      )}
    >
      <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
      <span>{label}</span>
    </button>
  );
}
