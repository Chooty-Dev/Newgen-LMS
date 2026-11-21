import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { SubjectService } from "@/modules/subjects/service";
import { updateSubjectSchema } from "@/modules/subjects/schema";

export const PATCH = defineRoute({
  permission: "subjects.update",
  bodySchema: updateSubjectSchema,
  auditAction: "subjects.update",
  auditResource: { type: "Subject" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated subject ID: ${params.id} (${body.name || ""})`,
  handler: async ({ params, body }) => {
    const updated = await SubjectService.updateSubject(params.id, body);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "subjects.delete",
  auditAction: "subjects.delete",
  auditResource: { type: "Subject" },
  auditSummary: ({ session, params }) => `${session?.name} deleted subject ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }
    await SubjectService.deleteSubject(params.id, session.sub);
    return { data: { success: true, message: "Subject deleted successfully" } };
  },
});
