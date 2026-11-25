"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  TrendingUp,
  FileCheck,
  BookMarked,
  Bell,
  Award,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  Users,
  UserCheck,
  Building2,
  ArrowLeftRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CenterSwitchOverlay } from "@/components/layout/CenterSwitchOverlay";

interface TeacherShellProps {
  children: React.ReactNode;
}

export function TeacherShell({ children }: TeacherShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, switchCenter, isSwitchingCenter } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = React.useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      localStorage.removeItem("newgen_last_active");
      localStorage.setItem("newgen_logout_event", String(Date.now()));
    } catch {
      // Ignore
    }
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors
    } finally {
      window.location.href = "/login";
    }
  };

  const navMenuItems: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        label: "Marks",
        href: "/marks",
        icon: CheckSquare,
      },
      {
        label: "Analysis",
        href: "/analysis",
        icon: TrendingUp,
      },
      {
        label: "Classes",
        href: "/classes",
        icon: BookOpen,
      },
      {
        label: "Exams & Tests",
        href: "/exams",
        icon: FileCheck,
      },
      {
        label: "Subjects",
        href: "/subjects",
        icon: BookMarked,
      },
      {
        label: "Announcements",
        href: "/announcements",
        icon: Bell,
      },
      {
        label: "Students",
        href: "/students",
        icon: Users,
      },
      {
        label: "Staff Members",
        href: "/staff",
        icon: UserCheck,
      },
      {
        label: "Leaderboard",
        href: "/leaderboard",
        icon: Trophy,
      },
    ];

  const accountMenuItems = [
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "TE";

  // Formatted current date e.g. "Monday, 23 November 2026"
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-6 overflow-y-auto">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-2">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div>
              <span className="font-extrabold text-xl tracking-tight text-foreground block">
                Danuma LMS
              </span>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground block">
                Teacher Academy
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden size-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Menu Section */}
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider px-3 mb-2">
            Menu
          </p>
          {navMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      "size-4.5 transition-transform group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                    )}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-rose-500 text-white"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Account Section */}
        <div className="space-y-1 pt-2 border-t border-border/60">
          <p className="text-[11px] font-bold text-muted-foreground/80 uppercase tracking-wider px-3 mb-2">
            Account
          </p>
          {accountMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all group",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <Icon
                  className={cn(
                    "size-4.5 transition-transform group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all text-left group"
          >
            <LogOut className="size-4.5 text-rose-500 transition-transform group-hover:scale-110" />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row antialiased">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-background border-r border-border h-screen sticky top-0 overflow-hidden z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-background border-r border-border shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-20 bg-background/90 backdrop-blur-md border-b border-border px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden size-10 rounded-full flex items-center justify-center text-foreground hover:bg-secondary border border-border"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </button>

            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight capitalize">
                {pathname.replace(/^\//, "").split("/")[0] || "Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Center Switcher (replacing search bar) */}
          <div className="flex-1 flex justify-center max-w-md mx-2 sm:mx-4">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isSwitchingCenter}
                  className={cn(
                    "group inline-flex h-10 items-center gap-2 sm:gap-2.5 rounded-full border border-border bg-secondary/70 hover:bg-secondary px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-foreground shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer active:scale-98",
                    isSwitchingCenter && "opacity-50 cursor-not-allowed"
                  )}
                  title="Switch Active Education Center"
                >
                  <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <Building2 className="size-3.5 shrink-0" />
                  </div>
                  <span className="max-w-[130px] sm:max-w-[200px] truncate text-foreground font-bold">
                    {user.centerName || "Education Center"}
                  </span>
                  {user.assignedCenters && user.assignedCenters.length > 1 && (
                    <div className="flex items-center gap-1 text-muted-foreground ml-0.5">
                      <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded-md bg-white border border-border hidden sm:inline-block">
                        Campus
                      </span>
                      <ArrowLeftRight className="size-3 shrink-0 group-hover:text-primary transition-colors" />
                    </div>
                  )}
                </DropdownMenuTrigger>

                {user.assignedCenters && user.assignedCenters.length > 0 && (
                  <DropdownMenuContent
                    align="center"
                    className="w-72 rounded-3xl p-2.5 bg-card border-border shadow-2xl z-50"
                  >
                    <DropdownMenuLabel className="px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-black flex items-center justify-between">
                      <span>Assigned Campuses</span>
                      <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {user.assignedCenters.length} {user.assignedCenters.length === 1 ? "Center" : "Centers"}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1.5" />

                    <div className="max-h-60 overflow-y-auto space-y-1.5 py-1 pr-1">
                      {user.assignedCenters.map((c) => {
                        const isActive = c.id === user.centerId;
                        return (
                          <DropdownMenuItem
                            key={c.id}
                            disabled={isActive || isSwitchingCenter}
                            onClick={() => {
                              if (!isActive) {
                                switchCenter(c.id, c.name);
                              }
                            }}
                            className={cn(
                              "flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer text-xs font-bold transition-all",
                              isActive
                                ? "bg-primary text-primary-foreground font-extrabold shadow-xs cursor-default"
                                : "hover:bg-secondary text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={cn(
                                  "size-7 rounded-xl flex items-center justify-center shrink-0",
                                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                )}
                              >
                                <Building2 className="size-3.5" />
                              </div>
                              <span className="truncate">{c.name}</span>
                            </div>
                            {isActive ? (
                              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center ml-2 shrink-0">
                                <Check className="size-3 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground font-semibold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                Switch
                              </span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </div>
                  </DropdownMenuContent>
                )}
              </DropdownMenu>
            )}
          </div>

          {/* Right quick actions & Profile pill */}
          <div className="flex items-center gap-3">
            <Link
              href="/announcements"
              className="relative size-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
              title="Announcements"
            >
              <Bell className="size-4.5" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-rose-500 ring-2 ring-background" />
            </Link>

            {/* User Profile Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 sm:pr-3 rounded-full hover:bg-secondary border border-border transition-all cursor-pointer"
              >
                <div className="relative size-8 sm:size-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center">
                  <Image
                    src="/images/teacher-profile.webp"
                    alt={user?.name || "Teacher Profile"}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="hidden sm:block text-left text-xs leading-tight">
                  <p className="font-bold text-foreground truncate max-w-[120px]">
                    {user?.name || "Teacher"}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Faculty
                  </p>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-card border border-border shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="px-4 py-2 border-b border-border flex items-center gap-2.5">
                    <div className="relative size-9 rounded-full overflow-hidden shrink-0">
                      <Image
                        src="/images/teacher-profile.webp"
                        alt={user?.name || "Teacher Profile"}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">
                        {user?.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    <Settings className="size-3.5" />
                    <span>Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 text-left"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Logout Overlay */}
      {isLoggingOut && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 text-foreground backdrop-blur-md animate-in fade-in"
        >
          <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-6">
            <div className="relative flex items-center justify-center size-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse" />
              <div className="size-16 rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin" />
              <LogOut className="size-7 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Signing you out...
              </h2>
              <p className="text-sm text-muted-foreground">
                Ending teacher faculty session securely
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Education Center Switch Transition Overlay */}
      <CenterSwitchOverlay />
    </div>
  );
}
