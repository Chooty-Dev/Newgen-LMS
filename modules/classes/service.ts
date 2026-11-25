import { ClassModel, Enrollment } from "./model";
import { Assessment } from "@/modules/exams/model";
import { Announcement } from "@/modules/announcements/model";
import { connectDB } from "@/lib/db";
import { generateSlug } from "@/lib/slug";
import { invalidateStaffAssignmentOptionsCache } from "@/modules/users/staff-assignment-cache";
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
    if (params.status && params.status !== "all") {
      query.status = params.status;
    }
    if (params.type && params.type !== "all") {
      query["schedule.type"] = params.type;
    }
    if (params.search) {
      query.name = { $regex: params.search, $options: "i" };
    }

    const classes = await ClassModel.find(query)
      .populate("subjectId", "name code")
      .populate("teacherId", "name username")
      .populate("staffIds", "name username email")
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
        const staff = (c.staffIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string; username: string; email?: string }>;

        return {
          id: c._id.toString(),
          slug: c.slug || c._id.toString(),
          name: c.name,
          grade: c.grade || 11,
          subject: sub ? `${sub.code} - ${sub.name}` : "-",
          subjectId: c.subjectId ? (c.subjectId as unknown as { _id: mongoose.Types.ObjectId })._id?.toString() : "",
          teacher: teach?.name || "Unassigned",
          teacherId: c.teacherId ? (c.teacherId as unknown as { _id: mongoose.Types.ObjectId })._id?.toString() : "",
          staff: staff.map((s) => s.name),
          staffIds: staff.map((s) => s._id.toString()),
          schedule: c.schedule,
          capacity: c.capacity,
          enrolledCount: countMap.get(c._id.toString()) || 0,
          status: c.status,
          createdAt: c.createdAt,
        };
      }),
    };
  }

  static async getClassDetails(idOrSlug: string) {
    await connectDB();
    let query: Record<string, unknown> = { deletedAt: null };

    if (mongoose.isValidObjectId(idOrSlug)) {
      query = { $or: [{ _id: new mongoose.Types.ObjectId(idOrSlug) }, { slug: idOrSlug }], deletedAt: null };
    } else {
      query = { slug: idOrSlug, deletedAt: null };
    }

    const c = await ClassModel.findOne(query)
      .populate("subjectId", "name code")
      .populate("teacherId", "name username email phone")
      .populate("staffIds", "name username email phone")
      .lean();

    if (!c) throw new Error("Class not found");

    const enrollments = await Enrollment.find({ classId: c._id, status: "active" })
      .populate("studentId", "name username email phone status")
      .sort({ enrolledAt: -1 })
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

    const staffList = ((c.staffIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string; username: string; email?: string; phone?: string }>).map((s) => ({
      id: s._id.toString(),
      name: s.name,
      username: s.username,
      email: s.email || "",
      phone: s.phone || "",
    }));

    // Fetch linked exams/assessments
    const assessments = await Assessment.find({ classIds: c._id, deletedAt: null })
      .populate("subjectId", "name code")
      .sort({ createdAt: -1 })
      .lean();

    // Fetch linked announcements
    const announcements = await Announcement.find({ classIds: c._id, deletedAt: null })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .lean();

    const sub = c.subjectId as unknown as { _id: mongoose.Types.ObjectId; name: string; code: string } | null;
    const teach = c.teacherId as unknown as { _id: mongoose.Types.ObjectId; name: string; username: string; email?: string } | null;

    const formattedClass = {
      id: c._id.toString(),
      slug: c.slug || c._id.toString(),
      name: c.name,
      grade: c.grade || 11,
      subject: sub ? `${sub.code} - ${sub.name}` : "-",
      subjectId: sub?._id?.toString() || "",
      teacher: teach?.name || "Unassigned",
      teacherId: teach?._id?.toString() || "",
      staff: staffList.map((s) => s.name),
      staffIds: staffList.map((s) => s.id),
      schedule: c.schedule,
      capacity: c.capacity || 50,
      enrolledCount: students.length,
      status: c.status,
      createdAt: c.createdAt,
    };

    return {
      class: formattedClass,
      students,
      staff: staffList,
      assessments: assessments.map((a) => ({
        id: a._id.toString(),
        slug: a.slug || a._id.toString(),
        title: a.title,
        type: a.type,
        totalMarks: a.totalMarks,
        passMark: a.passMark,
        status: a.status,
        date: a.sessions?.[0]?.date || (a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : ""),
      })),
      announcements: announcements.map((ann) => ({
        id: ann._id.toString(),
        title: ann.title,
        body: ann.body,
        pinned: ann.pinned,
        publishAt: ann.publishAt,
        author: (ann.createdBy as unknown as { name?: string })?.name || "Staff",
      })),
    };
  }

  static async createClass(centerId: string, data: {
    name: string;
    subjectId: string;
    grade?: number;
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

    const slug = generateSlug(data.name);

    const newClass = await ClassModel.create({
      centerId: new mongoose.Types.ObjectId(centerId),
      name: data.name,
      slug,
      subjectId: new mongoose.Types.ObjectId(data.subjectId),
      grade: data.grade || 11,
      teacherId: new mongoose.Types.ObjectId(data.teacherId),
      staffIds: (data.staffIds || []).map((id) => new mongoose.Types.ObjectId(id)),
      schedule,
      capacity: data.capacity || 50,
      status: "active",
    });

    invalidateStaffAssignmentOptionsCache(centerId);
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

  static async assignStaff(classId: string, staffId: string) {
    await connectDB();
    return ClassModel.findByIdAndUpdate(
      classId,
      { $addToSet: { staffIds: new mongoose.Types.ObjectId(staffId) } },
      { new: true }
    );
  }

  static async unassignStaff(classId: string, staffId: string) {
    await connectDB();
    return ClassModel.findByIdAndUpdate(
      classId,
      { $pull: { staffIds: new mongoose.Types.ObjectId(staffId) } },
      { new: true }
    );
  }

  static async updateClass(classId: string, data: {
    name?: string;
    subjectId?: string;
    grade?: number;
    capacity?: number;
    scheduleType?: "regular" | "special";
    daysOfWeek?: number[];
    startTime?: string;
    endTime?: string;
    sessions?: Array<{ date: string; startTime: string; endTime: string }>;
    status?: "active" | "paused" | "ended";
  }) {
    await connectDB();
    const updateDoc: Record<string, unknown> = {};
    if (data.name !== undefined) updateDoc.name = data.name;
    if (data.subjectId !== undefined) updateDoc.subjectId = new mongoose.Types.ObjectId(data.subjectId);
    if (data.grade !== undefined) updateDoc.grade = data.grade;
    if (data.capacity !== undefined) updateDoc.capacity = data.capacity;
    if (data.status !== undefined) updateDoc.status = data.status;

    if (data.scheduleType) {
      if (data.scheduleType === "regular") {
        updateDoc["schedule.type"] = "regular";
        updateDoc["schedule.regular"] = {
          daysOfWeek: data.daysOfWeek || [1],
          startTime: data.startTime || "14:00",
          endTime: data.endTime || "16:00",
        };
      } else {
        updateDoc["schedule.type"] = "special";
        updateDoc["schedule.special"] = {
          sessions: data.sessions || [],
        };
      }
    }

    const updated = await ClassModel.findByIdAndUpdate(
      classId,
      { $set: updateDoc },
      { returnDocument: "after" }
    );
    invalidateStaffAssignmentOptionsCache(updated?.centerId?.toString());
    return updated;
  }

  static async deleteClass(classId: string, actorId: string) {
    await connectDB();
    const cObjId = new mongoose.Types.ObjectId(classId);

    // Rule: soft delete class
    const deleted = await ClassModel.findByIdAndUpdate(
      cObjId,
      {
        deletedAt: new Date(),
        deletedBy: new mongoose.Types.ObjectId(actorId),
        status: "ended",
      },
      { returnDocument: "after" }
    );
    invalidateStaffAssignmentOptionsCache(deleted?.centerId?.toString());

    // Rule: mark all active enrollments as left
    await Enrollment.updateMany(
      { classId: cObjId, status: "active" },
      { $set: { status: "left", leftAt: new Date() } }
    );
  }
}
