import { Assessment, IAssessment, AssessmentType, AssessmentStatus } from "./model";
import { ClassModel } from "@/modules/classes/model";
import { connectDB } from "@/lib/db";
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

    if (params.type) query.type = params.type;
    if (params.status) query.status = params.status;
    if (params.subjectId) query.subjectId = new mongoose.Types.ObjectId(params.subjectId);
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
      .populate("evaluatorIds", "name username")
      .sort({ "sessions.0.date": -1, createdAt: -1 })
      .lean();

    return {
      data: assessments.map((a) => {
        const sub = a.subjectId as unknown as { name: string; code: string } | null;
        const classes = (a.classIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
        const evaluators = (a.evaluatorIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;

        return {
          id: a._id.toString(),
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
          status: a.status,
          createdAt: a.createdAt,
        };
      }),
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
    const created = await Assessment.create({
      centerId: new mongoose.Types.ObjectId(centerId),
      title: data.title,
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

  static async updateAssessment(id: string, data: Partial<IAssessment>) {
    await connectDB();
    const updated = await Assessment.findByIdAndUpdate(id, data, { returnDocument: "after" });
    if (!updated || updated.deletedAt) throw new Error("Assessment not found");
    return updated;
  }

  static async deleteAssessment(id: string, actorId: string) {
    await connectDB();
    await Assessment.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deletedBy: new mongoose.Types.ObjectId(actorId),
    });

    // Recompute snapshots for students affected by this deleted assessment
    try {
      const marks = await Mark.find({ assessmentId: new mongoose.Types.ObjectId(id) }).select("studentId").lean();
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
