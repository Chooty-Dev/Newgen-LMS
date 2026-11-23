"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION_ITEMS } from "@/core/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, X, ChevronDown, ChevronUp } from "lucide-react";

interface AppSidebarProps {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  openDesktop?: boolean;
}

export function AppSidebar({
  openMobile,
  setOpenMobile,
  openDesktop = true,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const navRef = React.useRef<HTMLElement | null>(null);
  const [hasOverflow, setHasOverflow] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Filter items based on permissions
  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (!user) return false;
    // Special handling for students
    if (user.role === "student") {
      if (item.href === "/marks") return hasPermission("marks.viewOwn");
      if (item.href === "/analysis") return hasPermission("analysis.viewOwn");
      if (item.href === "/evaluate-marks") return false;
      if (item.href === "/attendance") return false;
    }
    return hasPermission(item.permission);
  });

  // Check if navigation items overflow the available sidebar height
  const checkOverflow = React.useCallback(() => {
    if (navRef.current) {
      const el = navRef.current;
      const overflowing = el.scrollHeight > el.clientHeight + 8;
      setHasOverflow(overflowing);
    }
  }, []);

  React.useEffect(() => {
    checkOverflow();
    const timer = setTimeout(checkOverflow, 150);
    window.addEventListener("resize", checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow, visibleItems]);

  const sidebarContent = (
    <div className="flex flex-col h-full p-6 bg-background text-foreground overflow-hidden">
      {/* Brand Logo & Title */}
      <div className="flex items-center justify-between px-2 pb-6 shrink-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group"
          onClick={() => setOpenMobile(false)}
        >
          <div className="size-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <GraduationCap className="size-6 stroke-[2]" />
          </div>
          <div>
            <span className="font-semibold text-xl tracking-tight block text-foreground">
              Danuma LMS
            </span>
            <span className="text-xs text-muted-foreground font-medium block">
              Education Center
            </span>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setOpenMobile(false)}
          className="md:hidden size-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
          aria-label="Close sidebar"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Navigation Items Area - Fills down to the bottom of the sidebar */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <nav
          ref={navRef}
          className={cn(
            "flex-1 flex flex-col space-y-1.5 pr-1 transition-all duration-300",
            isExpanded ? "overflow-y-auto scrollbar-thin" : "overflow-hidden"
          )}
        >
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpenMobile(false)}
                className={cn(
                  "flex items-center gap-3.5 px-5 py-3 rounded-full text-base font-medium transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <Icon className="size-5 shrink-0 stroke-[1.9]" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}

          {/* See Less button at bottom when expanded */}
          {isExpanded && hasOverflow && (
            <div className="pt-3 pb-6 flex justify-center shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  navRef.current?.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/80 hover:bg-muted text-foreground text-xs font-semibold border border-border shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>See Less</span>
                <ChevronUp className="size-3.5 stroke-[2.2]" />
              </button>
            </div>
          )}
        </nav>

        {/* Fade effect with See More button on bottom link when collapsed and overflowing */}
        {!isExpanded && hasOverflow && (
          <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-background via-background/90 to-transparent flex items-end justify-center pb-2 pointer-events-none">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="pointer-events-auto flex items-center gap-1.5 px-4 py-2 rounded-full bg-card/95 hover:bg-muted text-foreground border border-border shadow-md backdrop-blur-md text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>See More</span>
              <ChevronDown className="size-4 stroke-[2.2]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          "hidden md:block shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-hidden border-r border-border bg-background",
          openDesktop ? "w-72" : "w-0 border-none"
        )}
      >
        <div className="w-72 h-full">
          {sidebarContent}
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {openMobile && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpenMobile(false)}
            aria-hidden="true"
          />
          <div className="relative z-50 w-72 h-full shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
