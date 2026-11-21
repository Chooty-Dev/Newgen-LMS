"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Sparkles,
  Trophy,
  Megaphone,
  User,
} from "lucide-react";

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

  return (
    <nav
      aria-label="Student Navigation"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center gap-1.5 p-2 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-xl max-w-[calc(100vw-6.5rem)] sm:max-w-xl">
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-5 stroke-[2.2]" />
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
              className="flex items-center justify-center size-11 sm:size-12 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="size-5 stroke-[1.8]" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
