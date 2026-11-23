"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight, Building2, ArrowLeftRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen?: boolean;
}

export function AppHeader({ onToggleSidebar, sidebarOpen = true }: AppHeaderProps) {
  const pathname = usePathname();
  const { user, switchCenter, isSwitchingCenter } = useAuth();

  // Generate breadcrumb title from path
  const pathSegments = pathname.split("/").filter(Boolean);
  const pageTitle =
    pathSegments.length > 0
      ? pathSegments[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Dashboard";

  // Initials for avatar
  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "U";

  const roleDisplay = user?.role
    ? user.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  const currentCenterName = user?.centerName || "Education Center";
  const assignedCenters = user?.assignedCenters || [];

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between bg-background/80 px-6 backdrop-blur-md">
      {/* Left: Sidebar Toggle & Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSidebar}
          className="size-12 border-none rounded-full cursor-pointer hover:bg-muted active:scale-[0.98] transition-all"
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {sidebarOpen ? (
            <ChevronLeft className="size-5" />
          ) : (
            <ChevronRight className="size-5" />
          )}
        </Button>

        <div className="hidden sm:flex items-center gap-2 text-base font-medium">
          <span className="text-muted-foreground">Newgen</span>
          <ChevronRight className="size-4 text-muted-foreground" />
          <span className="text-foreground font-semibold">{pageTitle}</span>
        </div>
      </div>

      {/* Right: Center Switcher, Theme Switch, User Profile */}
      <div className="flex items-center gap-3">
        {/* Center Switcher (for Teachers, Super Admins, Admins) */}
        {user && (user.role === "teacher" || user.role === "super_admin" || user.role === "admin") && (
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isSwitchingCenter}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer active:scale-95",
                isSwitchingCenter && "opacity-50 cursor-not-allowed"
              )}
            >
              <Building2 className="size-4 shrink-0 text-primary" />
              <span className="max-w-[120px] sm:max-w-[160px] md:max-w-[200px] truncate">
                {currentCenterName}
              </span>
              {assignedCenters.length > 1 && (
                <ArrowLeftRight className="size-3.5 shrink-0 text-muted-foreground ml-0.5" />
              )}
            </DropdownMenuTrigger>
            {assignedCenters.length > 0 && (
              <DropdownMenuContent align="end" className="w-64 rounded-3xl p-2 bg-card border-border shadow-2xl">
                <DropdownMenuLabel className="px-3 py-1.5 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Education Centers
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-60 overflow-y-auto space-y-1 py-1">
                  {assignedCenters.map((c) => {
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
                          "flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer text-sm font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold cursor-default"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Building2 className="size-4 shrink-0" />
                          <span className="truncate">{c.name}</span>
                        </div>
                        {isActive && <Check className="size-4 shrink-0 ml-2" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        )}

        {user && (
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <div className="text-base font-semibold leading-tight text-foreground">
                {user.name}
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                {roleDisplay}
              </div>
            </div>
            <div
              className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-base shadow-sm ring-2 ring-border"
              aria-label={`Profile for ${user.name}`}
            >
              {initials}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
