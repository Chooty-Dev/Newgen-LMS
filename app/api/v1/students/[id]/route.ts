import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User, StudentProfile } from "@/modules/users/model";
import { UserService } from "@/modules/users/service";
import { updateUserSchema } from "@/modules/users/schema";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "students.view",
  handler: async ({ params }) => {
    await connectDB();
    const user = await User.findOne({
      _id: new mongoose.Types.ObjectId(params.id),
      role: "student",
      deletedAt: null,
    }).lean();

    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Student not found" } }, { status: 404 });
    }

    const profile = await StudentProfile.findOne({ userId: user._id }).lean();

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        joinedAt: user.createdAt,
        admissionNo: profile?.admissionNo || "-",
        grade: profile?.grade || "-",
        dateOfBirth: profile?.dateOfBirth,
        guardian: profile?.guardian,
      },
    };
  },
});

export const PATCH = defineRoute({
  permission: "students.update",
  bodySchema: updateUserSchema,
  auditAction: "students.update",
  auditResource: { type: "Student" },
  auditSummary: ({ session, params, body }) =>
    `${session?.name} updated student details for ID: ${params.id} (${body.name || "profile"})`,
  handler: async ({ params, body }) => {
    await connectDB();
    const studentId = new mongoose.Types.ObjectId(params.id);

    const user = await User.findById(studentId);
    if (!user || user.role !== "student" || user.deletedAt) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Student not found" } }, { status: 404 });
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

      await StudentProfile.updateOne({ userId: studentId }, profileUpdate);
    }

    return { data: { success: true, message: "Student updated successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "students.delete",
  auditAction: "students.delete",
  auditResource: { type: "Student" },
  auditSummary: ({ session, params }) => `${session?.name} deleted student ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await UserService.softDeleteUser(
      { id: session.sub, role: session.role },
      params.id
    );

    return { data: { success: true, message: "Student deleted successfully" } };
  },
});
