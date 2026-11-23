import { Mark } from "./model";
import { Assessment } from "@/modules/exams/model";
import { Enrollment } from "@/modules/classes/model";
import { Setting } from "@/modules/settings/model";
import { saveDailyPerformanceSnapshot } from "@/modules/analysis/engine/score";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export function calculateGrade(
  percentage: number,
  scale?: Array<{ grade: string; min: number }>
): string {
  const defaultScale = [
    { grade: "A", min: 75 },
    { grade: "B", min: 65 },
    { grade: "C", min: 50 },
    { grade: "S", min: 35 },
    { grade: "F", min: 0 },
  ];
  const activeScale = scale || defaultScale;
  for (const item of activeScale) {
    if (percentage >= item.min) return item.grade;
  }
  return "F";
}

export class MarkService {
  // Get assessment with student grid for evaluation (assigned to evaluator or teacher)
  static async getAssessmentForEvaluation(assessmentId: string) {
    await connectDB();
    const a = await Assessment.findById(assessmentId)
      .populate("subjectId", "name code")
      .populate("classIds", "name")
      .lean();

    if (!a || a.deletedAt) throw new Error("Assessment not found");

    // Fetch enrolled students across all assigned classes
    const enrollments = await Enrollment.find({
      classId: { $in: a.classIds },
      status: "active",
    })
      .populate("studentId", "name username")
      .lean();

    // Deduplicate students
    const studentMap = new Map();
    for (const e of enrollments) {
      const u = e.studentId as unknown as { _id: mongoose.Types.ObjectId; name: string; username: string } | null;
      if (u && !studentMap.has(u._id.toString())) {
        studentMap.set(u._id.toString(), {
          studentId: u._id.toString(),
          name: u.name,
          username: u.username,
          classId: e.classId.toString(),
        });
      }
    }

    // Fetch any existing marks records
    const existingMarks = await Mark.find({ assessmentId: a._id }).lean();
    const markMap = new Map(existingMarks.map((m) => [m.studentId.toString(), m]));

    const entries = Array.from(studentMap.values()).map((st) => {
      const m = markMap.get(st.studentId);
      return {
        studentId: st.studentId,
        studentName: st.name,
        username: st.username,
        classId: st.classId,
        score: m?.score ?? 0,
        totalMarks: a.totalMarks,
        percentage: m?.percentage ?? 0,
        grade: m?.grade ?? "F",
        attendanceStatus: m?.attendanceStatus ?? "present",
        remarks: m?.remarks ?? "",
        status: m?.status ?? "draft",
      };
    });

    return {
      assessment: {
        id: a._id.toString(),
        title: a.title,
        type: a.type,
        totalMarks: a.totalMarks,
        passMark: a.passMark,
        subject: (a.subjectId as unknown as { name: string; code: string })?.name,
        classes: (a.classIds as unknown as Array<{ name: string }>).map((c) => c.name),
        status: a.status,
      },
      entries,
    };
  }

  // Save draft or submit marks
  static async evaluateMarks(
    actorId: string,
    centerId: string,
    assessmentId: string,
    status: "draft" | "submitted",
    entries: Array<{
      studentId: string;
      classId: string;
      score: number;
      attendanceStatus: "present" | "absent" | "excused";
      remarks?: string;
    }>
  ) {
    await connectDB();
    const a = await Assessment.findById(assessmentId);
    if (!a || a.deletedAt) throw new Error("Assessment not found");

    // Fetch custom grade scale from settings if present
    const gradeScaleSetting = await Setting.findOne({
      centerId: new mongoose.Types.ObjectId(centerId),
      key: "gradeScale",
    }).lean();
    const gradeScale = gradeScaleSetting?.value as Array<{ grade: string; min: number }> | undefined;

    const totalMarks = a.totalMarks;
    const now = new Date();
    const actorObjId = new mongoose.Types.ObjectId(actorId);

    const ops = entries.map((entry) => {
      const percentage = totalMarks > 0 ? Math.round((entry.score / totalMarks) * 100) : 0;
      const grade = calculateGrade(percentage, gradeScale);

      return {
        updateOne: {
          filter: {
            assessmentId: a._id,
            studentId: new mongoose.Types.ObjectId(entry.studentId),
          },
          update: {
            $set: {
              classId: new mongoose.Types.ObjectId(entry.classId),
              subjectId: a.subjectId,
              type: a.type,
              score: entry.score,
              totalMarks,
              percentage,
              grade,
              attendanceStatus: entry.attendanceStatus,
              remarks: entry.remarks || "",
              status,
              evaluatedBy: actorObjId,
              evaluatedAt: now,
            },
          },
          upsert: true,
        },
      };
    });

    await Mark.bulkWrite(ops);

    // Update assessment status
    if (status === "submitted") {
      a.status = "completed";
      await a.save();

      // Trigger daily snapshot recomputation for submitted students
      try {
        const studentIds = Array.from(new Set(entries.map((e) => e.studentId)));
        await Promise.all(
          studentIds.map((sId) =>
            saveDailyPerformanceSnapshot(sId, now, [
              {
                date: now.toISOString().slice(0, 10),
                description: `${a.title} marks submitted`,
                type: "mark_submitted",
              },
            ]).catch(() => null)
          )
        );
      } catch {
        // Continue even if snapshot fails
      }
    } else {
      a.status = "waiting_marks";
      await a.save();
    }

    return { success: true, count: entries.length };
  }

  // List student marks
  static async listMarks(params: {
    studentId?: string;
    classId?: string;
    subjectId?: string;
    type?: string;
    status?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {};

    if (params.studentId && params.studentId !== "all" && mongoose.isValidObjectId(params.studentId)) {
      query.studentId = new mongoose.Types.ObjectId(params.studentId);
    }
    if (params.classId && params.classId !== "all" && mongoose.isValidObjectId(params.classId)) {
      query.classId = new mongoose.Types.ObjectId(params.classId);
    }
    if (params.subjectId && params.subjectId !== "all" && mongoose.isValidObjectId(params.subjectId)) {
      query.subjectId = new mongoose.Types.ObjectId(params.subjectId);
    }
    if (params.type && params.type !== "all") query.type = params.type;
    if (params.status && params.status !== "all") query.status = params.status;

    const marks = await Mark.find(query)
      .populate("assessmentId", "title sessions")
      .populate("subjectId", "name code")
      .populate("classId", "name")
      .populate("studentId", "name username")
      .sort({ createdAt: -1 })
      .lean();

    return {
      data: marks.map((m) => {
        const a = m.assessmentId as unknown as { title: string; sessions?: Array<{ date: string }> } | null;
        const sub = m.subjectId as unknown as { name: string; code: string } | null;
        const c = m.classId as unknown as { name: string } | null;
        const s = m.studentId as unknown as { name: string; username: string } | null;

        return {
          id: m._id.toString(),
          title: a?.title || "Assessment",
          date: a?.sessions?.[0]?.date || m.createdAt.toISOString().slice(0, 10),
          subject: sub ? `${sub.code} - ${sub.name}` : "-",
          class: c?.name || "-",
          studentName: s?.name || "Student",
          studentUsername: s?.username || "",
          type: m.type,
          score: m.score,
          totalMarks: m.totalMarks,
          percentage: m.percentage,
          grade: m.grade,
          attendanceStatus: m.attendanceStatus,
          remarks: m.remarks,
          status: m.status,
          evaluatedAt: m.evaluatedAt,
        };
      }),
    };
  }
}
