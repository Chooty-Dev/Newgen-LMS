import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export interface FormLabelProps {
  label: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FormLabel({ label, required, optional, className, children }: FormLabelProps) {
  return (
    <div className={cn("flex items-center justify-between text-xs font-bold text-foreground mb-1.5", className)}>
      <span className="flex items-center gap-1">
        {children}
        <span>{label}</span>
        {required && <span className="text-rose-500 font-black ml-0.5">*</span>}
      </span>
      {optional && (
        <span className="text-[10px] text-muted-foreground font-normal bg-secondary px-2 py-0.5 rounded-full border border-border/50">
          Optional
        </span>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="text-[11px] font-semibold text-rose-500 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
      <AlertCircle className="size-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

export function inputErrorClass(hasError?: unknown): string {
  if (!hasError) return "";
  return "!border-rose-500 !ring-2 !ring-rose-500/20 !bg-rose-500/5 focus:!border-rose-500 focus:!ring-rose-500/30";
}
