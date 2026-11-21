import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { User } from "@/modules/users/model";
import { ClassModel } from "@/modules/classes/model";
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

      const [totalStudents, totalTeachers, totalClasses, marksWaitingCount] = await Promise.all([
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

      const treemapData = [
        { name: "Excellent", size: Math.max(1, excellent), count: excellent },
        { name: "Good", size: Math.max(1, medium), count: medium },
        { name: "Needs Help", size: Math.max(1, weak), count: weak },
      ];

      // Average performance over time
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
            { $limit: 8 },
          ])
        : [];

      const trendData =
        trendAgg.length > 0
          ? trendAgg.map((t) => ({ period: t._id, score: Math.round(t.score) }))
          : [
              { period: "Week 1", score: 65 },
              { period: "Week 2", score: 68 },
              { period: "Week 3", score: 72 },
              { period: "Week 4", score: 74 },
            ];

      // Recent activity
      const recentActivities = (await AuditLog.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()) as unknown as LeanAuditLog[];

      return {
        data: {
          stats: {
            totalStudents,
            totalTeachers,
            classesToday: totalClasses,
            marksWaiting: marksWaitingCount,
          },
          treemapData,
          trendData,
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

      const [pendingMarksCount, sessionsTodayCount, completedMarksCount] = await Promise.all([
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
      ]);

      return {
        data: {
          stats: {
            pendingMarksCount,
            sessionsTodayCount,
            completedMarksCount,
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
