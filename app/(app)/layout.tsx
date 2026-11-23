"use client";

import * as React from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { IdleTimeout } from "@/components/layout/IdleTimeout";
import { CenterSwitchOverlay } from "@/components/layout/CenterSwitchOverlay";
import { FloatingSignOut } from "@/components/layout/FloatingSignOut";
import { StudentShell } from "@/components/student/StudentShell";
import { TeacherShell } from "@/components/teacher/TeacherShell";

function AppContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [openDesktop, setOpenDesktop] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (isMobile) {
      setOpenMobile((prev) => !prev);
    } else {
      setOpenDesktop((prev) => !prev);
    }
  };

  // If role is student, use StudentShell
  if (user?.role === "student") {
    return <StudentShell>{children}</StudentShell>;
  }

  // If role is teacher, use dedicated TeacherShell
  if (user?.role === "teacher") {
    return <TeacherShell>{children}</TeacherShell>;
  }

  // Staff, Teacher, Admin, Super Admin Shell
  return (
    <>
      <div className="min-h-screen flex bg-background text-foreground font-sans">
        <AppSidebar
          openMobile={openMobile}
          setOpenMobile={setOpenMobile}
          openDesktop={openDesktop}
        />
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <AppHeader
            onToggleSidebar={handleToggleSidebar}
            sidebarOpen={isMobile ? openMobile : openDesktop}
          />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-28">
            {children}
          </main>
        </div>
      </div>
      <FloatingSignOut />
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppContent>{children}</AppContent>
      <IdleTimeout />
      <CenterSwitchOverlay />
    </AuthProvider>
  );
}
