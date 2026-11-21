"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "soft" | "hero";
}

export function BentoCard({
  variant = "soft",
  className,
  children,
  ...props
}: BentoCardProps) {
  return (
    <Card
      variant={variant}
      className={cn(
        "rounded-[2rem] p-6 md:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
