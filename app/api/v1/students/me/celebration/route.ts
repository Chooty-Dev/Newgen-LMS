import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { LeaderboardSnapshot, LeaderboardEntry, UserPreference } from "@/modules/leaderboard/model";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "dashboard.view",
  handler: async ({ session }) => {
    if (!session || session.role !== "student") {
      return { data: { shouldCelebrate: false } };
    }

    const userId = new mongoose.Types.ObjectId(session.sub);
    const centerId = session.centerId ? new mongoose.Types.ObjectId(session.centerId) : null;
    if (!centerId) return { data: { shouldCelebrate: false } };

    const latestSnapshot = await LeaderboardSnapshot.findOne({ centerId, isLatest: true }).lean();
    if (!latestSnapshot) return { data: { shouldCelebrate: false } };

    const entry = await LeaderboardEntry.findOne({
      snapshotId: latestSnapshot._id,
      studentId: userId,
    }).lean();

    if (!entry || entry.rank > 10) {
      return { data: { shouldCelebrate: false } };
    }

    const pref = await UserPreference.findOne({ userId }).lean();
    if (pref?.lastCelebratedSyncId?.toString() === latestSnapshot._id.toString()) {
      return { data: { shouldCelebrate: false } };
    }

    return {
      data: {
        shouldCelebrate: true,
        rank: entry.rank,
        snapshotId: latestSnapshot._id.toString(),
        name: session.name.split(" ")[0] || session.name,
      },
    };
  },
});

export const POST = defineRoute({
  permission: "dashboard.view",
  handler: async ({ session, req }) => {
    if (!session || session.role !== "student") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Students only" } }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { snapshotId, rank } = body;
    if (!snapshotId || typeof rank !== "number") {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Missing data" } }, { status: 400 });
    }

    const userId = new mongoose.Types.ObjectId(session.sub);
    await UserPreference.findOneAndUpdate(
      { userId },
      {
        $set: {
          lastCelebratedSyncId: new mongoose.Types.ObjectId(snapshotId),
          lastCelebratedRank: rank,
        },
      },
      { upsert: true }
    );

    return { data: { success: true } };
  },
});
