import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { SubjectService } from "@/modules/subjects/service";
import { createSubjectSchema } from "@/modules/subjects/schema";

export const GET = defineRoute({
  permission: "subjects.view",
  handler: async ({ session, req }) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const status = url.searchParams.get("status") || undefined;

    return SubjectService.listSubjects({
      centerId: session?.centerId || "",
      search,
      status,
    });
  },
});

export const POST = defineRoute({
  permission: "subjects.create",
  bodySchema: createSubjectSchema,
  auditAction: "subjects.create",
  auditResource: { type: "Subject" },
  auditSummary: ({ session, body }) => `${session?.name} created subject ${body.code} - ${body.name}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const subject = await SubjectService.createSubject(session.centerId, body);
    return { data: subject };
  },
});
