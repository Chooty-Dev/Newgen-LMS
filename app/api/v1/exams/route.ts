import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AssessmentService } from "@/modules/exams/service";
import { createAssessmentSchema } from "@/modules/exams/schema";

export const GET = defineRoute({
  permission: ["exams.view", "attendance.view", "attendance.mark", "marks.evaluate", "marks.view"],
  handler: async ({ session, req }) => {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const subjectId = url.searchParams.get("subjectId") || undefined;

    return AssessmentService.listAssessments({
      centerId: session?.centerId || "",
      teacherId: session?.role === "teacher" ? session.sub : undefined,
      evaluatorId: session?.role === "staff" ? session.sub : undefined,
      type,
      status,
      subjectId,
      search,
    });
  },
});

export const POST = defineRoute({
  permission: "exams.create",
  bodySchema: createAssessmentSchema,
  auditAction: "exams.create",
  auditResource: { type: "Assessment" },
  auditSummary: ({ session, body }) => `${session?.name} created assessment: ${body.title}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const assessment = await AssessmentService.createAssessment(
      session.centerId,
      session.sub,
      body
    );

    return { data: assessment };
  },
});
