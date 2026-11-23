import { Assessment, IAssessment, AssessmentType, AssessmentStatus } from "./model";
import { ClassModel } from "@/modules/classes/model";
import { connectDB } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import mongoose from "mongoose";

import { Mark } from "@/modules/marks/model";
import { saveDailyPerformanceSnapshot } from "@/modules/analysis/engine/score";

export class AssessmentService {
  static async listAssessments(params: {
    centerId: string;
    teacherId?: string;
    evaluatorId?: string;
    type?: string;
    status?: string;
    subjectId?: string;
    search?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      centerId: new mongoose.Types.ObjectId(params.centerId),
      deletedAt: null,
    };

    if (params.type && params.type !== "all") query.type = params.type;
    if (params.status && params.status !== "all") query.status = params.status;
    if (params.subjectId && params.subjectId !== "all" && mongoose.isValidObjectId(params.subjectId)) {
      query.subjectId = new mongoose.Types.ObjectId(params.subjectId);
    }
    if (params.search) query.title = { $regex: params.search, $options: "i" };

    if (params.evaluatorId) {
      query.evaluatorIds = new mongoose.Types.ObjectId(params.evaluatorId);
    } else if (params.teacherId) {
      const myClasses = await ClassModel.find({
        teacherId: new mongoose.Types.ObjectId(params.teacherId),
        deletedAt: null,
      }).select("_id");
      query.$or = [
        { createdBy: new mongoose.Types.ObjectId(params.teacherId) },
        { classIds: { $in: myClasses.map((c) => c._id) } },
      ];
    }

    const assessments = await Assessment.find(query)
      .populate("subjectId", "name code")
      .populate("classIds", "name")
      .populate("evaluatorIds", "name username email")
      .sort({ "sessions.0.date": -1, createdAt: -1 })
      .lean();

    return {
      data: assessments.map((a) => {
        const sub = a.subjectId as unknown as { name: string; code: string } | null;
        const classes = (a.classIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
        const evaluators = (a.evaluatorIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string; username: string; email?: string }>;

        return {
          id: a._id.toString(),
          slug: a.slug || a._id.toString(),
          title: a.title,
          type: a.type,
          subject: sub ? `${sub.code} - ${sub.name}` : "-",
          subjectId: a.subjectId ? (a.subjectId as unknown as { _id: mongoose.Types.ObjectId })._id?.toString() : "",
          classes: classes.map((c) => c.name),
          classIds: classes.map((c) => c._id.toString()),
          evaluators: evaluators.map((e) => e.name),
          evaluatorIds: evaluators.map((e) => e._id.toString()),
          totalMarks: a.totalMarks,
          passMark: a.passMark,
          weight: a.weight,
          dateMode: a.dateMode,
          sessions: a.sessions,
          status: a.status || "scheduled",
          createdAt: a.createdAt,
        };
      }),
    };
  }

  static async getAssessmentDetails(idOrSlug: string) {
    await connectDB();
    let query: Record<string, unknown> = { deletedAt: null };

    if (mongoose.isValidObjectId(idOrSlug)) {
      query = { $or: [{ _id: new mongoose.Types.ObjectId(idOrSlug) }, { slug: idOrSlug }], deletedAt: null };
    } else {
      query = { slug: idOrSlug, deletedAt: null };
    }

    const a = await Assessment.findOne(query)
      .populate("subjectId", "name code")
      .populate("classIds", "name capacity enrolledCount")
      .populate("evaluatorIds", "name username email phone")
      .lean();

    if (!a) throw new Error("Assessment not found");

    const sub = a.subjectId as unknown as { _id: mongoose.Types.ObjectId; name: string; code: string } | null;
    const classes = (a.classIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
    const evaluators = (a.evaluatorIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string; username: string; email?: string; phone?: string }>;

    // Fetch marks submitted for this assessment
    const marks = await Mark.find({ assessmentId: a._id })
      .populate("studentId", "name username email")
      .sort({ score: -1 })
      .lean();

    const submittedCount = marks.filter((m) => m.status === "submitted").length;
    const scores = marks.map((m) => m.percentage || 0);
    const average = scores.length > 0 ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length) : 0;
    const highest = scores.length > 0 ? Math.max(...scores) : 0;
    const lowest = scores.length > 0 ? Math.min(...scores) : 0;

    const gradeDistribution = {
      A: marks.filter((m) => m.grade === "A").length,
      B: marks.filter((m) => m.grade === "B").length,
      C: marks.filter((m) => m.grade === "C").length,
      S: marks.filter((m) => m.grade === "S").length,
      F: marks.filter((m) => m.grade === "F").length,
    };

    const studentMarks = marks.map((m) => {
      const st = m.studentId as unknown as { _id: mongoose.Types.ObjectId; name: string; username: string; email?: string } | null;
      return {
        id: m._id.toString(),
        studentId: st?._id?.toString() || "",
        studentName: st?.name || "Student",
        studentUsername: st?.username || "",
        score: m.score,
        totalMarks: m.totalMarks,
        percentage: m.percentage,
        grade: m.grade,
        status: m.status,
        attendanceStatus: m.attendanceStatus,
        remarks: m.remarks || "",
        evaluatedAt: m.evaluatedAt,
      };
    });

    const formattedAssessment = {
      id: a._id.toString(),
      slug: a.slug || a._id.toString(),
      title: a.title,
      type: a.type,
      subject: sub ? `${sub.code} - ${sub.name}` : "-",
      subjectId: sub?._id?.toString() || "",
      totalMarks: a.totalMarks,
      passMark: a.passMark,
      weight: a.weight,
      dateMode: a.dateMode,
      sessions: a.sessions,
      status: a.status || "scheduled",
      createdAt: a.createdAt,
    };

    return {
      assessment: formattedAssessment,
      classes: classes.map((c) => ({ id: c._id.toString(), name: c.name })),
      staff: evaluators.map((e) => ({
        id: e._id.toString(),
        name: e.name,
        username: e.username,
        email: e.email || "",
        phone: e.phone || "",
      })),
      results: {
        totalEvaluated: marks.length,
        submittedCount,
        average,
        highest,
        lowest,
        gradeDistribution,
        studentMarks,
      },
    };
  }

  static async createAssessment(centerId: string, actorId: string, data: {
    title: string;
    type: AssessmentType;
    subjectId: string;
    classIds: string[];
    totalMarks: number;
    passMark: number;
    weight: number;
    dateMode: "single" | "multiple";
    sessions: Array<{ date: string; startTime: string; endTime: string }>;
    evaluatorIds: string[];
    status?: AssessmentStatus;
  }) {
    await connectDB();
    const slug = generateSlug(data.title);

    const created = await Assessment.create({
      centerId: new mongoose.Types.ObjectId(centerId),
      title: data.title,
      slug,
      type: data.type,
      subjectId: new mongoose.Types.ObjectId(data.subjectId),
      classIds: data.classIds.map((id) => new mongoose.Types.ObjectId(id)),
      totalMarks: data.totalMarks,
      passMark: data.passMark,
      weight: data.weight,
      dateMode: data.dateMode,
      sessions: data.sessions,
      evaluatorIds: data.evaluatorIds.map((id) => new mongoose.Types.ObjectId(id)),
      status: data.status || "scheduled",
      createdBy: new mongoose.Types.ObjectId(actorId),
    });
    return created;
  }

  static async assignEvaluator(id: string, staffId: string) {
    await connectDB();
    return Assessment.findByIdAndUpdate(
      id,
      { $addToSet: { evaluatorIds: new mongoose.Types.ObjectId(staffId) } },
      { new: true }
    );
  }

  static async unassignEvaluator(id: string, staffId: string) {
    await connectDB();
    return Assessment.findByIdAndUpdate(
      id,
      { $pull: { evaluatorIds: new mongoose.Types.ObjectId(staffId) } },
      { new: true }
    );
  }

  static async updateAssessment(id: string, data: Partial<IAssessment>) {
    await connectDB();
    const updated = await Assessment.findByIdAndUpdate(id, data, { returnDocument: "after" });
    if (!updated || updated.deletedAt) throw new Error("Assessment not found");
    return updated;
  }

  static async deleteAssessment(id: string, actorId: string) {
    await connectDB();
    const aObjId = new mongoose.Types.ObjectId(id);

    await Assessment.findByIdAndUpdate(aObjId, {
      deletedAt: new Date(),
      deletedBy: new mongoose.Types.ObjectId(actorId),
    });

    // Recompute snapshots for students affected by this deleted assessment
    try {
      const marks = await Mark.find({ assessmentId: aObjId }).select("studentId").lean();
      const studentIds = Array.from(new Set(marks.map((m) => m.studentId.toString())));
      await Promise.all(
        studentIds.map((sId) =>
          saveDailyPerformanceSnapshot(sId, new Date(), [
            {
              date: new Date().toISOString().slice(0, 10),
              description: "Assessment deleted",
              type: "assessment_deleted",
            },
          ]).catch(() => null)
        )
      );
    } catch {
      // Continue even if snapshot recompute fails
    }
  }
}
