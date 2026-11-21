import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { computeStudentScore } from "@/modules/analysis/engine/score";
import { generateStudentMessages } from "@/modules/analysis/messages";
import { User } from "@/modules/users/model";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "dashboard.view",
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const targetStudentId = params.id === "me" ? session.sub : params.id;

    // Policy check: Student can ONLY view their own score explanation
    if (session.role === "student" && targetStudentId !== session.sub) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You can only view your own score explanation" } },
        { status: 403 }
      );
    }

    if (!mongoose.isValidObjectId(targetStudentId)) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid student ID" } }, { status: 400 });
    }

    const studentUser = await User.findById(targetStudentId).lean();
    if (!studentUser || studentUser.deletedAt) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Student not found" } }, { status: 404 });
    }

    const scoreResult = await computeStudentScore(targetStudentId);

    const mScore = scoreResult.marksScore ?? 0;
    const aScore = scoreResult.attendanceScore ?? 0;
    const wMarks = scoreResult.weights.marks;
    const wAtt = scoreResult.weights.attendance;

    const marksPoints = Math.round((mScore * wMarks) / 100);
    const attendancePoints = Math.round((aScore * wAtt) / 100);

    const msgRes = generateStudentMessages({
      studentId: targetStudentId,
      name: studentUser.name.split(" ")[0] || studentUser.name,
      score: scoreResult.score,
      displayScore: scoreResult.displayScore,
      attendanceScore: scoreResult.attendanceScore,
      bestSubject: scoreResult.subjects[0]?.subjectName,
      focusSubject: scoreResult.subjects[scoreResult.subjects.length - 1]?.subjectName,
    });

    return {
      data: {
        student: {
          id: studentUser._id.toString(),
          name: studentUser.name,
        },
        score: scoreResult.displayScore,
        marksScore: Math.round(mScore),
        attendanceScore: Math.round(aScore),
        weights: scoreResult.weights,
        marksPoints,
        attendancePoints,
        subjects: scoreResult.subjects,
        attendanceBreakdown: scoreResult.attendanceBreakdown,
        tip: msgRes.focusTip,
        summarySentence: `Marks ${Math.round(mScore)}, counts ${marksPoints} points. Coming to class ${Math.round(aScore)}, counts ${attendancePoints} points. Total ${scoreResult.displayScore ?? 0}.`,
      },
    };
  },
});
