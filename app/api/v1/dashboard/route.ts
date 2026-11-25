import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { User } from "@/modules/users/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Center } from "@/modules/centers/model";
import { Assessment } from "@/modules/exams/model";
import { Mark } from "@/modules/marks/model";
import { AttendanceSession, Attendance } from "@/modules/attendance/model";
import { Announcement } from "@/modules/announcements/model";
import { PerformanceSnapshot } from "@/modules/analysis/model";
import { AuditLog } from "@/core/audit/model";

interface LeanAnnouncement {
  _id: { toString: () => string };
  title: string;
  body: string;
  pinned: boolean;
  createdAt?: Date;
}

interface LeanAuditLog {
  _id: { toString: () => string };
  actorName?: string;
  summary: string;
  result: string;
  createdAt?: Date;
}

interface LeanAssessment {
  _id: { toString: () => string };
  title: string;
  type: string;
  subjectId?: { name?: string };
  sessions?: Array<{ date: string }>;
}

interface LeanSession {
  _id: { toString: () => string };
  refId?: { name?: string };
  date: string;
  status: string;
}

interface LeanAttendance {
  _id: { toString: () => string };
  date: string;
  status: string;
}

export const GET = defineRoute({
  permission: "dashboard.view",
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await connectDB();
    const role = session.role;
    const userId = session.sub;

    const centerObjId =
      session.centerId && mongoose.isValidObjectId(session.centerId)
        ? new mongoose.Types.ObjectId(session.centerId)
        : null;

    // Fetch latest 3 announcements
    const announcements = (await Announcement.find({
      deletedAt: null,
      ...(centerObjId ? { centerId: centerObjId } : {}),
    })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(3)
      .lean()) as unknown as LeanAnnouncement[];

    const formattedAnnouncements = announcements.map((a) => ({
      id: a._id.toString(),
      title: a.title,
      content: a.body,
      isPinned: a.pinned,
      date: a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : "",
    }));

    if (role === "super_admin" || role === "admin") {
      const centerClassIds = (await ClassModel.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
      }).select("_id")).map((c) => c._id);

      const centerAssessmentIds = (await Assessment.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
      }).select("_id")).map((a) => a._id);

      const markFilter = centerObjId
        ? {
          $or: [
            { classId: { $in: centerClassIds } },
            { assessmentId: { $in: centerAssessmentIds } },
          ],
        }
        : {};

      const [totalStudents, totalTeachers, totalClasses, marksWaitingCount, staffCount, centersCount, examsCount] = await Promise.all([
        User.countDocuments({
          role: "student",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        User.countDocuments({
          role: "teacher",
          deletedAt: null,
          ...(centerObjId ? { $or: [{ centerId: centerObjId }, { assignedCenterIds: centerObjId }] } : {}),
        }),
        ClassModel.countDocuments({
          status: "active",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        Mark.countDocuments({
          status: "draft",
          ...markFilter,
        }),
        User.countDocuments({
          role: "staff",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        Center.countDocuments({ deletedAt: null }),
        Assessment.countDocuments({
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
      ]);

      // Weak / Medium / Excellent distribution
      const centerStudents = await User.find({
        role: "student",
        deletedAt: null,
        ...(centerObjId ? { centerId: centerObjId } : {}),
      }).select("_id");
      const centerStudentIds = centerStudents.map((s) => s._id);

      const latestSnapshots = centerStudentIds.length > 0 || !centerObjId
        ? await PerformanceSnapshot.aggregate([
          ...(centerObjId ? [{ $match: { studentId: { $in: centerStudentIds } } }] : []),
          { $sort: { period: -1 } },
          { $group: { _id: "$studentId", group: { $first: "$group" }, score: { $first: "$score" } } },
        ])
        : [];

      const excellent = latestSnapshots.filter((s) => s.group === "excellent").length;
      const medium = latestSnapshots.filter((s) => s.group === "medium").length;
      const weak = latestSnapshots.filter((s) => s.group === "weak").length;

      const avgScoreFromSnapshots =
        latestSnapshots.length > 0
          ? Math.round(
              (latestSnapshots.reduce((sum, s) => sum + (Number(s.score) || 0), 0) / latestSnapshots.length) * 10
            ) / 10
          : 0;

      const treemapData = [
        { name: "Excellent", size: Math.max(0, excellent), count: excellent },
        { name: "Good", size: Math.max(0, medium), count: medium },
        { name: "Needs Help", size: Math.max(0, weak), count: weak },
      ];

      // Average performance over time (real snapshots only, fallback to real submitted marks grouped by assessment)
      const trendAgg = centerStudentIds.length > 0 || !centerObjId
        ? await PerformanceSnapshot.aggregate([
          ...(centerObjId ? [{ $match: { studentId: { $in: centerStudentIds } } }] : []),
          {
            $group: {
              _id: "$period",
              score: { $avg: "$score" },
            },
          },
          { $sort: { _id: 1 } },
          { $limit: 12 },
        ])
        : [];

      let trendData = trendAgg.map((t) => ({ period: String(t._id), score: Math.round(t.score) }));

      if (trendData.length === 0 && centerAssessmentIds.length > 0) {
        const markTrend = await Mark.aggregate([
          { $match: { assessmentId: { $in: centerAssessmentIds }, status: "submitted", deletedAt: null } },
          {
            $group: {
              _id: "$assessmentId",
              avgScore: { $avg: "$score" },
              date: { $first: "$createdAt" },
            },
          },
          { $sort: { date: 1 } },
          { $limit: 8 },
        ]);
        trendData = markTrend.map((m, idx) => ({
          period: m.date ? new Date(m.date).toISOString().slice(5, 10) : `Eval ${idx + 1}`,
          score: Math.round(m.avgScore || 0),
        }));
      }

      // Today's attendance overview (real data)
      const todayStr = new Date().toISOString().slice(0, 10);
      const dayOfWeek = new Date().getDay();
      const todayClasses = await ClassModel.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
        status: "active",
        $or: [
          { "schedule.type": "regular", "schedule.regular.daysOfWeek": dayOfWeek },
          { "schedule.type": "special", "schedule.special.sessions.date": todayStr },
        ],
      })
        .select("_id")
        .lean();

      const todayClassIds = todayClasses.map((c) => c._id);
      const [expectedToday, todayAttendance] =
        todayClassIds.length > 0
          ? await Promise.all([
              Enrollment.countDocuments({ classId: { $in: todayClassIds }, status: "active" }),
              Attendance.find({ classId: { $in: todayClassIds }, date: todayStr }).select("status").lean(),
            ])
          : [0, []];
      const attendedToday = todayAttendance.filter((r) => r.status === "present" || r.status === "late").length;
      const attendanceRateToday =
        expectedToday > 0 ? Math.round((attendedToday / expectedToday) * 100) : 0;

      // Active classes breakdown for overview table
      const activeClassesRaw = await ClassModel.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
      })
        .populate("subjectId", "name code")
        .populate("teacherId", "name")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();

      const activeClassObjectIds = activeClassesRaw.map((c) => c._id);
      const enrollmentCounts =
        activeClassObjectIds.length > 0
          ? await Enrollment.aggregate([
              { $match: { classId: { $in: activeClassObjectIds }, status: "active" } },
              { $group: { _id: "$classId", count: { $sum: 1 } } },
            ])
          : [];
      const enrolledMap = new Map(
        enrollmentCounts.map((e) => [e._id.toString(), Number(e.count) || 0])
      );

      const classBreakdown = activeClassesRaw
        .map((c) => {
          const sub = c.subjectId as unknown as { name?: string; code?: string } | null;
          const tch = c.teacherId as unknown as { name?: string } | null;
          const enrolled = enrolledMap.get(c._id.toString()) || 0;
          const cap = c.capacity || 30;
          const occupancy = cap > 0 ? Math.round((enrolled / cap) * 100) : 0;
          return {
            id: c._id.toString(),
            slug: c.slug || c._id.toString(),
            name: c.name,
            subject: sub?.code || sub?.name || "Subject",
            teacher: tch?.name || "Faculty",
            enrolledCount: enrolled,
            capacity: cap,
            occupancy,
            status: c.status,
          };
        })
        .sort((a, b) => b.enrolledCount - a.enrolledCount)
        .slice(0, 5);

      // Recent assessments breakdown
      const recentAssessmentsRaw = await Assessment.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
      })
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const assessmentBreakdown = recentAssessmentsRaw.map((a) => {
        const sub = a.subjectId as unknown as { name?: string; code?: string } | null;
        return {
          id: a._id.toString(),
          slug: a.slug || a._id.toString(),
          title: a.title,
          type: a.type,
          subject: sub?.code || sub?.name || "Subject",
          totalMarks: a.totalMarks,
          status: a.status,
          date: a.sessions?.[0]?.date || "",
        };
      });

      // Recent activity
      const recentActivities = (await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .lean()) as unknown as LeanAuditLog[];

      return {
        data: {
          stats: {
            totalStudents,
            totalTeachers,
            classesToday: totalClasses,
            marksWaiting: marksWaitingCount,
            staffCount,
            centersCount,
            examsCount,
            averageScore: avgScoreFromSnapshots,
            attendanceRateToday,
            expectedToday,
            attendedToday,
          },
          treemapData,
          trendData,
          classBreakdown,
          assessmentBreakdown,
          recentActivities: recentActivities.map((log) => ({
            id: log._id.toString(),
            actorName: log.actorName || "System",
            summary: log.summary,
            result: log.result,
            time: log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
          })),
          announcements: formattedAnnouncements,
        },
      };
    }

    if (role === "teacher") {
      // Teacher statistics
      const classes = await ClassModel.find({
        teacherId: userId,
        deletedAt: null,
        ...(centerObjId ? { centerId: centerObjId } : {}),
      }).lean();

      return {
        data: {
          myClassesCount: classes.length,
          announcements: formattedAnnouncements,
        },
      };
    }

    if (role === "staff") {
      const todayStr = new Date().toISOString().slice(0, 10);

      // Pending assessments to evaluate
      const pendingAssessments = (await Assessment.find({
        status: { $in: ["scheduled", "ongoing", "waiting_marks"] },
        deletedAt: null,
        ...(centerObjId ? { centerId: centerObjId } : {}),
      })
        .populate("subjectId", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()) as unknown as LeanAssessment[];

      // Attendance sessions today
      const todaySessions = (await AttendanceSession.find({
        date: todayStr,
        ...(centerObjId ? { centerId: centerObjId } : {}),
      })
        .populate("refId", "name")
        .limit(5)
        .lean()) as unknown as LeanSession[];

      const centerClassIds = (await ClassModel.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
      }).select("_id")).map((c) => c._id);

      const centerAssessmentIds = (await Assessment.find({
        ...(centerObjId ? { centerId: centerObjId } : {}),
        deletedAt: null,
      }).select("_id")).map((a) => a._id);

      const markFilter = centerObjId
        ? {
          $or: [
            { classId: { $in: centerClassIds } },
            { assessmentId: { $in: centerAssessmentIds } },
          ],
        }
        : {};

      const [pendingMarksCount, sessionsTodayCount, completedMarksCount, examsCount, testsCount, quizzesCount, assignmentsCount] = await Promise.all([
        Mark.countDocuments({
          status: "draft",
          ...markFilter,
        }),
        AttendanceSession.countDocuments({
          date: todayStr,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        Mark.countDocuments({
          status: "submitted",
          ...markFilter,
        }),
        Assessment.countDocuments({
          type: "exam",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        Assessment.countDocuments({
          type: "test",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        Assessment.countDocuments({
          type: "mcq_quiz",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
        Assessment.countDocuments({
          type: "assignment",
          deletedAt: null,
          ...(centerObjId ? { centerId: centerObjId } : {}),
        }),
      ]);

      return {
        data: {
          stats: {
            pendingMarksCount,
            sessionsTodayCount,
            completedMarksCount,
            workload: {
              exams: examsCount,
              tests: testsCount,
              quizzes: quizzesCount,
              assignments: assignmentsCount,
            },
          },
          pendingAssessments: pendingAssessments.map((a) => ({
            id: a._id.toString(),
            title: a.title,
            type: a.type,
            subject: a.subjectId?.name || "Subject",
            date: a.sessions?.[0]?.date || "Upcoming",
          })),
          todaySessions: todaySessions.map((s) => ({
            id: s._id.toString(),
            title: s.refId?.name || "Session",
            date: s.date,
            status: s.status,
          })),
          announcements: formattedAnnouncements,
        },
      };
    }

    // Role: student
    const recentAttendance = (await Attendance.find({ studentId: userId })
      .populate("sessionId")
      .sort({ date: -1 })
      .limit(10)
      .lean()) as unknown as LeanAttendance[];

    return {
      data: {
        recentAttendance: recentAttendance.map((a) => ({
          id: a._id.toString(),
          date: a.date,
          className: "Class Session",
          status: a.status,
        })),
        announcements: formattedAnnouncements,
      },
    };
  },
});
