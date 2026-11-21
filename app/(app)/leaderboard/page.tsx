"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { StudentLeaderboardView } from "@/components/student/StudentLeaderboardView";
import { StaffLeaderboardView } from "@/components/leaderboard/StaffLeaderboardView";

export default function LeaderboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === "student") {
    return <StudentLeaderboardView />;
  }

  return <StaffLeaderboardView />;
}
