import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AttendanceService } from "@/modules/attendance/service";
import { sessionAttendanceBatchSchema } from "@/modules/attendance/schema";
import { canAccessClass } from "@/core/rbac/policies";

export const GET = defineRoute({
  permission: "attendance.view",
  handler: async ({ req }) => {
    const url = new URL(req.url);
    const classId = url.searchParams.get("classId");
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

    if (!classId) {
      throw new Error("classId query parameter is required");
    }

    const view = await AttendanceService.getSessionView({ classId, date });
    return { data: view };
  },
});

export const POST = defineRoute({
  permission: "attendance.mark",
  bodySchema: sessionAttendanceBatchSchema,
  auditAction: "attendance.markSession",
  auditResource: { type: "AttendanceSession" },
  auditSummary: ({ session, body }) =>
    `${session?.name} marked session attendance for ${body.refId} on ${body.date} (${body.records.length} students, finalized: ${body.finalize})`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    if (body.kind === "class") {
      const allowed = await canAccessClass(
        { id: session.sub, role: session.role },
        body.refId
      );
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You are not assigned to this class" } },
          { status: 403 }
        );
      }
    }

    const result = await AttendanceService.saveSessionBatch(
      session.sub,
      session.centerId,
      body
    );

    return { data: result };
  },
});
