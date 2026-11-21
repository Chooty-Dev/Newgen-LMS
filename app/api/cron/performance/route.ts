import { NextRequest, NextResponse } from "next/server";
import { User } from "@/modules/users/model";
import { saveDailyPerformanceSnapshot } from "@/modules/analysis/engine/score";
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
  const students = await User.find({ role: "student", deletedAt: null }).select("_id");

  let computedCount = 0;
  for (const s of students) {
    await saveDailyPerformanceSnapshot(s._id);
    computedCount++;
  }

  return NextResponse.json({
    success: true,
    computedSnapshots: computedCount,
  });
}
