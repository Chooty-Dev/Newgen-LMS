import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { PerformanceSnapshot } from "@/modules/analysis/model";
import { computeStudentScore } from "@/modules/analysis/engine/score";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "dashboard.view",
  handler: async ({ session, params, req }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const targetStudentId = params.id === "me" ? session.sub : params.id;

    // Policy check: Student can ONLY view their own score history
    if (session.role === "student" && targetStudentId !== session.sub) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only view your own score history" } },
        { status: 403 }
      );
    }

    if (!mongoose.isValidObjectId(targetStudentId)) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid student ID" } }, { status: 400 });
    }

    const sId = new mongoose.Types.ObjectId(targetStudentId);
    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get("range") || "30d";

    let daysCount = 30;
    if (rangeParam === "7d") daysCount = 7;
    else if (rangeParam === "90d") daysCount = 90;

    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - (daysCount - 1));
    const startDateStr = startDate.toISOString().slice(0, 10);

    // Fetch existing snapshots in range
    const snapshots = await PerformanceSnapshot.find({
      studentId: sId,
      date: { $gte: startDateStr },
    })
      .sort({ date: 1 })
      .lean();

    // Map by date string
    const snapshotMap = new Map<string, typeof snapshots[0]>();
    snapshots.forEach((s) => snapshotMap.set(s.date, s));

    // Get current live score as fallback / today value
    const liveScoreResult = await computeStudentScore(sId);
    let runningScore = liveScoreResult.displayScore ?? 75;

    // Build day-by-day continuous history array
    const historyPoints: Array<{
      date: string;
      displayDate: string;
      score: number;
      hasEvent: boolean;
      eventText?: string;
    }> = [];

    // Find first available score to seed runningScore backwards if needed
    if (snapshots.length > 0 && typeof snapshots[0].score === "number") {
      runningScore = Math.round(snapshots[0].score);
    }

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const displayDate = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });

      const snap = snapshotMap.get(dateStr);
      let dayScore = runningScore;
      let hasEvent = false;
      let eventText: string | undefined = undefined;

      if (snap && typeof snap.score === "number") {
        dayScore = Math.round(snap.score);
        runningScore = dayScore;
        if (snap.events && snap.events.length > 0) {
          hasEvent = true;
          eventText = snap.events.map((e) => e.description).join(", ");
        }
      }

      // Today's point uses live display score if available
      if (i === daysCount - 1 && liveScoreResult.displayScore !== null) {
        dayScore = liveScoreResult.displayScore;
      }

      historyPoints.push({
        date: dateStr,
        displayDate,
        score: dayScore,
        hasEvent,
        eventText,
      });
    }

    // Calculate score difference over period
    const startScore = historyPoints[0]?.score ?? runningScore;
    const endScore = historyPoints[historyPoints.length - 1]?.score ?? runningScore;
    const diff = endScore - startScore;

    let periodName = "this month";
    if (daysCount === 7) periodName = "this week";
    if (daysCount === 90) periodName = "the last 3 months";

    let summarySentence = `Your score is holding steady ${periodName}.`;
    if (diff > 0) {
      summarySentence = `Your score went up ${diff} points ${periodName}. Well done!`;
    } else if (diff < 0) {
      summarySentence = `Your score dipped by ${Math.abs(diff)} points ${periodName}. A little revision will bring it right back up!`;
    }

    return {
      data: {
        points: historyPoints,
        diff,
        summarySentence,
        currentScore: endScore,
        range: rangeParam,
      },
    };
  },
});
