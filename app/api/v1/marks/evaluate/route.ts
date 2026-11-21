import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { MarkService } from "@/modules/marks/service";
import { evaluateMarksSchema } from "@/modules/marks/schema";
import { canAccessAssessment } from "@/core/rbac/policies";

export const GET = defineRoute({
  permission: "marks.evaluate",
  handler: async ({ session, req }) => {
    const assessmentId = new URL(req.url).searchParams.get("assessmentId");
    if (!assessmentId) {
      throw new Error("assessmentId query parameter is required");
    }

    if (session) {
      const allowed = await canAccessAssessment(
        { id: session.sub, role: session.role },
        assessmentId
      );
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You are not assigned to evaluate this assessment" } },
          { status: 403 }
        );
      }
    }

    const grid = await MarkService.getAssessmentForEvaluation(assessmentId);
    return { data: grid };
  },
});

export const POST = defineRoute({
  permission: "marks.evaluate",
  bodySchema: evaluateMarksSchema,
  auditAction: "marks.evaluate",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, body }) =>
    `${session?.name} ${body.status === "submitted" ? "submitted" : "saved draft"} marks for assessment ${body.assessmentId} (${body.entries.length} students)`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const allowed = await canAccessAssessment(
      { id: session.sub, role: session.role },
      body.assessmentId
    );
    if (!allowed) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You are not assigned to evaluate this assessment" } },
        { status: 403 }
      );
    }

    const result = await MarkService.evaluateMarks(
      session.sub,
      session.centerId,
      body.assessmentId,
      body.status,
      body.entries
    );

    return { data: result };
  },
});
