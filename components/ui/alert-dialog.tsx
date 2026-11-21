"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AlertDialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType | undefined>(undefined);

export function AlertDialog({
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
    <AlertDialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  const context = React.useContext(AlertDialogContext);
  if (!context) throw new Error("AlertDialogTrigger must be used inside AlertDialog");

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => context.onOpenChange(true),
    });
  }

  return (
    <button type="button" onClick={() => context.onOpenChange(true)}>
      {children}
    </button>
  );
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(AlertDialogContext);
  if (!context) throw new Error("AlertDialogContent must be used inside AlertDialog");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          "relative z-50 w-full max-w-lg rounded-3xl bg-card border border-border p-6 md:p-8 text-card-foreground shadow-2xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 pb-4 text-left", className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-6 gap-2", className)}
      {...props}
    />
  );
}

export function AlertDialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-2xl font-semibold text-foreground", className)} {...props} />;
}

export function AlertDialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-base text-muted-foreground", className)} {...props} />;
}

export function AlertDialogCancel({
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(AlertDialogContext);
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-full border border-border bg-transparent px-6 py-2 text-base font-medium text-foreground hover:bg-muted transition-colors active:scale-[0.98]",
        className
      )}
      onClick={(e) => {
        context?.onOpenChange(false);
        onClick?.(e);
      }}
      {...props}
    />
  );
}

export function AlertDialogAction({
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 py-2 text-base font-medium text-primary-foreground hover:opacity-90 transition-colors active:scale-[0.98]",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
      }}
      {...props}
    />
  );
}
