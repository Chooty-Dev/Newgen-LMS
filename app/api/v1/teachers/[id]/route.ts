import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User, TeacherProfile } from "@/modules/users/model";
import { UserService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/schema";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "teachers.view",
  handler: async ({ params }) => {
    await connectDB();
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      role: "teacher",
      deletedAt: null,
    }).lean();

    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Teacher not found" } }, { status: 404 });
    }

    const profile = await TeacherProfile.findOne({ userId: user._id }).lean();
    const rawCenterIds =
      user.assignedCenterIds && user.assignedCenterIds.length > 0
        ? user.assignedCenterIds
        : profile?.assignedCenterIds && profile.assignedCenterIds.length > 0
          ? profile.assignedCenterIds
          : user.centerId
            ? [user.centerId]
            : [];

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        joinedAt: user.createdAt,
        title: profile?.title || "Teacher",
        assignedCenterIds: rawCenterIds.map((id) => id.toString()),
      },
    };
  },
});

export const PATCH = defineRoute({
  permission: "teachers.update",
  bodySchema: updateUserSchema,
  auditAction: "teachers.update",
  auditResource: { type: "Teacher" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated teacher ID: ${params.id} (${body.name || ""})`,
  handler: async ({ session, params, body }) => {
    await connectDB();
    const teacherId = new mongoose.Types.ObjectId(params.id);

    const user = await User.findById(teacherId);
    if (!user || user.role !== "teacher" || user.deletedAt) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Teacher not found" } }, { status: 404 });
    }

    if (body.name) user.name = body.name;
    if (body.email !== undefined) user.email = body.email || undefined;
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.status) user.status = body.status;

    if (body.centerIds && Array.isArray(body.centerIds)) {
      if (session?.role !== "super_admin" && session?.role !== "admin") {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Only administrators can assign teachers to education centers" } },
          { status: 403 }
        );
      }

      const centerObjectIds = body.centerIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      user.assignedCenterIds = centerObjectIds;
      if (centerObjectIds.length > 0 && !centerObjectIds.some((c) => c.equals(user.centerId))) {
        user.centerId = centerObjectIds[0];
      }

      await User.updateOne(
        { _id: teacherId },
        { $set: { assignedCenterIds: centerObjectIds, centerId: user.centerId } }
      );
      await TeacherProfile.updateOne(
        { userId: teacherId },
        { $set: { assignedCenterIds: centerObjectIds, centerId: user.centerId } },
        { upsert: true }
      );
    }

    await user.save();

    if (body.title) {
      await TeacherProfile.updateOne({ userId: teacherId }, { title: body.title });
    }

    return { data: { success: true, message: "Teacher updated successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "teachers.delete",
  auditAction: "teachers.delete",
  auditResource: { type: "Teacher" },
  auditSummary: ({ session, params }) => `${session?.name} deleted teacher ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await UserService.softDeleteUser(
      { id: session.sub, role: session.role },
      params.id
    );

    return { data: { success: true, message: "Teacher deleted successfully" } };
  },
});
