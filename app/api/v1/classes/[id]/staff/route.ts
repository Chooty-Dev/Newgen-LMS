import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { ClassService } from "@/modules/classes/service";
import { ClassModel } from "@/modules/classes/model";
import { canAccessClass } from "@/core/rbac/policies";
import { z } from "zod";
import mongoose from "mongoose";

const assignStaffSchema = z.object({
  staffId: z.string().min(1),
});

export const POST = defineRoute({
  permission: "classes.assignStaff",
  bodySchema: assignStaffSchema,
  auditAction: "classes.assignStaff",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params, body }) =>
    `${session?.name} assigned staff ${body.staffId} to class ${params.id}`,
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

    await ClassService.assignStaff(c._id.toString(), body.staffId);
    return { data: { success: true, message: "Staff assigned successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "classes.assignStaff",
  auditAction: "classes.unassignStaff",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params, req }) => {
    const sId = new URL(req.url).searchParams.get("staffId");
    return `${session?.name} unassigned staff ${sId} from class ${params.id}`;
  },
  handler: async ({ session, params, req }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const staffId = new URL(req.url).searchParams.get("staffId");
    if (!staffId) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Staff ID is required" } }, { status: 400 });
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

    await ClassService.unassignStaff(c._id.toString(), staffId);
    return { data: { success: true, message: "Staff unassigned successfully" } };
  },
});
