"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left" ref={ref}>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export function DropdownMenuTrigger({
  children,
  className,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used inside DropdownMenu");

  return (
    <button
      type="button"
      onClick={() => context.setOpen((prev) => !prev)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuContent({
  children,
  align = "end",
  className,
}: {
  children: React.ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuContent must be used inside DropdownMenu");

  if (!context.open) return null;

  return (
    <div
      role="menu"
      className={cn(
        "absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-3xl border border-border bg-card p-2 text-card-foreground shadow-2xl focus:outline-none",
        align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const context = React.useContext(DropdownMenuContext);

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          onClick?.();
          context?.setOpen(false);
        }
      }}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-3 rounded-2xl px-4 py-3 text-base text-foreground outline-none transition-colors hover:bg-muted focus:bg-muted disabled:pointer-events-none disabled:opacity-50 text-left",
        className
      )}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} />;
}

export function DropdownMenuLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-2 text-sm font-semibold text-muted-foreground", className)}>
      {children}
    </div>
  );
}
