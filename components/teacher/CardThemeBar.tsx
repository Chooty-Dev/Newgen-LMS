"use client";

import * as React from "react";
import { useCardTheme } from "@/hooks/useCardTheme";
import { CARD_THEMES, QUICK_PRESETS } from "@/lib/card-themes";
import { SlidersHorizontal, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardThemeBarProps {
  className?: string;
}

export function CardThemeBar({ className }: CardThemeBarProps) {
  const { themeId, setTheme } = useCardTheme();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setPopoverOpen(false);
      }
    }

    if (popoverOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [popoverOpen]);

  // Close on Escape key
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPopoverOpen(false);
      }
    }

    if (popoverOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [popoverOpen]);

  return (
    <div ref={containerRef} className="relative z-30">
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 rounded-full bg-white/95 border border-border/80 shadow-2xs backdrop-blur-xs",
          className
        )}
      >
        {/* Left: Swatches row */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-1 hidden sm:inline-block">
            Theme:
          </span>
          <div className="flex items-center gap-1.5">
            {QUICK_PRESETS.map((preset) => {
              const isSelected = themeId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  title={preset.name}
                  onClick={() => setTheme(preset.id)}
                  className={cn(
                    "size-4 sm:size-4.5 rounded-full transition-all duration-200 cursor-pointer relative shrink-0",
                    "hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 scale-110 shadow-xs"
                      : "opacity-85 hover:opacity-100 border border-black/10"
                  )}
                  style={{ backgroundColor: preset.swatch }}
                >
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="size-2.5 text-white stroke-[3.5]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Settings button (toggles small white popover box) */}
        <button
          type="button"
          onClick={() => setPopoverOpen((prev) => !prev)}
          title="Customize card colors..."
          className={cn(
            "size-6 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 border cursor-pointer shrink-0 ml-2",
            popoverOpen
              ? "bg-primary text-white border-primary shadow-xs"
              : "bg-secondary hover:bg-secondary/80 text-foreground border-border/60"
          )}
        >
          <SlidersHorizontal
            className={cn(
              "size-3",
              popoverOpen ? "text-white" : "text-muted-foreground hover:text-foreground"
            )}
          />
        </button>
      </div>

      {/* Popover Box: Clean White background, compact, round dots only, instant updating */}
      {popoverOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 sm:w-72 bg-white rounded-2xl border border-slate-200/90 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.14)] p-3.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
              Card Colors
            </span>
            <button
              type="button"
              onClick={() => {
                setTheme("default");
              }}
              className="text-[10px] font-bold text-slate-500 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="size-2.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Section 1: Light Pastels */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Light Pastels
            </span>
            <div className="grid grid-cols-6 gap-2">
              {CARD_THEMES.filter((t) => t.category === "light").map((theme) => {
                const isSelected = themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={theme.name}
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      "size-7 rounded-full transition-all duration-150 cursor-pointer relative flex items-center justify-center shrink-0 border border-black/10",
                      "hover:scale-115 focus-visible:outline-none",
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-xs"
                        : "hover:shadow-xs"
                    )}
                    style={{ backgroundColor: theme.swatch }}
                  >
                    {isSelected && (
                      <Check className="size-3.5 text-white stroke-[3.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Mid-Tones */}
          <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-100">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Mid Tones
            </span>
            <div className="grid grid-cols-6 gap-2">
              {CARD_THEMES.filter((t) => t.category === "mid").map((theme) => {
                const isSelected = themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={theme.name}
                    onClick={() => setTheme(theme.id)}
                    className={cn(
                      "size-7 rounded-full transition-all duration-150 cursor-pointer relative flex items-center justify-center shrink-0 border border-black/10",
                      "hover:scale-115 focus-visible:outline-none",
                      isSelected
                        ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-xs"
                        : "hover:shadow-xs"
                    )}
                    style={{ backgroundColor: theme.swatch }}
                  >
                    {isSelected && (
                      <Check className="size-3.5 text-white stroke-[3.5]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
