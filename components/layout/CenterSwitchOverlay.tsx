"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { CenterSwitchLoader } from "./CenterSwitchLoader";

export function CenterSwitchOverlay() {
  const { isSwitchingCenter, switchingCenterName } = useAuth();

  if (!isSwitchingCenter) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 text-foreground backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-6">
        {/* Custom Glowing Orbit Center Switch Loader with Animated 'Switching' Letters */}
        <CenterSwitchLoader />

        {/* Dynamic Center Title & Information */}
        <div className="space-y-2 pt-2">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Switching to {switchingCenterName || "Center"}.
          </h2>
          <p className="text-base text-muted-foreground max-w-sm">
            Updating students, classes, staff, and records for this education center. This will take a while
          </p>
        </div>
      </div>
    </div>
  );
}
