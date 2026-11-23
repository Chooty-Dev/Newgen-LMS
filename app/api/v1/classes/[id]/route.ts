import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { ClassService } from "@/modules/classes/service";
import { updateClassSchema } from "@/modules/classes/schema";

export const GET = defineRoute({
  permission: "classes.view",
  handler: async ({ params }) => {
    const details = await ClassService.getClassDetails(params.id);
    return { data: details };
  },
});

export const PATCH = defineRoute({
  permission: "classes.update",
  bodySchema: updateClassSchema,
  auditAction: "classes.update",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params }) => `${session?.name} updated class ID: ${params.id}`,
  handler: async ({ session, params, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }
    const updated = await ClassService.updateClass(params.id, body);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "classes.delete",
  auditAction: "classes.delete",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params }) => `${session?.name} deleted class ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }
    await ClassService.deleteClass(params.id, session.sub);
    return { data: { success: true, message: "Class deleted successfully" } };
  },
});
