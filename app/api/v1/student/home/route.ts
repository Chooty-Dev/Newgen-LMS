import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { User, StudentProfile } from "@/modules/users/model";
import { Center } from "@/modules/centers/model";
import { Attendance } from "@/modules/attendance/model";
import { Announcement } from "@/modules/announcements/model";
import { Enrollment, ClassModel } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { computeStudentScore } from "@/modules/analysis/engine/score";
import { generateStudentMessages } from "@/modules/analysis/messages";
import { LeaderboardSnapshot, LeaderboardEntry } from "@/modules/leaderboard/model";
import { PerformanceSnapshot } from "@/modules/analysis/model";

export const GET = defineRoute({
  permission: "dashboard.view",
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

    const [profile, center] = await Promise.all([
      StudentProfile.findOne({ userId: studentId }).lean(),
      student.centerId ? Center.findById(student.centerId).lean() : null,
    ]);

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

    // 5. Fetch Attendance summary & streak
    const attendanceRecords = await Attendance.find({ studentId })
      .sort({ date: -1 })
      .lean();

    const recent14 = attendanceRecords.slice(0, 14);
    const attendedCount = recent14.filter(
      (a) => a.status === "present" || a.status === "excused"
    ).length;
    const totalCount = recent14.length || 1;
    const attendancePercentage = Math.round((attendedCount / totalCount) * 100);

    const dots = recent14.reverse().map((a) => ({
      date: a.date,
      status: a.status,
    }));

    while (dots.length < 14) {
      dots.unshift({ date: "Past", status: "present" });
    }

    let streakCount = 1;
    for (const record of attendanceRecords) {
      if (record.status === "present" || record.status === "excused") {
        streakCount++;
      } else {
        break;
      }
    }
    const streak = Math.min(14, Math.max(3, streakCount));

    // 6. Generate Rule-Based Messages & Tips
    const firstName = student.name.split(" ")[0] || student.name;
    const bestSubject = scoreResult.subjects[0]?.subjectName;
    const focusSubject = scoreResult.subjects[scoreResult.subjects.length - 1]?.subjectName;

    const messages = generateStudentMessages({
      studentId: session.sub,
      name: firstName,
      score: scoreResult.score,
      displayScore: scoreResult.displayScore,
      scoreDiff30d,
      attendanceScore: scoreResult.attendanceScore,
      bestSubject,
      focusSubject,
      streak,
      rank: lmsRank,
      distanceToTop10,
      perfectAttendance: attendancePercentage === 100 && totalCount >= 8,
      isNewStudent: scoreResult.score === null,
    });

    // 7. Next Up Items
    const enrollments = await Enrollment.find({
      studentId,
      status: "active",
    }).lean();
    const classIds = enrollments.map((e) => e.classId);

    const upcomingAssessments = await Assessment.find({
      classIds: { $in: classIds },
      status: { $in: ["scheduled", "ongoing"] },
      deletedAt: null,
    })
      .populate("subjectId", "name")
      .sort({ "sessions.0.date": 1 })
      .limit(2)
      .lean();

    const classes = await ClassModel.find({
      _id: { $in: classIds },
      status: "active",
      deletedAt: null,
    })
      .populate("subjectId", "name")
      .populate("teacherId", "name")
      .lean();

    const nextUpList: Array<{
      id: string;
      title: string;
      subtitle: string;
      time: string;
      kind: "class" | "test";
    }> = [];

    upcomingAssessments.forEach((a) => {
      const sess = a.sessions?.[0];
      const subj = (a.subjectId as unknown as { name?: string })?.name || "Assessment";
      nextUpList.push({
        id: a._id.toString(),
        title: a.title,
        subtitle: `${subj} • ${a.type.toUpperCase()}`,
        time: sess ? `${sess.date} at ${sess.startTime || "Morning"}` : "Upcoming soon",
        kind: "test",
      });
    });

    if (nextUpList.length < 2 && classes.length > 0) {
      classes.slice(0, 2 - nextUpList.length).forEach((c) => {
        const subj = (c.subjectId as unknown as { name?: string })?.name || "Subject";
        const teacher = (c.teacherId as unknown as { name?: string })?.name || "Teacher";
        nextUpList.push({
          id: c._id.toString(),
          title: c.name,
          subtitle: `${subj} • with ${teacher}`,
          time: "Regular Weekly Session",
          kind: "class",
        });
      });
    }

    // 8. Subject Highlights
    const subjectHighlights = scoreResult.subjects
      .map((s) => ({
        subject: s.subjectName,
        score: Math.round(s.score),
      }))
      .slice(0, 4);

    // 9. Latest News
    const centerFilter = student.centerId ? { centerId: student.centerId } : {};
    const latestAnnouncement = await Announcement.findOne({
      deletedAt: null,
      ...centerFilter,
    })
      .sort({ pinned: -1, createdAt: -1 })
      .lean();

    return {
      data: {
        student: {
          id: student._id.toString(),
          name: student.name,
          firstName,
          username: student.username,
          admissionNo: profile?.admissionNo || "STD-1001",
          grade: profile?.grade || "Grade 10",
          centerName: center?.name || "Education Center",
          avatarUrl: student.avatarUrl || null,
        },
        score: scoreResult.displayScore,
        overallScore: scoreResult.displayScore ?? 0,
        statusText: scoreResult.statusText,
        groupLabel: scoreResult.groupLabel,
        lmsRank,
        distanceToTop10,
        greeting: messages.friendlyMessage,
        focusTip: messages.focusTip,
        tips: messages.tips,
        nextUp: nextUpList,
        subjectHighlights,
        attendance: {
          dots,
          attendedCount,
          totalCount,
          percentage: attendancePercentage,
          message: `You attended ${attendedCount} out of ${totalCount} classes`,
        },
        streak,
        latestNews: latestAnnouncement
          ? {
              id: latestAnnouncement._id.toString(),
              title: latestAnnouncement.title,
              snippet:
                latestAnnouncement.body.length > 110
                  ? `${latestAnnouncement.body.slice(0, 110)}...`
                  : latestAnnouncement.body,
              date: latestAnnouncement.createdAt
                ? new Date(latestAnnouncement.createdAt).toISOString().slice(0, 10)
                : "",
              isPinned: latestAnnouncement.pinned,
            }
          : null,
      },
    };
  },
});
