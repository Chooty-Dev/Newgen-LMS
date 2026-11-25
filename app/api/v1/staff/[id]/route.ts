import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User, StaffProfile } from "@/modules/users/model";
import { ClassModel } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { UserPermissionModel } from "@/modules/permissions/model";
import { invalidatePermissionCache } from "@/core/rbac/resolver";
import { UserService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/schema";
import { Permission } from "@/core/rbac/permissions";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "staff.view",
  handler: async ({ params }) => {
    try {
      const staff = await UserService.getStaffDetails(params.id);
      return { data: staff };
    } catch {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Staff member not found" } }, { status: 404 });
    }
  },
});

export const PATCH = defineRoute({
  permission: "staff.update",
  bodySchema: updateUserSchema,
  auditAction: "staff.update",
  auditResource: { type: "Staff" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated staff: ${params.id} (${body.name || ""})`,
  handler: async ({ params, body }) => {
    await connectDB();
    let user = null;
    if (mongoose.isValidObjectId(params.id)) {
      user = await User.findById(params.id);
    }
    if (!user) {
      user = await User.findOne({ username: params.id.toLowerCase(), role: "staff", deletedAt: null });
    }
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
      await StaffProfile.updateOne({ userId: user._id }, updateData);
    }

    if (body.permissions !== undefined) {
      await UserPermissionModel.findOneAndUpdate(
        { userId: user._id },
        { $set: { grants: body.permissions as Permission[] } },
        { upsert: true, new: true }
      );
      invalidatePermissionCache(user._id.toString());
    }

    if (body.assignedClassIds !== undefined) {
      const classObjIds = body.assignedClassIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      // Remove this staff member from all classes they are currently assigned to
      await ClassModel.updateMany(
        { staffIds: user._id },
        { $pull: { staffIds: user._id } }
      );

      // Add to newly selected classes
      if (classObjIds.length > 0) {
        await ClassModel.updateMany(
          { _id: { $in: classObjIds } },
          { $addToSet: { staffIds: user._id } }
        );
      }
    }

    if (body.assignedAssessmentIds !== undefined) {
      const assessmentObjIds = body.assignedAssessmentIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      // Remove this staff member from all assessments
      await Assessment.updateMany(
        { evaluatorIds: user._id },
        { $pull: { evaluatorIds: user._id } }
      );

      // Add to newly selected assessments
      if (assessmentObjIds.length > 0) {
        await Assessment.updateMany(
          { _id: { $in: assessmentObjIds } },
          { $addToSet: { evaluatorIds: user._id } }
        );
      }
    }

    return { data: { success: true, message: "Staff member updated successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "staff.delete",
  auditAction: "staff.delete",
  auditResource: { type: "Staff" },
  auditSummary: ({ session, params }) => `${session?.name} deleted staff: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await connectDB();
    let user = null;
    if (mongoose.isValidObjectId(params.id)) {
      user = await User.findById(params.id);
    }
    if (!user) {
      user = await User.findOne({ username: params.id.toLowerCase(), role: "staff", deletedAt: null });
    }
    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Staff member not found" } }, { status: 404 });
    }

    try {
      await UserService.softDeleteUser(
        { id: session.sub, role: session.role },
        user._id.toString()
      );
      return { data: { success: true, message: "Staff member deleted successfully" } };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deletion failed";
      return NextResponse.json({ error: { code: "CONFLICT", message } }, { status: 409 });
    }
  },
});
