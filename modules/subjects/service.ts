import { Subject, ISubject } from "./model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export class SubjectService {
  static async listSubjects(params: { centerId: string; search?: string; status?: string }) {
    await connectDB();
    const query: Record<string, unknown> = {
      centerId: new mongoose.Types.ObjectId(params.centerId),
      deletedAt: null,
    };
    if (params.status) query.status = params.status;
    if (params.search) {
      query.$or = [
        { name: { $regex: params.search, $options: "i" } },
        { code: { $regex: params.search, $options: "i" } },
      ];
    }

    const subjects = await Subject.find(query).sort({ code: 1 }).lean();
    return {
      data: subjects.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code,
        description: s.description || "",
        status: s.status,
        createdAt: s.createdAt,
      })),
    };
  }

  static async createSubject(centerId: string, data: { name: string; code: string; description?: string }) {
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
    await Subject.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deletedBy: new mongoose.Types.ObjectId(actorId),
    });
  }
}
