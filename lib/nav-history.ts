export const NAV_HISTORY_STORAGE_KEY = "newgen_nav_history_v1";
export const NAV_HISTORY_EVENT = "newgen:nav-history-change";
const MAX_HISTORY_ENTRIES = 30;

export function sanitizeInternalPath(candidate: string | null | undefined): string | null {
  if (!candidate) return null;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  return trimmed;
}

export function extractPathname(url: string): string {
  const qIndex = url.indexOf("?");
  const hIndex = url.indexOf("#");
  let end = url.length;
  if (qIndex !== -1) end = Math.min(end, qIndex);
  if (hIndex !== -1) end = Math.min(end, hIndex);
  return url.slice(0, end) || "/";
}

export function applyRouteVisit(history: string[], nextUrl: string): string[] {
  const cleanNext = sanitizeInternalPath(nextUrl);
  if (!cleanNext) return history;

  if (history.length === 0) {
    return [cleanNext];
  }

  const nextPath = extractPathname(cleanNext);
  const topUrl = history[history.length - 1];
  const topPath = extractPathname(topUrl);

  // Same pathname (e.g., switching ?tab=overview -> ?tab=classes via router.replace) updates current entry
  if (topPath === nextPath) {
    if (topUrl === cleanNext) return history;
    return [...history.slice(0, -1), cleanNext];
  }

  // If browser native Back landed on the exact immediately previous URL, pop cleanly
  if (history.length >= 2 && history[history.length - 2] === cleanNext) {
    return history.slice(0, -1);
  }

  const updated = [...history, cleanNext];
  return updated.length > MAX_HISTORY_ENTRIES
    ? updated.slice(updated.length - MAX_HISTORY_ENTRIES)
    : updated;
}

export function resolvePreviousUrl(params: {
  history: string[];
  currentUrl: string;
  explicitFrom?: string | null;
  fallbackHref: string;
}): string {
  const explicit = sanitizeInternalPath(params.explicitFrom);
  if (explicit && explicit !== params.currentUrl) {
    return explicit;
  }

  const currentPath = extractPathname(params.currentUrl);
  for (let i = params.history.length - 1; i >= 0; i -= 1) {
    const entry = sanitizeInternalPath(params.history[i]);
    if (!entry) continue;
    if (extractPathname(entry) !== currentPath) {
      return entry;
    }
  }

  return params.fallbackHref;
}

export function consumeHistoryOnBack(history: string[], currentUrl: string): string[] {
  const currentPath = extractPathname(currentUrl);
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (extractPathname(history[i]) === currentPath) {
      return history.slice(0, i);
    }
  }
  return history;
}

export function resolveBackLabel(targetUrl: string, fallbackLabel: string, fallbackHref: string): string {
  const targetPath = extractPathname(targetUrl);
  const fallbackPath = extractPathname(fallbackHref);
  if (targetPath === fallbackPath) {
    return fallbackLabel;
  }

  if (targetPath.startsWith("/students/")) return "Back to Student";
  if (targetPath === "/students") return "Back to Students";
  if (targetPath.startsWith("/classes/")) return "Back to Class";
  if (targetPath === "/classes") return "Back to Classes";
  if (targetPath.startsWith("/exams/")) return "Back to Assessment";
  if (targetPath === "/exams") return "Back to Exams & Tests";
  if (targetPath.startsWith("/staff/")) return "Back to Staff Profile";
  if (targetPath === "/staff") return "Back to Staff Members";
  if (targetPath === "/evaluate-marks") return "Back to Evaluate Marks";
  if (targetPath === "/attendance") return "Back to Attendance";
  if (targetPath === "/analysis") return "Back to Analysis";
  if (targetPath === "/dashboard") return "Back to Dashboard";
  if (targetPath === "/leaderboard") return "Back to Leaderboard";
  if (targetPath === "/marks") return "Back to Marks";

  return "Back";
}

export function readStoredNavHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(NAV_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.startsWith("/"))
      : [];
  } catch {
    return [];
  }
}

export function writeStoredNavHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(NAV_HISTORY_STORAGE_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event(NAV_HISTORY_EVENT));
  } catch {
    // Ignore sessionStorage quota / private-mode restrictions
  }
}
