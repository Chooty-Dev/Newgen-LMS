import { Attendance, AttendanceSession } from "./model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { saveDailyPerformanceSnapshot } from "@/modules/analysis/engine/score";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export class AttendanceService {
  // Get attendance overview for a date (expected today, attended, absent, left to mark)
  static async getDailyOverview(params: {
    centerId: string;
    date: string; // "YYYY-MM-DD"
    staffId?: string;
  }) {
    await connectDB();
    const centerObjId = new mongoose.Types.ObjectId(params.centerId);

    // 1. Find all active classes and assessments on this day
    const dayOfWeek = new Date(params.date).getDay(); // 0-6

    const classQuery: Record<string, unknown> = {
      centerId: centerObjId,
      deletedAt: null,
      status: "active",
      $or: [
        { "schedule.type": "regular", "schedule.regular.daysOfWeek": dayOfWeek },
        { "schedule.type": "special", "schedule.special.sessions.date": params.date },
      ],
    };

    if (params.staffId) {
      classQuery.staffIds = new mongoose.Types.ObjectId(params.staffId);
    }

    const todayClasses = await ClassModel.find(classQuery).select("_id name").lean();
    const classIds = todayClasses.map((c) => c._id);

    // Count expected students enrolled in today's classes
    const expectedStudents = await Enrollment.countDocuments({
      classId: { $in: classIds },
      status: "active",
    });

    // 2. Count actual records on this date
    const records = await Attendance.find({
      classId: { $in: classIds },
      date: params.date,
    }).lean();

    const attended = records.filter((r) => r.status === "present" || r.status === "late").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const leftToMark = Math.max(0, expectedStudents - records.length);

    return {
      expectedToday: expectedStudents,
      attended,
      absent,
      leftToMark,
      classesToday: todayClasses.length,
    };
  }

  // Search by student: return all sessions that the student has on this day
  static async getStudentDaySchedule(params: {
    centerId: string;
    studentId: string;
    date: string;
  }) {
    await connectDB();
    const sId = new mongoose.Types.ObjectId(params.studentId);
    const dayOfWeek = new Date(params.date).getDay();

    // 1. Get student's enrolled classes
    const enrollments = await Enrollment.find({ studentId: sId, status: "active" }).select("classId");
    const classIds = enrollments.map((e) => e.classId);

    // 2. Classes active on this date
    const classes = await ClassModel.find({
      _id: { $in: classIds },
      deletedAt: null,
      $or: [
        { "schedule.type": "regular", "schedule.regular.daysOfWeek": dayOfWeek },
        { "schedule.type": "special", "schedule.special.sessions.date": params.date },
      ],
    })
      .populate("subjectId", "name code")
      .lean();

    // 3. Assessments on this date for student's classes
    const assessments = await Assessment.find({
      classIds: { $in: classIds },
      "sessions.date": params.date,
      deletedAt: null,
    })
      .populate("subjectId", "name code")
      .lean();

    // 4. Existing attendance status for today
    const attendanceRecords = await Attendance.find({
      studentId: sId,
      date: params.date,
    }).lean();

    const attendanceMap = new Map(
      attendanceRecords.map((r) => [
        r.assessmentId ? `a:${r.assessmentId.toString()}` : `c:${r.classId.toString()}`,
        r,
      ])
    );

    const items = [
      ...classes.map((c) => {
        const att = attendanceMap.get(`c:${c._id.toString()}`);
        const reg = c.schedule?.regular;
        const sub = c.subjectId as unknown as { name: string; code: string } | null;
        return {
          type: "class" as const,
          refId: c._id.toString(),
          classId: c._id.toString(),
          title: c.name,
          subject: sub ? `${sub.code} - ${sub.name}` : "-",
          time: reg ? `${reg.startTime} - ${reg.endTime}` : "Scheduled",
          attendanceStatus: att?.status || "unmarked",
          attendanceId: att?._id?.toString(),
        };
      }),
      ...assessments.map((a) => {
        const att = attendanceMap.get(`a:${a._id.toString()}`);
        const s = a.sessions.find((ses) => ses.date === params.date);
        const sub = a.subjectId as unknown as { name: string; code: string } | null;
        return {
          type: "assessment" as const,
          refId: a._id.toString(),
          classId: a.classIds[0]?.toString() || "",
          assessmentId: a._id.toString(),
          title: a.title,
          subject: sub ? `${sub.code} - ${sub.name}` : "-",
          time: s ? `${s.startTime} - ${s.endTime}` : "Scheduled",
          attendanceStatus: att?.status || "unmarked",
          attendanceId: att?._id?.toString(),
        };
      }),
    ];

    return { items };
  }

  // Mark student as attended for a single class or assessment session
  static async markSingleAttendance(
    actorId: string,
    centerId: string,
    data: {
      studentId: string;
      classId: string;
      assessmentId?: string;
      date: string;
      status: "present" | "absent" | "late" | "excused";
      source?: "manual" | "nfc";
    }
  ) {
    await connectDB();
    const kind = data.assessmentId ? "assessment" : "class";
    const refId = data.assessmentId
      ? new mongoose.Types.ObjectId(data.assessmentId)
      : new mongoose.Types.ObjectId(data.classId);

    // Get or create session
    let session = await AttendanceSession.findOne({
      kind,
      refId,
      date: data.date,
    });

    if (!session) {
      session = await AttendanceSession.create({
        centerId: new mongoose.Types.ObjectId(centerId),
        kind,
        refId,
        date: data.date,
        startTime: "08:00",
        endTime: "18:00",
        status: "open",
      });
    }

    const record = await Attendance.findOneAndUpdate(
      {
        sessionId: session._id,
        studentId: new mongoose.Types.ObjectId(data.studentId),
      },
      {
        classId: new mongoose.Types.ObjectId(data.classId),
        assessmentId: data.assessmentId ? new mongoose.Types.ObjectId(data.assessmentId) : undefined,
        date: data.date,
        status: data.status,
        source: data.source || "manual",
        markedBy: new mongoose.Types.ObjectId(actorId),
        markedAt: new Date(),
      },
      { upsert: true, returnDocument: "after" }
    );

    return record;
  }

  // Session view: Get session students list for a class on a date
  static async getSessionView(params: {
    classId: string;
    date: string;
  }) {
    await connectDB();
    const cId = new mongoose.Types.ObjectId(params.classId);

    const classDoc = await ClassModel.findById(cId).lean();
    if (!classDoc) throw new Error("Class not found");

    // Get enrolled students
    const enrollments = await Enrollment.find({ classId: cId, status: "active" })
      .populate("studentId", "name username")
      .lean();

    // Get existing session record if any
    const session = await AttendanceSession.findOne({
      kind: "class",
      refId: cId,
      date: params.date,
    }).lean();

    const records = session
      ? await Attendance.find({ sessionId: session._id }).lean()
      : [];
    const recordMap = new Map(records.map((r) => [r.studentId.toString(), r]));

    const students = enrollments.map((e) => {
      const u = e.studentId as unknown as { _id: mongoose.Types.ObjectId; name: string; username: string } | null;
      const rec = u ? recordMap.get(u._id.toString()) : null;
      return {
        studentId: u?._id.toString() || "",
        name: u?.name || "Student",
        username: u?.username || "",
        status: rec?.status || "unmarked",
      };
    });

    return {
      session: {
        id: session?._id?.toString() || null,
        className: classDoc.name,
        date: params.date,
        isFinalized: session?.status === "finalized",
      },
      students,
    };
  }

  // Save session batch attendance & finalize (auto absent for unmarked)
  static async saveSessionBatch(
    actorId: string,
    centerId: string,
    data: {
      kind: "class" | "assessment";
      refId: string;
      date: string;
      startTime: string;
      endTime: string;
      records: Array<{
        studentId: string;
        classId: string;
        status: "present" | "absent" | "late" | "excused";
      }>;
      finalize: boolean;
    }
  ) {
    await connectDB();
    const refObjId = new mongoose.Types.ObjectId(data.refId);
    const actorObjId = new mongoose.Types.ObjectId(actorId);

    let session = await AttendanceSession.findOne({
      kind: data.kind,
      refId: refObjId,
      date: data.date,
    });

    if (!session) {
      session = await AttendanceSession.create({
        centerId: new mongoose.Types.ObjectId(centerId),
        kind: data.kind,
        refId: refObjId,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.finalize ? "finalized" : "open",
        finalizedBy: data.finalize ? actorObjId : undefined,
        finalizedAt: data.finalize ? new Date() : undefined,
      });
    } else if (data.finalize) {
      session.status = "finalized";
      session.finalizedBy = actorObjId;
      session.finalizedAt = new Date();
      await session.save();
    }

    const now = new Date();
    const ops = data.records.map((r) => ({
      updateOne: {
        filter: {
          sessionId: session._id,
          studentId: new mongoose.Types.ObjectId(r.studentId),
        },
        update: {
          $set: {
            classId: new mongoose.Types.ObjectId(r.classId),
            assessmentId: data.kind === "assessment" ? refObjId : undefined,
            date: data.date,
            status: r.status,
            source: "manual",
            markedBy: actorObjId,
            markedAt: now,
          },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    // Auto absent logic: if finalize is true, mark any expected enrolled students who were not in records as absent
    if (data.finalize && data.kind === "class") {
      const enrollments = await Enrollment.find({
        classId: refObjId,
        status: "active",
      }).select("studentId");
      const markedIds = new Set(data.records.map((r) => r.studentId));

      const unmarkedOps = enrollments
        .filter((e) => !markedIds.has(e.studentId.toString()))
        .map((e) => ({
          updateOne: {
            filter: { sessionId: session._id, studentId: e.studentId },
            update: {
              $set: {
                classId: refObjId,
                date: data.date,
                status: "absent" as const,
                source: "manual" as const,
                markedBy: actorObjId,
                markedAt: now,
              },
            },
            upsert: true,
          },
        }));

      if (unmarkedOps.length > 0) {
        await Attendance.bulkWrite(unmarkedOps);
      }
    }

    // Trigger daily snapshot recomputation for students in finalized session
    if (data.finalize) {
      try {
        const studentIds = data.records.map((r) => r.studentId);
        await Promise.all(
          studentIds.map((sId) =>
            saveDailyPerformanceSnapshot(sId, data.date, [
              {
                date: data.date,
                description: `Attendance finalized for ${data.date}`,
                type: "attendance_finalized",
              },
            ]).catch(() => null)
          )
        );
      } catch {
        // Continue even if snapshot fails
      }
    }

    return { success: true };
  }
}
