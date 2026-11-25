import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { MarkService } from "@/modules/marks/service";
import { evaluateMarksSchema } from "@/modules/marks/schema";
import { checkAssessmentEvaluationWindow } from "@/modules/marks/evaluation-window";
import { Assessment } from "@/modules/exams/model";
import { Center } from "@/modules/centers/model";
import { connectDB } from "@/lib/db";
import { canAccessAssessment } from "@/core/rbac/policies";
import { resolveEffectivePermissions } from "@/core/rbac/resolver";

async function resolveWindowForAssessment(assessmentId: string) {
  await connectDB();
  const a = await Assessment.findById(assessmentId)
    .select("title sessions status centerId deletedAt")
    .lean();
  if (!a || a.deletedAt) return null;
  const center = await Center.findById(a.centerId).select("timezone").lean();
  return checkAssessmentEvaluationWindow({
    title: a.title,
    sessions: a.sessions,
    status: a.status,
    timeZone: center?.timezone || "Asia/Colombo",
  });
}

export const GET = defineRoute({
  permission: ["marks.evaluate", "marks.view"],
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

    const [grid, evaluationWindow] = await Promise.all([
      MarkService.getAssessmentForEvaluation(assessmentId),
      resolveWindowForAssessment(assessmentId),
    ]);
    return {
      data: {
        ...grid,
        assessment: {
          ...grid.assessment,
          evaluationWindow:
            evaluationWindow ||
            ("evaluationWindow" in grid.assessment ? grid.assessment.evaluationWindow : undefined),
        },
      },
    };
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

    const evaluationWindow = await resolveWindowForAssessment(body.assessmentId);
    if (evaluationWindow && !evaluationWindow.hasEnded) {
      return NextResponse.json(
        {
          error: {
            code: "ASSESSMENT_NOT_ENDED",
            message:
              evaluationWindow.message ||
              "Marks cannot be entered before this assessment finishes.",
          },
        },
        { status: 400 }
      );
    }

    const effectivePerms = await resolveEffectivePermissions(
      session.sub,
      session.role,
      session.permissionsVersion
    );

    const canEditSubmitted =
      session.role === "admin" ||
      session.role === "super_admin" ||
      session.role === "teacher" ||
      effectivePerms.includes("marks.update");

    const result = await MarkService.evaluateMarks(
      session.sub,
      session.centerId,
      body.assessmentId,
      body.status,
      body.entries,
      { canEditSubmitted }
    );

    return { data: result };
  },
});
