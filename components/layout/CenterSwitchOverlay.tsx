"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { CenterSwitchLoader } from "./CenterSwitchLoader";
import { Building2, Sparkles } from "lucide-react";

export function CenterSwitchOverlay() {
  const { isSwitchingCenter, switchingCenterName } = useAuth();

  if (!isSwitchingCenter) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 dark:bg-slate-950/95 text-foreground backdrop-blur-xl transition-all duration-300 animate-in fade-in"
    >
      <div className="flex flex-col items-center justify-center p-8 max-w-md w-full text-center space-y-6">
        {/* Custom Glowing Orbit Center Switch Loader with Animated 'Switching' Letters */}
        <div className="relative flex items-center justify-center">
          <CenterSwitchLoader />
        </div>

        {/* Dynamic Center Title & Information */}
        <div className="space-y-3 pt-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Switching to {switchingCenterName || "Center"}
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
            Please wait while we update all records for <strong>{switchingCenterName || "Center"}</strong>. This will take a while...
          </p>
        </div>
      </div>
    </div>
  );
}

export default CenterSwitchOverlay;
