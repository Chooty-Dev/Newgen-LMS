import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { ClassService } from "@/modules/classes/service";
import { createClassSchema } from "@/modules/classes/schema";

export const GET = defineRoute({
  permission: "classes.view",
  handler: async ({ session, req }) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const type = url.searchParams.get("type") || undefined;
    const status = url.searchParams.get("status") || undefined;

    return ClassService.listClasses({
      centerId: session?.centerId || "",
      teacherId: session?.role === "teacher" ? session.sub : undefined,
      staffId: session?.role === "staff" ? session.sub : undefined,
      search,
      type,
      status,
    });
  },
});

export const POST = defineRoute({
  permission: "classes.create",
  bodySchema: createClassSchema,
  auditAction: "classes.create",
  auditResource: { type: "Class" },
  auditSummary: ({ session, body }) => `${session?.name} created class: ${body.name}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const newClass = await ClassService.createClass(session.centerId, body);
    return { data: newClass };
  },
});
