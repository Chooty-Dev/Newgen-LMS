import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { ClassService } from "@/modules/classes/service";
import { ClassModel } from "@/modules/classes/model";
import { canAccessClass } from "@/core/rbac/policies";
import { enrollStudentsSchema } from "@/modules/classes/schema";
import mongoose from "mongoose";

export const POST = defineRoute({
  permission: "classes.enrollStudents",
  bodySchema: enrollStudentsSchema,
  auditAction: "classes.enrollStudents",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params, body }) =>
    `${session?.name} enrolled ${body.studentIds.length} students in class ${params.id}`,
  handler: async ({ session, params, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const c = await ClassModel.findOne(
      mongoose.isValidObjectId(params.id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(params.id) }, { slug: params.id }], deletedAt: null }
        : { slug: params.id, deletedAt: null }
    ).lean();

    if (!c) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Class not found" } }, { status: 404 });
    }

    const allowed = await canAccessClass({ id: session.sub, role: session.role }, c._id.toString());
    if (!allowed) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
    }

    await ClassService.enrollStudents(c._id.toString(), body.studentIds);
    return { data: { success: true, message: "Students enrolled successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "classes.enrollStudents",
  auditAction: "classes.removeStudent",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params, req }) => {
    const sId = new URL(req.url).searchParams.get("studentId");
    return `${session?.name} removed student ${sId} from class ${params.id}`;
  },
  handler: async ({ session, params, req }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Student ID is required" } }, { status: 400 });
    }

    const c = await ClassModel.findOne(
      mongoose.isValidObjectId(params.id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(params.id) }, { slug: params.id }], deletedAt: null }
        : { slug: params.id, deletedAt: null }
    ).lean();

    if (!c) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Class not found" } }, { status: 404 });
    }

    const allowed = await canAccessClass({ id: session.sub, role: session.role }, c._id.toString());
    if (!allowed) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
    }

    await ClassService.removeStudent(c._id.toString(), studentId);
    return { data: { success: true, message: "Student removed from class" } };
  },
});
