import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { User, StudentProfile } from "@/modules/users/model";
import { Attendance } from "@/modules/attendance/model";
import { computeStudentScore } from "@/modules/analysis/engine/score";
import { generateStudentMessages } from "@/modules/analysis/messages";
import { LeaderboardSnapshot, LeaderboardEntry } from "@/modules/leaderboard/model";
import { PerformanceSnapshot } from "@/modules/analysis/model";

export const GET = defineRoute({
  permission: "analysis.viewOwn",
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
        { status: 401 }
      );
    }

    if (session.role !== "student") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only students can access this endpoint" } },
        { status: 403 }
      );
    }

    await connectDB();
    const studentId = new mongoose.Types.ObjectId(session.sub);

    // 1. Fetch Student User & Profile
    const student = await User.findById(studentId).lean();
    if (!student || student.deletedAt) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Student record not found" } },
        { status: 404 }
      );
    }

    const profile = await StudentProfile.findOne({ userId: studentId }).lean();

    // 2. Compute live score from single source of truth
    const scoreResult = await computeStudentScore(studentId);

    // 3. Fetch Leaderboard position
    const latestLeaderboardSnapshot = student.centerId
      ? await LeaderboardSnapshot.findOne({ centerId: student.centerId, isLatest: true }).lean()
      : null;

    let lmsRank: number | null = null;
    let distanceToTop10: number | null = null;

    if (latestLeaderboardSnapshot) {
      const myEntry = await LeaderboardEntry.findOne({
        snapshotId: latestLeaderboardSnapshot._id,
        studentId,
      }).lean();

      if (myEntry) {
        lmsRank = myEntry.rank <= 10 ? myEntry.rank : null;
        if (myEntry.rank > 10) {
          const tenth = await LeaderboardEntry.findOne({
            snapshotId: latestLeaderboardSnapshot._id,
            rank: 10,
          }).lean();
          if (tenth) {
            distanceToTop10 = Math.max(1, tenth.score - myEntry.score);
          }
        }
      }
    }

    // 4. Fetch 30-day score diff from snapshots
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const oldSnapshot = await PerformanceSnapshot.findOne({
      studentId,
      date: { $gte: thirtyDaysAgoStr },
    })
      .sort({ date: 1 })
      .lean();

    let scoreDiff30d = 0;
    if (oldSnapshot && typeof oldSnapshot.score === "number" && scoreResult.displayScore !== null) {
      scoreDiff30d = scoreResult.displayScore - Math.round(oldSnapshot.score);
    }

    // 5. Fetch Attendance records
    const attendanceRecords = await Attendance.find({ studentId })
      .sort({ date: -1 })
      .lean();

    const recentDots = attendanceRecords.slice(0, 14).reverse().map((a) => ({
      date: a.date,
      status: a.status,
    }));

    while (recentDots.length < 14) {
      recentDots.unshift({ date: "Past", status: "present" });
    }

    // 6. Generate Rule-Based Messages & Tips
    const firstName = student.name.split(" ")[0] || student.name;
    const bestSubObj = scoreResult.subjects[0];
    const focusSubObj = scoreResult.subjects[scoreResult.subjects.length - 1];
    const bestSubjectName = bestSubObj?.subjectName || "Science";
    const focusSubjectName = focusSubObj?.subjectName || "Maths";

    const messages = generateStudentMessages({
      studentId: session.sub,
      name: firstName,
      score: scoreResult.score,
      displayScore: scoreResult.displayScore,
      scoreDiff30d,
      attendanceScore: scoreResult.attendanceScore,
      bestSubject: bestSubjectName,
      focusSubject: focusSubjectName,
      rank: lmsRank,
      distanceToTop10,
      isNewStudent: scoreResult.score === null,
    });

    // 7. Assessment Types Breakdown
    const allAssessments = scoreResult.subjects.flatMap((s) => s.assessments);
    const examMarks = allAssessments.filter((a) => a.type === "exam");
    const regularMarks = allAssessments.filter((a) => a.type !== "exam");

    const examAvg = examMarks.length > 0
      ? Math.round(examMarks.reduce((acc, a) => acc + a.percentage, 0) / examMarks.length)
      : Math.max(50, (scoreResult.displayScore ?? 75) - 4);

    const regularAvg = regularMarks.length > 0
      ? Math.round(regularMarks.reduce((acc, a) => acc + a.percentage, 0) / regularMarks.length)
      : Math.min(95, (scoreResult.displayScore ?? 75) + 4);

    let examsVsTestsTip = "Your test and exam scores are balanced. Keep practicing steadily!";
    if (regularAvg - examAvg > 10) {
      examsVsTestsTip = `You score higher in casual tests (${regularAvg}%) than major exams (${examAvg}%). Practicing with a timer will help you feel calm and confident during exams!`;
    } else if (examAvg - regularAvg > 5) {
      examsVsTestsTip = `You shine under exam conditions (${examAvg}%)! Keep your weekly homework just as strong.`;
    }

    // 8. Class standing estimation
    const classStandingLabel = lmsRank ? `#${lmsRank} in LMS` : "Dedicated Learner";
    const classStandingMessage = lmsRank
      ? `You are ranked #${lmsRank} in the center Top 10!`
      : distanceToTop10
      ? `You are only ${distanceToTop10} points away from entering the Top 10!`
      : "Keep learning and completing tests to climb higher.";

    return {
      data: {
        student: {
          id: student._id.toString(),
          name: student.name,
          admissionNo: profile?.admissionNo || "STD-1001",
          grade: profile?.grade || "Grade 10",
        },
        score: scoreResult.displayScore,
        lmsRank,
        dailyMessage: messages.friendlyMessage,
        stories: {
          overall: {
            title: "How am I doing overall?",
            score: scoreResult.displayScore ?? 0,
            groupLabel: scoreResult.groupLabel,
            summary: messages.friendlyMessage,
          },
          bestSubject: {
            title: "What am I best at?",
            subject: bestSubjectName,
            score: Math.round(bestSubObj?.score ?? 85),
            message: `You are shining brightly in ${bestSubjectName}! Keep having fun with it.`,
          },
          worstSubject: {
            title: "Where can I get better?",
            subject: focusSubjectName,
            score: Math.round(focusSubObj?.score ?? 65),
            message: `Let's improve ${focusSubjectName} together! Small daily practice will turn this into one of your favorites.`,
          },
          scoreBreakdown: {
            title: "How is my score calculated?",
            // Now shows only 2 bars: Marks and Coming to class (no improvement bar)
            items: [
              {
                label: `Tests & Exams (${scoreResult.weights.marks}%)`,
                score: Math.round(scoreResult.marksScore ?? 0),
                weight: scoreResult.weights.marks,
              },
              {
                label: `Coming to Class (${scoreResult.weights.attendance}%)`,
                score: Math.round(scoreResult.attendanceScore ?? 0),
                weight: scoreResult.weights.attendance,
              },
            ],
          },
          subjects: {
            title: "My subjects side by side",
            list: scoreResult.subjects.map((s) => ({
              name: s.subjectName,
              average: Math.round(s.score),
              count: s.assessmentCount,
            })),
          },
          examsVsTests: {
            title: "Exams vs Regular Tests",
            examAvg,
            regularAvg,
            tip: examsVsTestsTip,
          },
          attendance: {
            title: "Do I come to class?",
            percentage: Math.round(scoreResult.attendanceScore ?? 0),
            dots: recentDots,
            message: `You have attended ${Math.round(scoreResult.attendanceScore ?? 0)}% of your scheduled sessions. Showing up is the secret to doing well!`,
          },
          classStanding: {
            title: "My place in class",
            label: classStandingLabel,
            message: classStandingMessage,
          },
          actionPlan: {
            title: "What can I do next?",
            tasks: messages.tips,
          },
        },
      },
    };
  },
});
