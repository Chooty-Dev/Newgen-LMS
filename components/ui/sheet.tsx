"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextType | undefined>(undefined);

export function Sheet({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(nextOpen);
      setControlledOpen?.(nextOpen);
    },
    [isControlled, setControlledOpen]
  );

  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({ children }: { children: React.ReactNode; asChild?: boolean }) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("SheetTrigger must be used inside Sheet");

  return (
    <button type="button" onClick={() => context.onOpenChange(true)}>
      {children}
    </button>
  );
}

export function SheetContent({
  children,
  side = "right",
  className,
}: {
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("SheetContent must be used inside Sheet");

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") context.onOpenChange(false);
    };
    if (context.open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [context]);

  if (!context.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "fixed z-50 gap-4 bg-card p-6 md:p-8 text-card-foreground shadow-2xl transition ease-in-out border-border overflow-y-auto",
          side === "right" && "inset-y-0 right-0 h-full w-full max-w-lg border-l rounded-l-3xl",
          side === "left" && "inset-y-0 left-0 h-full w-full max-w-lg border-r rounded-r-3xl",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[85vh] w-full border-t rounded-t-[2.5rem]",
          side === "top" && "inset-x-0 top-0 max-h-[85vh] w-full border-b rounded-b-[2.5rem]",
          className
        )}
      >
        <button
          type="button"
          onClick={() => context.onOpenChange(false)}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-1.5 pb-4 text-left", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-6 gap-2", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-2xl font-semibold text-foreground", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-base text-muted-foreground pt-1", className)} {...props} />;
}
