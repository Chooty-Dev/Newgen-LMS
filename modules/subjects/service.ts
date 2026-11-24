import { Subject, ISubject } from "./model";
import { ClassModel } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export class SubjectService {
  static async listSubjects(params: {
    centerId: string;
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      centerId: new mongoose.Types.ObjectId(params.centerId),
      deletedAt: null,
    };
    if (params.status && params.status !== "all") query.status = params.status;
    if (params.search) {
      query.$or = [
        { name: { $regex: params.search, $options: "i" } },
        { code: { $regex: params.search, $options: "i" } },
      ];
    }

    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 50);

    const total = await Subject.countDocuments(query);
    const subjects = await Subject.find(query)
      .sort({ code: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: subjects.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code,
        description: s.description || "",
        grades: s.grades && s.grades.length > 0 ? s.grades : [6, 7, 8, 9, 10, 11],
        status: s.status,
        createdAt: s.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createSubject(
    centerId: string,
    data: { name: string; code: string; description?: string; grades?: number[] }
  ) {
    await connectDB();
    const existing = await Subject.findOne({
      centerId: new mongoose.Types.ObjectId(centerId),
      code: data.code.toUpperCase(),
      deletedAt: null,
    });
    if (existing) {
      throw new Error(`Subject with code '${data.code}' already exists`);
    }

    const subject = await Subject.create({
      centerId: new mongoose.Types.ObjectId(centerId),
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description,
      grades: data.grades && data.grades.length > 0 ? data.grades : [6, 7, 8, 9, 10, 11],
      status: "active",
    });

    return subject;
  }

  static async updateSubject(id: string, data: Partial<ISubject>) {
    await connectDB();
    const updated = await Subject.findByIdAndUpdate(id, data, { returnDocument: "after" });
    if (!updated || updated.deletedAt) throw new Error("Subject not found");
    return updated;
  }

  static async deleteSubject(id: string, actorId: string) {
    await connectDB();
    const subjectObjId = new mongoose.Types.ObjectId(id);

    // Rule: blocked if used by active classes or assessments
    const [classCount, examCount] = await Promise.all([
      ClassModel.countDocuments({ subjectId: subjectObjId, deletedAt: null }),
      Assessment.countDocuments({ subjectId: subjectObjId, deletedAt: null }),
    ]);

    if (classCount > 0 || examCount > 0) {
      throw new Error(
        `Cannot delete subject: It is currently linked to ${classCount} active class(es) and ${examCount} assessment(s). Please remove or reassign these references first.`
      );
    }

    await Subject.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deletedBy: new mongoose.Types.ObjectId(actorId),
    });
  }
}
