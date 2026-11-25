"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { NAVIGATION_ITEMS } from "@/core/config/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  BookOpen,
  Users,
  Building2,
  ShieldCheck,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  GraduationCap,
  Check,
  ArrowLeftRight,
  Settings,
  Sliders,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

type GroupId = "overview" | "academics" | "people" | "operations" | "system";

interface NavGroup {
  id: GroupId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hrefs: string[];
}

const ADMIN_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutGrid,
    hrefs: ["/dashboard"],
  },
  {
    id: "academics",
    label: "Academics",
    icon: BookOpen,
    hrefs: [
      "/classes",
      "/subjects",
      "/exams",
      "/marks",
      "/evaluate-marks",
      "/attendance",
      "/analysis",
      "/leaderboard",
    ],
  },
  {
    id: "people",
    label: "Directory",
    icon: Users,
    hrefs: ["/students", "/teachers", "/staff", "/admins"],
  },
  {
    id: "operations",
    label: "Centers",
    icon: Building2,
    hrefs: ["/centers", "/announcements"],
  },
  {
    id: "system",
    label: "Governance",
    icon: ShieldCheck,
    hrefs: ["/permissions", "/audit-trail", "/security", "/system-settings", "/settings"],
  },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/centers": "Centers",
  "/classes": "Classes",
  "/subjects": "Subjects",
  "/exams": "Exams & Tests",
  "/marks": "Marks",
  "/evaluate-marks": "Evaluate Marks",
  "/analysis": "Analysis",
  "/attendance": "Attendance",
  "/announcements": "Announcements",
  "/students": "Students",
  "/teachers": "Teachers",
  "/staff": "Staff",
  "/admins": "Admins",
  "/leaderboard": "Leaderboard",
  "/permissions": "Permissions",
  "/audit-trail": "Audit Trail",
  "/security": "Security",
  "/system-settings": "System Settings",
  "/settings": "Account",
};

