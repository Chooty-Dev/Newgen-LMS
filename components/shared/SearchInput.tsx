import * as React from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search...",
  className,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="pl-12 pr-10 rounded-full h-12 text-base"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-1"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
