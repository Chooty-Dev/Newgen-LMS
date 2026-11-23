import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { ClassService } from "@/modules/classes/service";
import { ClassModel } from "@/modules/classes/model";
import { canAccessClass } from "@/core/rbac/policies";
import { updateClassSchema } from "@/modules/classes/schema";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "classes.view",
  handler: async ({ session, params }) => {
    const c = await ClassModel.findOne(
      mongoose.isValidObjectId(params.id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(params.id) }, { slug: params.id }], deletedAt: null }
        : { slug: params.id, deletedAt: null }
    ).lean();

    if (!c) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Class not found" } }, { status: 404 });
    }

    if (session) {
      const allowed = await canAccessClass({ id: session.sub, role: session.role }, c._id.toString());
      if (!allowed) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
      }
    }

    const details = await ClassService.getClassDetails(c._id.toString());
    return { data: details };
  },
});

export const PATCH = defineRoute({
  permission: "classes.update",
  bodySchema: updateClassSchema,
  auditAction: "classes.update",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params }) => `${session?.name} updated class: ${params.id}`,
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

    const updated = await ClassService.updateClass(c._id.toString(), body);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "classes.delete",
  auditAction: "classes.delete",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params }) => `${session?.name} deleted class: ${params.id}`,
  handler: async ({ session, params }) => {
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

    await ClassService.deleteClass(c._id.toString(), session.sub);
    return { data: { success: true, message: "Class deleted successfully" } };
  },
});
