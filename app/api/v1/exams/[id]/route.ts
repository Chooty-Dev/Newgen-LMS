import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AssessmentService } from "@/modules/exams/service";
import { updateAssessmentSchema } from "@/modules/exams/schema";

export const PATCH = defineRoute({
  permission: "exams.update",
  bodySchema: updateAssessmentSchema,
  auditAction: "exams.update",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated assessment ID: ${params.id} (${body.title || ""})`,
  handler: async ({ params, body }) => {
    const updated = await AssessmentService.updateAssessment(params.id, body as unknown as Record<string, unknown>);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "exams.delete",
  auditAction: "exams.delete",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, params }) => `${session?.name} deleted assessment ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }
    await AssessmentService.deleteAssessment(params.id, session.sub);
    return { data: { success: true, message: "Assessment deleted successfully" } };
  },
});
