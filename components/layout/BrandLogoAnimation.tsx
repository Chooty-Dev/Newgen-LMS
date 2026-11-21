"use client";

import * as React from "react";
import { GraduationCap } from "lucide-react";

export function BrandLogoAnimation({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Pulse Wave Ring */}
      <div className="absolute size-36 rounded-full border border-primary/20 animate-ping duration-1000 opacity-25" />

      {/* Rotating Dashed Accent Orbit */}
      <div className="absolute size-32 rounded-full border-2 border-dashed border-border/80 animate-[spin_8s_linear_infinite]" />

      {/* Orbiting Satellite Dot */}
      <div className="absolute size-32 animate-[spin_4s_linear_infinite]">
        <div className="size-3 rounded-full bg-primary shadow-sm" />
      </div>

      {/* Middle Glowing Container */}
      <div className="relative size-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xl transition-transform active:scale-95">
        <GraduationCap className="size-10 stroke-[2] animate-pulse" />
      </div>
    </div>
  );
}
