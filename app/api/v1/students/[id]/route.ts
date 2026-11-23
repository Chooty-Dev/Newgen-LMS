import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User, StudentProfile } from "@/modules/users/model";
import { UserService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/schema";
import { canAccessStudent } from "@/core/rbac/policies";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "students.view",
  handler: async ({ session, params }) => {
    try {
      const student = await UserService.getStudentDetails(params.id);

      if (session) {
        const allowed = await canAccessStudent(
          { id: session.sub, role: session.role },
          student.id
        );
        if (!allowed) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "Forbidden: You do not have access to this student" } },
            { status: 403 }
          );
        }
      }

      return { data: student };
    } catch {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }
  },
});

export const PATCH = defineRoute({
  permission: "students.update",
  bodySchema: updateUserSchema,
  auditAction: "students.update",
  auditResource: { type: "Student" },
  auditSummary: ({ session, params, body }) =>
    `${session?.name} updated student details for: ${params.id} (${body.name || "profile"})`,
  handler: async ({ session, params, body }) => {
    await connectDB();

    let user = null;
    if (mongoose.isValidObjectId(params.id)) {
      user = await User.findById(params.id);
    }
    if (!user) {
      user = await User.findOne({ username: params.id.toLowerCase(), role: "student", deletedAt: null });
    }
    if (!user || user.role !== "student" || user.deletedAt) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Student not found" } }, { status: 404 });
    }

    if (session) {
      const allowed = await canAccessStudent(
        { id: session.sub, role: session.role },
        user._id.toString()
      );
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "Forbidden: You do not have access to this student" } },
          { status: 403 }
        );
      }
    }

    if (body.name) user.name = body.name;
    if (body.email !== undefined) user.email = body.email || undefined;
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.status) user.status = body.status;
    await user.save();

    if (body.grade !== undefined || body.dateOfBirth !== undefined || body.guardian !== undefined) {
      const profileUpdate: Record<string, unknown> = {};
      if (body.grade !== undefined) profileUpdate.grade = body.grade;
      if (body.dateOfBirth !== undefined)
        profileUpdate.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
      if (body.guardian !== undefined) profileUpdate.guardian = body.guardian;

      await StudentProfile.updateOne({ userId: user._id }, profileUpdate);
    }

    return { data: { success: true, message: "Student updated successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "students.delete",
  auditAction: "students.delete",
  auditResource: { type: "Student" },
  auditSummary: ({ session, params }) => `${session?.name} deleted student: ${params.id}`,
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
      user = await User.findOne({ username: params.id.toLowerCase(), role: "student", deletedAt: null });
    }
    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Student not found" } }, { status: 404 });
    }

    await UserService.softDeleteUser(
      { id: session.sub, role: session.role },
      user._id.toString()
    );

    return { data: { success: true, message: "Student deleted successfully" } };
  },
});
