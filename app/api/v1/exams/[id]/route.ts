import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AssessmentService } from "@/modules/exams/service";
import { Assessment } from "@/modules/exams/model";
import { canAccessAssessment } from "@/core/rbac/policies";
import { updateAssessmentSchema } from "@/modules/exams/schema";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "exams.view",
  handler: async ({ session, params }) => {
    const a = await Assessment.findOne(
      mongoose.isValidObjectId(params.id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(params.id) }, { slug: params.id }], deletedAt: null }
        : { slug: params.id, deletedAt: null }
    ).lean();

    if (!a) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Assessment not found" } }, { status: 404 });
    }

    if (session) {
      const allowed = await canAccessAssessment({ id: session.sub, role: session.role }, a._id.toString());
      if (!allowed) {
        return NextResponse.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
      }
    }

    const details = await AssessmentService.getAssessmentDetails(a._id.toString());
    return { data: details };
  },
});

export const PATCH = defineRoute({
  permission: "exams.update",
  bodySchema: updateAssessmentSchema,
  auditAction: "exams.update",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated assessment: ${params.id} (${body.title || ""})`,
  handler: async ({ session, params, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const a = await Assessment.findOne(
      mongoose.isValidObjectId(params.id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(params.id) }, { slug: params.id }], deletedAt: null }
        : { slug: params.id, deletedAt: null }
    ).lean();

    if (!a) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Assessment not found" } }, { status: 404 });
    }

    const allowed = await canAccessAssessment({ id: session.sub, role: session.role }, a._id.toString());
    if (!allowed) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
    }

    const updated = await AssessmentService.updateAssessment(a._id.toString(), body as unknown as Record<string, unknown>);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "exams.delete",
  auditAction: "exams.delete",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, params }) => `${session?.name} deleted assessment: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const a = await Assessment.findOne(
      mongoose.isValidObjectId(params.id)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(params.id) }, { slug: params.id }], deletedAt: null }
        : { slug: params.id, deletedAt: null }
    ).lean();

    if (!a) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "Assessment not found" } }, { status: 404 });
    }

    const allowed = await canAccessAssessment({ id: session.sub, role: session.role }, a._id.toString());
    if (!allowed) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Access denied" } }, { status: 403 });
    }

    await AssessmentService.deleteAssessment(a._id.toString(), session.sub);
    return { data: { success: true, message: "Assessment deleted successfully" } };
  },
});
