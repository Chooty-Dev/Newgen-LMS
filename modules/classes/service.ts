import { ClassModel, Enrollment } from "./model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export class ClassService {
  static async listClasses(params: {
    centerId: string;
    teacherId?: string;
    staffId?: string;
    search?: string;
    type?: string;
    status?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      centerId: new mongoose.Types.ObjectId(params.centerId),
      deletedAt: null,
    };

    if (params.teacherId) {
      query.teacherId = new mongoose.Types.ObjectId(params.teacherId);
    }
    if (params.staffId) {
      query.staffIds = new mongoose.Types.ObjectId(params.staffId);
    }
    if (params.status) {
      query.status = params.status;
    }
    if (params.type) {
      query["schedule.type"] = params.type;
    }
    if (params.search) {
      query.name = { $regex: params.search, $options: "i" };
    }

    const classes = await ClassModel.find(query)
      .populate("subjectId", "name code")
      .populate("teacherId", "name username")
      .populate("staffIds", "name username")
      .sort({ createdAt: -1 })
      .lean();

    // Get student count per class
    const classIds = classes.map((c) => c._id);
    const enrollments = await Enrollment.aggregate([
      { $match: { classId: { $in: classIds }, status: "active" } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(enrollments.map((e) => [e._id.toString(), e.count]));

    return {
      data: classes.map((c) => {
        const sub = c.subjectId as unknown as { name: string; code: string } | null;
        const teach = c.teacherId as unknown as { name: string; username: string } | null;
        const staff = (c.staffIds || []) as unknown as Array<{ name: string; username: string }>;

        return {
          id: c._id.toString(),
          name: c.name,
          subject: sub ? `${sub.code} - ${sub.name}` : "-",
          subjectId: c.subjectId ? (c.subjectId as unknown as { _id: mongoose.Types.ObjectId })._id?.toString() : "",
          teacher: teach?.name || "Unassigned",
          teacherId: c.teacherId ? (c.teacherId as unknown as { _id: mongoose.Types.ObjectId })._id?.toString() : "",
          staff: staff.map((s) => s.name),
          staffIds: c.staffIds?.map((s) => (s as unknown as { _id: mongoose.Types.ObjectId })._id?.toString() || s.toString()) || [],
          schedule: c.schedule,
          capacity: c.capacity,
          enrolledCount: countMap.get(c._id.toString()) || 0,
          status: c.status,
          createdAt: c.createdAt,
        };
      }),
    };
  }

  static async getClassDetails(classId: string) {
    await connectDB();
    const c = await ClassModel.findById(classId)
      .populate("subjectId", "name code")
      .populate("teacherId", "name username")
      .populate("staffIds", "name username")
      .lean();

    if (!c || c.deletedAt) throw new Error("Class not found");

    const enrollments = await Enrollment.find({ classId: c._id, status: "active" })
      .populate("studentId", "name username email phone status")
      .lean();

    const students = enrollments.map((e) => {
      const u = e.studentId as unknown as { _id: mongoose.Types.ObjectId; name: string; username: string; email?: string; phone?: string; status: string } | null;
      return {
        id: u?._id.toString() || "",
        name: u?.name || "Student",
        username: u?.username || "",
        email: u?.email || "",
        phone: u?.phone || "",
        status: u?.status || "active",
        enrolledAt: e.enrolledAt,
      };
    });

    return { class: c, students };
  }

  static async createClass(centerId: string, data: {
    name: string;
    subjectId: string;
    teacherId: string;
    staffIds?: string[];
    scheduleType: "regular" | "special";
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
    startDate?: string;
    endDate?: string;
    sessions?: Array<{ date: string; startTime: string; endTime: string }>;
    capacity?: number;
  }) {
    await connectDB();

    const schedule: Record<string, unknown> = {
      type: data.scheduleType,
    };

    if (data.scheduleType === "regular") {
      schedule.regular = {
        daysOfWeek: data.daysOfWeek || [1],
        startTime: data.startTime || "14:00",
        endTime: data.endTime || "16:00",
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      };
    } else {
      schedule.special = {
        sessions: data.sessions || [],
      };
    }

    const newClass = await ClassModel.create({
      centerId: new mongoose.Types.ObjectId(centerId),
      name: data.name,
      subjectId: new mongoose.Types.ObjectId(data.subjectId),
      teacherId: new mongoose.Types.ObjectId(data.teacherId),
      staffIds: (data.staffIds || []).map((id) => new mongoose.Types.ObjectId(id)),
      schedule,
      capacity: data.capacity || 50,
      status: "active",
    });

    return newClass;
  }

  static async enrollStudents(classId: string, studentIds: string[]) {
    await connectDB();
    const cId = new mongoose.Types.ObjectId(classId);

    const ops = studentIds.map((sId) => ({
      updateOne: {
        filter: { classId: cId, studentId: new mongoose.Types.ObjectId(sId) },
        update: {
          $set: { status: "active", enrolledAt: new Date() },
          $unset: { leftAt: 1 },
        },
        upsert: true,
      },
    }));

    await Enrollment.bulkWrite(ops);
  }

  static async removeStudent(classId: string, studentId: string) {
    await connectDB();
    await Enrollment.updateOne(
      { classId: new mongoose.Types.ObjectId(classId), studentId: new mongoose.Types.ObjectId(studentId) },
      { status: "left", leftAt: new Date() }
    );
  }

  static async deleteClass(classId: string, actorId: string) {
    await connectDB();
    await ClassModel.findByIdAndUpdate(classId, {
      deletedAt: new Date(),
      deletedBy: new mongoose.Types.ObjectId(actorId),
      status: "ended",
    });
  }
}
