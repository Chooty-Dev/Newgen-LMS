import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User, StaffProfile } from "@/modules/users/model";
import { UserService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/schema";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "staff.view",
  handler: async ({ params }) => {
    await connectDB();
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      role: "staff",
      deletedAt: null,
    }).lean();

    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Staff member not found" } }, { status: 404 });
    }

    const profile = await StaffProfile.findOne({ userId: user._id }).lean();

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        joinedAt: user.createdAt,
        title: profile?.title || "Staff Member",
        position: profile?.position || "Coordinator",
      },
    };
  },
});

export const PATCH = defineRoute({
  permission: "staff.update",
  bodySchema: updateUserSchema,
  auditAction: "staff.update",
  auditResource: { type: "Staff" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated staff ID: ${params.id} (${body.name || ""})`,
  handler: async ({ params, body }) => {
    await connectDB();
    const staffId = new mongoose.Types.ObjectId(params.id);

    const user = await User.findById(staffId);
    if (!user || user.role !== "staff" || user.deletedAt) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Staff member not found" } }, { status: 404 });
    }

    if (body.name) user.name = body.name;
    if (body.email !== undefined) user.email = body.email || undefined;
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.status) user.status = body.status;
    await user.save();

    if (body.title || body.position) {
      const updateData: Record<string, unknown> = {};
      if (body.title) updateData.title = body.title;
      if (body.position) updateData.position = body.position;
      await StaffProfile.updateOne({ userId: staffId }, updateData);
    }

    return { data: { success: true, message: "Staff member updated successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "staff.delete",
  auditAction: "staff.delete",
  auditResource: { type: "Staff" },
  auditSummary: ({ session, params }) => `${session?.name} deleted staff ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await UserService.softDeleteUser(
      { id: session.sub, role: session.role },
      params.id
    );

    return { data: { success: true, message: "Staff member deleted successfully" } };
  },
});
