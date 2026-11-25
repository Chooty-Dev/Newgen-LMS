import { Attendance, AttendanceSession } from "./model";
import {
  ClassScheduleShape,
  ScheduledAttendanceItem,
  ScheduledCategory,
  ScheduledSessionState,
  matchAssessmentSessionForDate,
  matchClassScheduleForDate,
  parseUtcDayOfWeek,
} from "./schedule";
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
    const dayOfWeek = parseUtcDayOfWeek(params.date);

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

    const candidateClasses = await ClassModel.find(classQuery).select("_id name schedule").lean();
    const todayClasses = candidateClasses.filter(
      (c) => matchClassScheduleForDate(c.schedule as ClassScheduleShape, params.date).scheduled
    );
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

  /**
   * Lists all classes and assessments (exams, tests, quizzes, papers, assignments)
   * scheduled on the given date and assigned to the requesting staff/teacher, enriched
   * with enrolled student counts and current attendance progress/finalization status.
   */
  static async getScheduledSessionsForDate(params: {
    centerId: string;
    date: string; // "YYYY-MM-DD"
    staffId?: string;
    teacherId?: string;
  }) {
    await connectDB();
    if (!params.centerId || !mongoose.isValidObjectId(params.centerId)) {
      throw new Error("Valid centerId is required");
    }

    const centerObjId = new mongoose.Types.ObjectId(params.centerId);
    const dayOfWeek = parseUtcDayOfWeek(params.date);

    // 1. Build Class query scoped to center, date schedule, and staff/teacher assignment
    const classQuery: Record<string, unknown> = {
      centerId: centerObjId,
      deletedAt: null,
      status: "active",
      $or: [
        { "schedule.type": "regular", "schedule.regular.daysOfWeek": dayOfWeek },
        { "schedule.type": "special", "schedule.special.sessions.date": params.date },
      ],
    };

    if (params.staffId && mongoose.isValidObjectId(params.staffId)) {
      classQuery.staffIds = new mongoose.Types.ObjectId(params.staffId);
    } else if (params.teacherId && mongoose.isValidObjectId(params.teacherId)) {
      classQuery.teacherId = new mongoose.Types.ObjectId(params.teacherId);
    }

    // 2. Build Assessment query scoped to center, session date, and evaluator/teacher assignment
    const assessmentQuery: Record<string, unknown> = {
      centerId: centerObjId,
      deletedAt: null,
      "sessions.date": params.date,
    };

    if (params.staffId && mongoose.isValidObjectId(params.staffId)) {
      assessmentQuery.evaluatorIds = new mongoose.Types.ObjectId(params.staffId);
    } else if (params.teacherId && mongoose.isValidObjectId(params.teacherId)) {
      const teacherObjId = new mongoose.Types.ObjectId(params.teacherId);
      const teacherClasses = await ClassModel.find({
        centerId: centerObjId,
        teacherId: teacherObjId,
        deletedAt: null,
      })
        .select("_id")
        .lean();
      assessmentQuery.$or = [
        { createdBy: teacherObjId },
        { classIds: { $in: teacherClasses.map((c) => c._id) } },
      ];
    }

    const [candidateClasses, candidateAssessments] = await Promise.all([
      ClassModel.find(classQuery)
        .populate("subjectId", "name code")
        .populate("teacherId", "name")
        .lean(),
      Assessment.find(assessmentQuery)
        .populate("subjectId", "name code")
        .populate("classIds", "name")
        .lean(),
    ]);

    const scheduledClasses = candidateClasses
      .map((c) => ({
        doc: c,
        match: matchClassScheduleForDate(c.schedule as ClassScheduleShape, params.date),
      }))
      .filter((entry) => entry.match.scheduled);

    const scheduledAssessments = candidateAssessments
      .map((a) => ({
        doc: a,
        match: matchAssessmentSessionForDate(a.sessions, params.date),
      }))
      .filter((entry) => entry.match.scheduled);

    const classObjectIds = scheduledClasses.map((c) => c.doc._id);
    const assessmentObjectIds = scheduledAssessments.map((a) => a.doc._id);
    const assessmentLinkedClassIds = scheduledAssessments.flatMap((a) =>
      ((a.doc.classIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId } | mongoose.Types.ObjectId>).map((c) =>
        typeof c === "object" && c !== null && "_id" in c ? c._id : c
      )
    );

    const allClassIdsForEnrollment = Array.from(
      new Map(
        [...classObjectIds, ...assessmentLinkedClassIds].map((id) => [id.toString(), id])
      ).values()
    );

    // 3. Batch-fetch enrollments and existing AttendanceSession docs for this date
    const sessionFilters: Array<Record<string, unknown>> = [];
    if (classObjectIds.length > 0) {
      sessionFilters.push({ kind: "class", refId: { $in: classObjectIds } });
    }
    if (assessmentObjectIds.length > 0) {
      sessionFilters.push({ kind: "assessment", refId: { $in: assessmentObjectIds } });
    }

    const [enrollments, existingSessions] = await Promise.all([
      allClassIdsForEnrollment.length > 0
        ? Enrollment.find({
            classId: { $in: allClassIdsForEnrollment },
            status: "active",
          })
            .select("classId studentId")
            .lean()
        : Promise.resolve([]),
      sessionFilters.length > 0
        ? AttendanceSession.find({
            centerId: centerObjId,
            date: params.date,
            $or: sessionFilters,
          }).lean()
        : Promise.resolve([]),
    ]);

    // Map unique enrolled student IDs per classId
    const classStudentsMap = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const cKey = e.classId.toString();
      let set = classStudentsMap.get(cKey);
      if (!set) {
        set = new Set<string>();
        classStudentsMap.set(cKey, set);
      }
      set.add(e.studentId.toString());
    }

    // Batch-fetch Attendance status breakdown for existing sessions on this date
    const existingSessionIds = existingSessions.map((s) => s._id);
    const attendanceCounts =
      existingSessionIds.length > 0
        ? await Attendance.aggregate<{
            _id: { sessionId: mongoose.Types.ObjectId; status: string };
            count: number;
          }>([
            { $match: { sessionId: { $in: existingSessionIds } } },
            {
              $group: {
                _id: { sessionId: "$sessionId", status: "$status" },
                count: { $sum: 1 },
              },
            },
          ])
        : [];

    const sessionStatusCounts = new Map<
      string,
      { present: number; late: number; absent: number; excused: number }
    >();
    for (const row of attendanceCounts) {
      const sKey = row._id.sessionId.toString();
      const bucket = sessionStatusCounts.get(sKey) || {
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
      };
      const stat = row._id.status as keyof typeof bucket;
      if (stat in bucket) {
        bucket[stat] = row.count;
      }
      sessionStatusCounts.set(sKey, bucket);
    }

    const sessionByKey = new Map(
      existingSessions.map((s) => [`${s.kind}:${s.refId.toString()}`, s])
    );

    const resolveSessionCounts = (
      kind: "class" | "assessment",
      refId: string,
      expectedCount: number
    ) => {
      const ses = sessionByKey.get(`${kind}:${refId}`);
      const counts = ses ? sessionStatusCounts.get(ses._id.toString()) : undefined;
      const presentCount = counts?.present || 0;
      const lateCount = counts?.late || 0;
      const absentCount = counts?.absent || 0;
      const excusedCount = counts?.excused || 0;
      const markedCount = presentCount + lateCount + absentCount + excusedCount;
      const isFinalized = ses?.status === "finalized";
      const sessionStatus: ScheduledSessionState = isFinalized
        ? "finalized"
        : ses || markedCount > 0
        ? "draft"
        : "pending";
      return {
        expectedCount,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        markedCount,
        sessionStatus,
        isFinalized,
        finalizedAt: ses?.finalizedAt ? new Date(ses.finalizedAt).toISOString() : null,
      };
    };

    const classItems: ScheduledAttendanceItem[] = scheduledClasses.map(({ doc: c, match }) => {
      const sub = c.subjectId as unknown as { name?: string; code?: string } | null;
      const teach = c.teacherId as unknown as { name?: string } | null;
      const idStr = c._id.toString();
      const expectedCount = classStudentsMap.get(idStr)?.size || 0;
      return {
        id: idStr,
        kind: "class",
        category: "class",
        title: c.name,
        subject: sub ? `${sub.code || ""} - ${sub.name || ""}`.replace(/^ - | - $/g, "") : "Class",
        scheduleType: c.schedule?.type,
        teacherName: teach?.name || undefined,
        classNames: [c.name],
        date: params.date,
        startTime: match.startTime,
        endTime: match.endTime,
        ...resolveSessionCounts("class", idStr, expectedCount),
      };
    });

    const assessmentItems: ScheduledAttendanceItem[] = scheduledAssessments.map(
      ({ doc: a, match }) => {
        const sub = a.subjectId as unknown as { name?: string; code?: string } | null;
        const linkedClasses = (a.classIds || []) as unknown as Array<{
          _id: mongoose.Types.ObjectId;
          name?: string;
        }>;
        const uniqueStudents = new Set<string>();
        const classNames: string[] = [];
        for (const cls of linkedClasses) {
          const cid = cls._id.toString();
          if (cls.name) classNames.push(cls.name);
          const clsStudents = classStudentsMap.get(cid);
          if (clsStudents) {
            for (const stId of clsStudents) uniqueStudents.add(stId);
          }
        }
        const idStr = a._id.toString();
        return {
          id: idStr,
          kind: "assessment",
          category: (a.type || "exam") as ScheduledCategory,
          title: a.title,
          subject: sub ? `${sub.code || ""} - ${sub.name || ""}`.replace(/^ - | - $/g, "") : "Assessment",
          classNames,
          date: params.date,
          startTime: match.startTime,
          endTime: match.endTime,
          ...resolveSessionCounts("assessment", idStr, uniqueStudents.size),
        };
      }
    );

    const sessions = [...classItems, ...assessmentItems].sort((a, b) => {
      const timeCmp = a.startTime.localeCompare(b.startTime);
      return timeCmp !== 0 ? timeCmp : a.title.localeCompare(b.title);
    });

    const classesCount = classItems.length;
    const examsCount = assessmentItems.filter((item) => item.category === "exam").length;
    const testsCount = assessmentItems.filter(
      (item) => item.category === "test" || item.category === "mcq_quiz" || item.category === "paper"
    ).length;
    const assignmentsCount = assessmentItems.filter((item) => item.category === "assignment").length;
    const finalizedCount = sessions.filter((item) => item.isFinalized).length;

    return {
      date: params.date,
      dayOfWeek,
      summary: {
        totalScheduled: sessions.length,
        classesCount,
        examsCount,
        testsCount,
        assignmentsCount,
        assessmentsCount: assessmentItems.length,
        finalizedCount,
        pendingCount: sessions.length - finalizedCount,
      },
      sessions,
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
    const dayOfWeek = parseUtcDayOfWeek(params.date);

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

  // Session view: Get session students list for a class or assessment on a date
  static async getSessionView(params: {
    kind?: "class" | "assessment";
    refId?: string;
    classId?: string;
    assessmentId?: string;
    date: string;
  }) {
    await connectDB();
    const kind = params.kind || (params.assessmentId ? "assessment" : "class");
    const targetId = params.refId || (kind === "assessment" ? params.assessmentId : params.classId);
    if (!targetId || !mongoose.isValidObjectId(targetId)) {
      throw new Error("Valid classId or assessmentId is required");
    }
    const objId = new mongoose.Types.ObjectId(targetId);

    if (kind === "assessment") {
      const assessmentDoc = await Assessment.findById(objId).lean();
      if (!assessmentDoc) throw new Error("Assessment not found");

      // Find enrollments for classes attached to this assessment
      const enrollments = await Enrollment.find({
        classId: { $in: assessmentDoc.classIds },
        status: "active",
      })
        .populate("studentId", "name username")
        .populate("classId", "name")
        .lean();

      // Deduplicate students
      const studentMap = new Map<
        string,
        { studentId: string; name: string; username: string; classId: string; className: string }
      >();
      for (const e of enrollments) {
        const u = e.studentId as unknown as { _id: mongoose.Types.ObjectId; name: string; username: string } | null;
        const c = e.classId as unknown as { _id: mongoose.Types.ObjectId; name: string } | null;
        if (u && !studentMap.has(u._id.toString())) {
          studentMap.set(u._id.toString(), {
            studentId: u._id.toString(),
            name: u.name || "Student",
            username: u.username || "",
            classId: (c?._id || e.classId).toString(),
            className: c?.name || "Class",
          });
        }
      }

      const session = await AttendanceSession.findOne({
        kind: "assessment",
        refId: objId,
        date: params.date,
      }).lean();

      const records = session
        ? await Attendance.find({ sessionId: session._id }).lean()
        : [];
      const recordMap = new Map(records.map((r) => [r.studentId.toString(), r]));

      const students = Array.from(studentMap.values()).map((s) => {
        const rec = recordMap.get(s.studentId);
        return {
          studentId: s.studentId,
          name: s.name,
          username: s.username,
          classId: s.classId,
          className: s.className,
          status: rec?.status || "unmarked",
        };
      });

      return {
        session: {
          id: session?._id?.toString() || null,
          title: assessmentDoc.title,
          name: assessmentDoc.title,
          type: assessmentDoc.type,
          kind: "assessment" as const,
          date: params.date,
          isFinalized: session?.status === "finalized",
          finalizedAt: session?.finalizedAt || null,
        },
        students,
      };
    } else {
      const classDoc = await ClassModel.findById(objId).lean();
      if (!classDoc) throw new Error("Class not found");

      // Get enrolled students
      const enrollments = await Enrollment.find({ classId: objId, status: "active" })
        .populate("studentId", "name username")
        .lean();

      // Get existing session record if any
      const session = await AttendanceSession.findOne({
        kind: "class",
        refId: objId,
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
          classId: objId.toString(),
          className: classDoc.name,
          status: rec?.status || "unmarked",
        };
      });

      return {
        session: {
          id: session?._id?.toString() || null,
          title: classDoc.name,
          className: classDoc.name,
          name: classDoc.name,
          kind: "class" as const,
          date: params.date,
          isFinalized: session?.status === "finalized",
          finalizedAt: session?.finalizedAt || null,
        },
        students,
      };
    }
  }

  // Save session batch attendance & finalize (auto absent for unmarked)
  static async saveSessionBatch(
    actorId: string,
    centerId: string,
    data: {
      kind: "class" | "assessment";
      refId: string;
      date: string;
      startTime?: string;
      endTime?: string;
      records: Array<{
        studentId: string;
        classId?: string;
        status: "present" | "absent" | "late" | "excused";
      }>;
      finalize: boolean;
    },
    options?: {
      canEditFinalized?: boolean;
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

    // Guard: If already finalized, require edit permission
    if (session && session.status === "finalized" && !options?.canEditFinalized) {
      throw new Error("This attendance session has already been finalized and cannot be modified.");
    }

    if (!session) {
      session = await AttendanceSession.create({
        centerId: new mongoose.Types.ObjectId(centerId),
        kind: data.kind,
        refId: refObjId,
        date: data.date,
        startTime: data.startTime || "08:00",
        endTime: data.endTime || "18:00",
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
    // Resolve classId if missing for assessment records
    let defaultClassId = data.kind === "class" ? refObjId : undefined;
    if (data.kind === "assessment" && !defaultClassId) {
      const assessmentDoc = await Assessment.findById(refObjId).select("classIds").lean();
      if (assessmentDoc?.classIds?.[0]) {
        defaultClassId = assessmentDoc.classIds[0];
      }
    }

    const ops = data.records.map((r) => {
      const recordClassId =
        r.classId && mongoose.isValidObjectId(r.classId)
          ? new mongoose.Types.ObjectId(r.classId)
          : defaultClassId || refObjId;

      return {
        updateOne: {
          filter: {
            sessionId: session._id,
            studentId: new mongoose.Types.ObjectId(r.studentId),
          },
          update: {
            $set: {
              classId: recordClassId,
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
      };
    });

    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    // Auto absent logic: if finalize is true, mark any expected enrolled students who were not in records as absent
    if (data.finalize) {
      let targetClassIds: mongoose.Types.ObjectId[] = [];
      if (data.kind === "class") {
        targetClassIds = [refObjId];
      } else {
        const assessmentDoc = await Assessment.findById(refObjId).select("classIds").lean();
        targetClassIds = (assessmentDoc?.classIds || []) as mongoose.Types.ObjectId[];
      }

      if (targetClassIds.length > 0) {
        const enrollments = await Enrollment.find({
          classId: { $in: targetClassIds },
          status: "active",
        })
          .select("studentId classId")
          .lean();

        const markedIds = new Set(data.records.map((r) => r.studentId));
        const unmarkedStudents = new Map<string, mongoose.Types.ObjectId>();
        for (const e of enrollments) {
          const sId = e.studentId.toString();
          if (!markedIds.has(sId) && !unmarkedStudents.has(sId)) {
            unmarkedStudents.set(sId, e.classId as mongoose.Types.ObjectId);
          }
        }

        const unmarkedOps = Array.from(unmarkedStudents.entries()).map(([sId, clsId]) => ({
          updateOne: {
            filter: {
              sessionId: session._id,
              studentId: new mongoose.Types.ObjectId(sId),
            },
            update: {
              $set: {
                classId: clsId,
                assessmentId: data.kind === "assessment" ? refObjId : undefined,
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
                description: `Attendance finalized for ${data.kind} (${data.date})`,
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