/** Ephemeral overlay state that automatically resets when the active pathname changes. */
function useRouteScopedState<T>(initialValue: T, pathname: string) {
  const [state, setState] = React.useState<{ path: string; value: T }>({
    path: pathname,
    value: initialValue,
  });

  const value = state.path === pathname ? state.value : initialValue;

  const setValue = React.useCallback(
    (next: React.SetStateAction<T>) => {
      setState((prev) => {
        const current = prev.path === pathname ? prev.value : initialValue;
        const resolved =
          typeof next === "function"
            ? (next as (prevState: T) => T)(current)
            : next;
        return { path: pathname, value: resolved };
      });
    },
    [pathname, initialValue]
  );

  return [value, setValue] as const;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, hasPermission, switchCenter, isSwitchingCenter } = useAuth();

  const [openFlyout, setOpenFlyout] = useRouteScopedState<GroupId | null>(null, pathname);
  const [mobileOpen, setMobileOpen] = useRouteScopedState<boolean>(false, pathname);
  const [searchOpen, setSearchOpen] = useRouteScopedState<boolean>(false, pathname);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [openSignOut, setOpenSignOut] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const railRef = React.useRef<HTMLDivElement | null>(null);

  // Filter permitted navigation items using RBAC permissions
  const visibleItems = React.useMemo(
    () =>
      NAVIGATION_ITEMS.filter((item) => {
        if (!user) return false;
        return hasPermission(item.permission);
      }),
    [user, hasPermission]
  );

  // Close flyout on outside click
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (railRef.current && !railRef.current.contains(e.target as Node)) {
        setOpenFlyout(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [setOpenFlyout]);

  // Derive concise Page Title matching reference ("Overview", "Centers", etc.)
  const baseSegment = "/" + (pathname.split("/").filter(Boolean)[0] || "dashboard");
  const pageTitle = ROUTE_TITLES[baseSegment] || "Overview";

  const activeGroupId = React.useMemo<GroupId>(() => {
    for (const g of ADMIN_GROUPS) {
      if (g.hrefs.some((h) => baseSegment === h || pathname.startsWith(h + "/"))) {
        return g.id;
      }
    }
    return "overview";
  }, [baseSegment, pathname]);

  const activeGroupItems = React.useMemo(() => {
    const group = ADMIN_GROUPS.find((g) => g.id === openFlyout);
    if (!group) return [];
    return visibleItems.filter((item) => group.hrefs.includes(item.href));
  }, [openFlyout, visibleItems]);

  const currentCenterName = user?.centerName || "Education Center";
  const assignedCenters = user?.assignedCenters || [];

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

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

  const filteredSearchItems = visibleItems.filter(
    (item) =>
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.href.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-[var(--admin-rail)] text-[var(--foreground)] font-sans antialiased">
      {/* =====================================================================
          1. LEFT MINIMAL ICON RAIL (Matches reference dark sidebar silhouette,
             styled in our globals.css Deep Blue --admin-rail #184880)
         ===================================================================== */}
      <aside
        ref={railRef}
        className="hidden md:flex flex-col items-center justify-between w-[76px] shrink-0 py-6 bg-[var(--admin-rail)] text-[var(--admin-rail-fg)] sticky top-0 h-screen z-40 select-none"
      >
        {/* Top Brand Square */}
        <Link
          href="/dashboard"
          className="size-11 rounded-2xl bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
          title="Danuma LMS Admin"
        >
          <GraduationCap className="size-6 stroke-[2.2]" />
        </Link>

        {/* Centered Vertical Group Icons */}
        <nav className="flex flex-col items-center gap-3">
          {ADMIN_GROUPS.map((group) => {
            const Icon = group.icon;
            const groupItems = visibleItems.filter((item) => group.hrefs.includes(item.href));
            if (groupItems.length === 0) return null;

            const isCurrentGroup = activeGroupId === group.id;
            const isFlyoutOpen = openFlyout === group.id;

            if (group.id === "overview") {
              return (
                <Link
                  key={group.id}
                  href="/dashboard"
                  title="Overview"
                  className={cn(
                    "size-11 rounded-2xl flex items-center justify-center transition-all",
                    isCurrentGroup
                      ? "bg-[var(--admin-rail-active)] text-white shadow-xs"
                      : "text-[var(--admin-rail-muted)] hover:text-white hover:bg-white/10"
                  )}
                >
                  <Icon className="size-5 stroke-[1.9]" />
                </Link>
              );
            }

            return (
              <button
                key={group.id}
                type="button"
                title={group.label}
                onClick={() => setOpenFlyout(isFlyoutOpen ? null : group.id)}
                className={cn(
                  "size-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative",
                  isCurrentGroup || isFlyoutOpen
                    ? "bg-[var(--admin-rail-active)] text-white shadow-xs"
                    : "text-[var(--admin-rail-muted)] hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="size-5 stroke-[1.9]" />
              </button>
            );
          })}
        </nav>

        {/* Bottom Sign Out Icon */}
        <button
          type="button"
          onClick={() => setOpenSignOut(true)}
          title="Sign Out"
          className="size-11 rounded-2xl flex items-center justify-center text-[var(--admin-rail-muted)] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <LogOut className="size-5 stroke-[1.9]" />
        </button>

        {/* Sleek Floating Group Flyout Menu */}
        {openFlyout && activeGroupItems.length > 0 && (
          <div className="fixed left-[84px] top-1/2 -translate-y-1/2 z-50 w-56 rounded-[24px] bg-white border border-[var(--admin-border)] shadow-xl p-2.5 animate-in fade-in slide-in-from-left-2 duration-150">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              {ADMIN_GROUPS.find((g) => g.id === openFlyout)?.label}
            </div>
            <div className="space-y-1 mt-1">
              {activeGroupItems.map((item) => {
                const ItemIcon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-[var(--secondary)] text-[var(--primary)] font-bold"
                        : "text-[var(--foreground)] hover:bg-[var(--admin-surface)]"
                    )}
                  >
                    <ItemIcon className="size-4 stroke-[1.9]" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </aside>

      {/* =====================================================================
          2. MAIN WHITE WORKSPACE CANVAS (Rounded Left Corners matching reference)
         ===================================================================== */}
      <div className="flex-1 min-w-0 bg-[var(--admin-canvas)] md:rounded-l-[32px] min-h-screen flex flex-col overflow-x-clip">
        {/* Clean Minimal Top Header */}
        <header className="h-20 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          {/* Left: Mobile Trigger + Bold Concise Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="md:hidden size-10 rounded-full border border-[var(--admin-border)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--secondary)] cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)] truncate">
              {pageTitle}
            </h1>
          </div>

          {/* Right: Center Switcher + Search Circle + Bell Circle + Avatar Pill */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Multi-Center Switcher Pill */}
            {assignedCenters.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isSwitchingCenter}
                  className={cn(
                    "hidden sm:inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all cursor-pointer",
                    isSwitchingCenter && "opacity-50"
                  )}
                >
                  <Building2 className="size-3.5 text-[var(--primary)] shrink-0" />
                  <span className="max-w-[140px] truncate">{currentCenterName}</span>
                  {assignedCenters.length > 1 && (
                    <ArrowLeftRight className="size-3 text-[var(--muted-foreground)] shrink-0" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 rounded-2xl p-2 bg-white border-[var(--admin-border)] shadow-xl"
                >
                  <DropdownMenuLabel className="px-2.5 py-1 text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Switch Center
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {assignedCenters.map((c) => {
                    const isCurrent = c.id === user?.centerId;
                    return (
                      <DropdownMenuItem
                        key={c.id}
                        disabled={isCurrent || isSwitchingCenter}
                        onClick={() => !isCurrent && switchCenter(c.id, c.name)}
                        className={cn(
                          "rounded-xl px-2.5 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer",
                          isCurrent && "bg-[var(--secondary)] text-[var(--primary)]"
                        )}
                      >
                        <span className="truncate">{c.name}</span>
                        {isCurrent && <Check className="size-3.5" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Quick Search Circle */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="size-10 rounded-full border border-[var(--admin-border)] bg-white flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all cursor-pointer"
              title="Quick Navigation"
              aria-label="Search pages"
            >
              <Search className="size-4" />
            </button>

            {/* Notifications Bell Circle */}
            <Link
              href="/announcements"
              className="relative size-10 rounded-full border border-[var(--admin-border)] bg-white flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all"
              title="Announcements"
            >
              <Bell className="size-4" />
              <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-rose-500" />
            </Link>

            {/* User Profile Pill */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--admin-border)] bg-white pl-1.5 pr-3 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--primary)]/40 transition-all cursor-pointer">
                <div className="size-7 rounded-full bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center font-bold text-[11px]">
                  {initials}
                </div>
                <span className="hidden sm:inline max-w-[110px] truncate">{user?.name || "Admin"}</span>
                <ChevronDown className="size-3.5 text-[var(--muted-foreground)]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-2xl p-2 bg-white border-[var(--admin-border)] shadow-xl"
              >
                <div className="px-2.5 py-1.5">
                  <p className="text-xs font-bold text-[var(--foreground)] truncate">{user?.name}</p>
                  <p className="text-[11px] text-[var(--muted-foreground)] capitalize">
                    {user?.role?.replace(/_/g, " ")}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/settings")}
                  className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer flex items-center gap-2"
                >
                  <Settings className="size-3.5" />
                  <span>Account</span>
                </DropdownMenuItem>
                {hasPermission("settings.system") && (
                  <DropdownMenuItem
                    onClick={() => router.push("/system-settings")}
                    className="rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Sliders className="size-3.5" />
                    <span>System Settings</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setOpenSignOut(true)}
                  className="rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-600 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Quick Group Pill Strip for 1-click navigation within active group */}
        {activeGroupId !== "overview" && (
          <div className="px-4 sm:px-8 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {visibleItems
              .filter((item) =>
                ADMIN_GROUPS.find((g) => g.id === activeGroupId)?.hrefs.includes(item.href)
              )
              .map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 border",
                      isActive
                        ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-2xs"
                        : "bg-[var(--admin-surface)] text-[var(--muted-foreground)] border-[var(--admin-border)] hover:text-[var(--foreground)]"
                    )}
                  >
                    {item.title}
                  </Link>
                );
              })}
          </div>
        )}

        {/* Workspace Main Content */}
        <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 pb-16 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-72 bg-[var(--admin-rail)] text-white h-full flex flex-col p-5 overflow-y-auto">
            <div className="flex items-center justify-between pb-5 border-b border-white/15">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center">
                  <GraduationCap className="size-5" />
                </div>
                <span className="font-bold text-base">Danuma Admin</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="size-8 rounded-full flex items-center justify-center hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 py-4 space-y-1">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--admin-rail-active)] text-white font-semibold"
                        : "text-[var(--admin-rail-muted)] hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                setOpenSignOut(true);
              }}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              <LogOut className="size-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Command Search Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-white rounded-[24px] border border-[var(--admin-border)] shadow-2xl p-5 max-w-lg w-full space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--admin-border)]">
              <span className="font-bold text-sm text-[var(--foreground)]">Jump to Page</span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="size-8 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--admin-surface)] cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="size-4 text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search pages (Centers, Students, Audit Trail...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pt-1">
              {filteredSearchItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="p-2.5 rounded-xl bg-[var(--admin-surface)] hover:bg-[var(--secondary)] border border-[var(--admin-border)] flex items-center gap-2 text-xs font-semibold text-[var(--foreground)] transition-colors"
                  >
                    <Icon className="size-4 text-[var(--primary)] shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={openSignOut} onOpenChange={setOpenSignOut}>
        <AlertDialogContent className="rounded-3xl border border-[var(--admin-border)] bg-white p-6 max-w-sm shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-center">Sign Out?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-xs text-[var(--muted-foreground)]">
              End your active session now.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex gap-2">
            <AlertDialogCancel disabled={isLoggingOut} className="flex-1 h-10 rounded-full text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSignOut}
              disabled={isLoggingOut}
              className="flex-1 h-10 rounded-full text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
