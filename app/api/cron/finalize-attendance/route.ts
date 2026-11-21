import { NextRequest, NextResponse } from "next/server";
import { AttendanceSession, Attendance } from "@/modules/attendance/model";
import { Enrollment } from "@/modules/classes/model";
import { connectDB } from "@/lib/db";
import { env } from "@/core/config/env";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ||
    new URL(req.url).searchParams.get("secret");

  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const today = new Date().toISOString().slice(0, 10);
  const currentTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

  // Find all open sessions whose end time has passed
  const openSessions = await AttendanceSession.find({
    status: "open",
    $or: [{ date: { $lt: today } }, { date: today, endTime: { $lte: currentTime } }],
  });

  let finalizedCount = 0;
  let autoAbsentCount = 0;

  for (const session of openSessions) {
    if (session.kind === "class") {
      const enrollments = await Enrollment.find({
        classId: session.refId,
        status: "active",
      }).select("studentId");

      const existingRecords = await Attendance.find({ sessionId: session._id }).select("studentId");
      const markedIds = new Set(existingRecords.map((r) => r.studentId.toString()));

      const unmarked = enrollments.filter((e) => !markedIds.has(e.studentId.toString()));

      const absentOps = unmarked.map((e) => ({
        updateOne: {
          filter: { sessionId: session._id, studentId: e.studentId },
          update: {
            $set: {
              classId: session.refId,
              date: session.date,
              status: "absent" as const,
              source: "manual" as const,
              markedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      if (absentOps.length > 0) {
        await Attendance.bulkWrite(absentOps);
        autoAbsentCount += absentOps.length;
      }
    }

    session.status = "finalized";
    session.finalizedAt = new Date();
    await session.save();
    finalizedCount++;
  }

  return NextResponse.json({
    success: true,
    finalizedSessions: finalizedCount,
    markedAbsentStudents: autoAbsentCount,
  });
}
