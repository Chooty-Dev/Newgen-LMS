import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User } from "@/modules/users/model";
import { UserService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/schema";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "admins.view",
  handler: async ({ params }) => {
    await connectDB();
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      role: { $in: ["admin", "super_admin"] },
      deletedAt: null,
    }).lean();

    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Admin not found" } }, { status: 404 });
    }

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        joinedAt: user.createdAt,
      },
    };
  },
});

export const PATCH = defineRoute({
  permission: "admins.update",
  bodySchema: updateUserSchema,
  auditAction: "admins.update",
  auditResource: { type: "Admin" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated admin ID: ${params.id} (${body.name || ""})`,
  handler: async ({ params, body }) => {
    await connectDB();
    const adminId = new mongoose.Types.ObjectId(params.id);

    const user = await User.findById(adminId);
    if (!user || !["admin", "super_admin"].includes(user.role) || user.deletedAt) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Admin not found" } }, { status: 404 });
    }

    if (body.name) user.name = body.name;
    if (body.email !== undefined) user.email = body.email || undefined;
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.status) user.status = body.status;
    await user.save();

    return { data: { success: true, message: "Admin updated successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "admins.delete",
  auditAction: "admins.delete",
  auditResource: { type: "Admin" },
  auditSummary: ({ session, params }) => `${session?.name} deleted admin ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await UserService.softDeleteUser(
      { id: session.sub, role: session.role },
      params.id
    );

    return { data: { success: true, message: "Admin deleted successfully" } };
  },
});
