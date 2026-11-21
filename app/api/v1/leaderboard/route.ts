import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { LeaderboardService } from "@/modules/leaderboard/service";
import { Setting } from "@/modules/settings/model";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "leaderboard.view",
  handler: async ({ session, req }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const grade = searchParams.get("grade") || undefined;
    const centerId = session.centerId;

    if (!centerId) {
      return { data: { snapshot: null, top10: [], myEntry: null, canSync: false } };
    }

    // Check privacy setting for students
    if (session.role === "student") {
      const showSetting = await Setting.findOne({
        centerId: new mongoose.Types.ObjectId(centerId),
        key: "leaderboard.showToStudents",
      }).lean();

      if (showSetting && showSetting.value === false) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Leaderboard is disabled for students at this center" } },
          { status: 403 }
        );
      }
    }

    const result = await LeaderboardService.getLeaderboard({
      centerId,
      grade,
      studentId: session.role === "student" ? session.sub : undefined,
    });

    return {
      data: {
        ...result,
        canSync: session.role === "super_admin",
      },
    };
  },
});
