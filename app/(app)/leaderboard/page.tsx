"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { StudentLeaderboardView } from "@/components/student/StudentLeaderboardView";
import { StaffLeaderboardView } from "@/components/leaderboard/StaffLeaderboardView";
import { AdminLeaderboardView } from "@/components/admin/AdminLeaderboardView";

export default function LeaderboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "student") {
    return <StudentLeaderboardView />;
  }

  if (user.role === "admin" || user.role === "super_admin") {
    return <AdminLeaderboardView />;
  }

  return <StaffLeaderboardView />;
}
