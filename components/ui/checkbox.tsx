"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Checkbox({ checked = false, onCheckedChange, disabled = false, className, id }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "peer size-6 shrink-0 rounded-lg border border-border bg-card ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center transition-colors cursor-pointer",
        checked ? "bg-primary text-primary-foreground border-primary" : "hover:border-foreground/50",
        className
      )}
    >
      {checked && <Check className="size-4 stroke-[3]" />}
    </button>
  );
}
