import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AssessmentService } from "@/modules/exams/service";
import { Assessment } from "@/modules/exams/model";
import { canAccessAssessment } from "@/core/rbac/policies";
import { z } from "zod";
import mongoose from "mongoose";

const assignEvaluatorSchema = z.object({
  staffId: z.string().min(1),
});

export const POST = defineRoute({
  permission: "exams.assignEvaluators",
  bodySchema: assignEvaluatorSchema,
  auditAction: "exams.assignEvaluators",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, params, body }) =>
    `${session?.name} assigned evaluator ${body.staffId} to assessment ${params.id}`,
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

    await AssessmentService.assignEvaluator(a._id.toString(), body.staffId);
    return { data: { success: true, message: "Evaluator assigned successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "exams.assignEvaluators",
  auditAction: "exams.unassignEvaluator",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, params, req }) => {
    const sId = new URL(req.url).searchParams.get("staffId");
    return `${session?.name} unassigned evaluator ${sId} from assessment ${params.id}`;
  },
  handler: async ({ session, params, req }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const staffId = new URL(req.url).searchParams.get("staffId");
    if (!staffId) {
      return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Staff ID is required" } }, { status: 400 });
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

    await AssessmentService.unassignEvaluator(a._id.toString(), staffId);
    return { data: { success: true, message: "Evaluator unassigned successfully" } };
  },
});
