import { Announcement, IAnnouncement } from "./model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export class AnnouncementService {
  static async listAnnouncements(params: {
    centerId: string;
    studentId?: string;
    search?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      centerId: new mongoose.Types.ObjectId(params.centerId),
      deletedAt: null,
    };

    if (params.studentId) {
      const enrollments = await Enrollment.find({
        studentId: new mongoose.Types.ObjectId(params.studentId),
        status: "active",
      }).select("classId");
      const classIds = enrollments.map((e) => e.classId);

      query.$or = [{ audience: "center" }, { classIds: { $in: classIds } }];
    }

    if (params.search) {
      query.$or = [
        { title: { $regex: params.search, $options: "i" } },
        { body: { $regex: params.search, $options: "i" } },
      ];
    }

    const announcements = await Announcement.find(query)
      .populate("classIds", "name")
      .populate("createdBy", "name role")
      .sort({ pinned: -1, publishAt: -1 })
      .lean();

    return {
      data: announcements.map((a) => {
        const classes = (a.classIds || []) as unknown as Array<{ _id: mongoose.Types.ObjectId; name: string }>;
        const author = a.createdBy as unknown as { name: string; role: string } | null;

        return {
          id: a._id.toString(),
          title: a.title,
          body: a.body,
          audience: a.audience,
          classes: classes.map((c) => c.name),
          classIds: classes.map((c) => c._id.toString()),
          pinned: a.pinned,
          publishAt: a.publishAt,
          authorName: author?.name || "Administration",
          authorRole: author?.role || "admin",
        };
      }),
    };
  }

  static async createAnnouncement(
    centerId: string,
    actorId: string,
    data: {
      title: string;
      body: string;
      audience: "center" | "classes";
      classIds?: string[];
      pinned?: boolean;
      publishAt?: string;
    },
    actorRole?: string
  ) {
    await connectDB();

    // If teacher, validate that all selected classes belong to the teacher
    if (actorRole === "teacher" && data.audience === "classes" && data.classIds && data.classIds.length > 0) {
      const classObjectIds = data.classIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      const ownedCount = await ClassModel.countDocuments({
        _id: { $in: classObjectIds },
        teacherId: new mongoose.Types.ObjectId(actorId),
        deletedAt: null,
      });

      if (ownedCount !== classObjectIds.length) {
        throw new Error("You can only post announcements to classes assigned to you");
      }
    }

    const ann = await Announcement.create({
      centerId: new mongoose.Types.ObjectId(centerId),
      title: data.title,
      body: data.body,
      audience: data.audience,
      classIds: (data.classIds || []).map((id) => new mongoose.Types.ObjectId(id)),
      pinned: data.pinned ?? false,
      publishAt: data.publishAt ? new Date(data.publishAt) : new Date(),
      createdBy: new mongoose.Types.ObjectId(actorId),
    });
    return ann;
  }

  static async updateAnnouncement(id: string, data: Partial<IAnnouncement>) {
    await connectDB();
    const updated = await Announcement.findByIdAndUpdate(id, data, { returnDocument: "after" });
    if (!updated || updated.deletedAt) throw new Error("Announcement not found");
    return updated;
  }

  static async deleteAnnouncement(id: string, actorId: string) {
    await connectDB();
    await Announcement.findByIdAndUpdate(id, {
      deletedAt: new Date(),
      deletedBy: new mongoose.Types.ObjectId(actorId),
    });
  }
}
