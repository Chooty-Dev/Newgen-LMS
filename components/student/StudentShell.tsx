"use client";

import * as React from "react";
import { StudentHeader } from "./StudentHeader";
import { StudentDock } from "./StudentDock";

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans w-full">
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-14 flex-1 flex flex-col">
        <StudentHeader />
        <main className="flex-1 pb-32 pt-2 w-full">
          {children}
        </main>
      </div>
      <StudentDock />
    </div>
  );
}
