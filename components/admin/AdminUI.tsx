"use client";

import * as React from "react";
import Link from "next/link";
import { LucideIcon, MoreVertical, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminTileItem {
  label: string;
  value: string | number;
  icon: LucideIcon;
  badge?: string;
  href?: string;
  tone?: 1 | 2 | 3;
}

/**
 * Renders the 3 signature light-blue tinted vertical/compact metric tiles
 * matching the "Your Assets" row in the admin UI reference (no gradients).
 */
export function AdminAssetTiles({
  items,
  columns = 3,
  className,
}: {
  items: AdminTileItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols =
    columns === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-3";

  const toneClass = (idx: number, explicit?: 1 | 2 | 3) => {
    const t = explicit || (((idx % 3) + 1) as 1 | 2 | 3);
    if (t === 1) return "bg-[var(--admin-tile-1)]";
    if (t === 2) return "bg-[var(--admin-tile-2)]";
    return "bg-[var(--admin-tile-3)]";
  };

  return (
    <div className={cn("grid gap-3.5", gridCols, className)}>
      {items.map((item, idx) => {
        const Icon = item.icon;
        const cardInner = (
          <div
            className={cn(
              "rounded-[24px] p-5 border border-[var(--admin-border)] flex flex-col justify-between min-h-[146px] transition-all hover:border-[var(--primary)]/40",
              toneClass(idx, item.tone)
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-2xl sm:text-[26px] font-bold tracking-tight text-[var(--foreground)] tabular-nums leading-tight truncate">
                  {item.value}
                </p>
                <p className="text-xs font-medium text-[var(--muted-foreground)] mt-0.5 truncate">
                  {item.label}
                </p>
              </div>
              {item.href && (
                <span className="size-7 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/60 transition-colors shrink-0">
                  <MoreVertical className="size-4" />
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-2">
              <div className="size-9 rounded-xl bg-white border border-[var(--admin-border)] text-[var(--primary)] flex items-center justify-center shadow-2xs">
                <Icon className="size-4 stroke-[2]" />
              </div>
              {item.badge && (
                <span className="text-xs font-semibold text-[var(--primary)] truncate max-w-[140px]">
                  {item.badge}
                </span>
              )}
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.label} href={item.href} className="block group">
            {cardInner}
          </Link>
        ) : (
          <div key={item.label}>{cardInner}</div>
        );
      })}
    </div>
  );
}

/**
 * Clean minimal white surface card with crisp border matching reference layout.
 */
export function AdminSurface({
  children,
  tinted = false,
  className,
}: {
  children: React.ReactNode;
  tinted?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-[var(--admin-border)]",
        tinted ? "bg-[var(--admin-surface)]" : "bg-[var(--admin-canvas)]",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Minimal section heading matching reference ("Portfolio", "Your Assets").
 */
export function AdminSectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-3", className)}>
      <h2 className="text-lg font-bold tracking-tight text-[var(--foreground)]">{title}</h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/**
 * Single minimal row toolbar: Search pill + compact filters + primary action(s).
 */
export function AdminToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  actions,
  className,
}: {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {onSearchChange !== undefined && (
          <div className="relative w-full sm:w-64">
            <Search className="size-4 text-[var(--muted-foreground)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchValue || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)] text-xs font-medium text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
        )}
        {filters}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Crisp pill filter select matching the minimal "24h v" / "Top gainers v" dropdowns in reference.
 */
export function AdminFilterSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-10 px-4 rounded-full bg-white border border-[var(--admin-border)] text-xs font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer",
        className
      )}
    >
      {children}
    </select>
  );
}

/**
 * Minimal semantic pill tag constrained strictly to globals.css palette.
 */
export function AdminStatusPill({
  label,
  tone = "primary",
  className,
}: {
  label: string;
  tone?: "primary" | "neutral" | "danger" | "sky";
  className?: string;
}) {
  const styles =
    tone === "danger"
      ? "bg-rose-50 text-rose-600 border-rose-200"
      : tone === "neutral"
        ? "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--admin-border)]"
        : tone === "sky"
          ? "bg-[var(--accent)] text-[var(--primary)] border-[var(--admin-border)]"
          : "bg-[var(--secondary)] text-[var(--primary)] border-[var(--admin-border)]";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border",
        styles,
        className
      )}
    >
      {label}
    </span>
  );
}
