import { NextRequest, NextResponse } from "next/server";
import { Center } from "@/modules/centers/model";
import { LeaderboardService } from "@/modules/leaderboard/service";
import { connectDB } from "@/lib/db";
import { env } from "@/core/config/env";

export async function GET(req: NextRequest) {
  const secret =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    new URL(req.url).searchParams.get("secret");

  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const centers = await Center.find({ deletedAt: null }).select("_id");

  let syncedCenters = 0;
  for (const c of centers) {
    await LeaderboardService.syncLeaderboard(c._id.toString(), "cron");
    syncedCenters++;
  }

  return NextResponse.json({
    success: true,
    syncedCenters,
  });
}
