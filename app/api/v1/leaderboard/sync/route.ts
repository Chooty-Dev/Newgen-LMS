import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { LeaderboardService } from "@/modules/leaderboard/service";

export const POST = defineRoute({
  permission: "leaderboard.sync",
  rateLimit: { limit: 3, windowSeconds: 3600 },
  auditAction: "leaderboard.sync",
  auditResource: { type: "Leaderboard" },
  auditSummary: ({ session }) => `${session?.name} manually synced the center leaderboard`,
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    if (session.role !== "super_admin") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only Super Admins can manually sync the leaderboard" } },
        { status: 403 }
      );
    }

    const centerId = session.centerId;
    if (!centerId) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Center ID not found in session" } },
        { status: 400 }
      );
    }

    const res = await LeaderboardService.syncLeaderboard(centerId, "manual", session.sub);
    return { data: { success: true, count: res.count, snapshot: res.snapshot } };
  },
});
