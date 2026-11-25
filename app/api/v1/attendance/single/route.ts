import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AttendanceService } from "@/modules/attendance/service";
import { markSingleAttendanceSchema } from "@/modules/attendance/schema";
import { canAccessClass } from "@/core/rbac/policies";

export const POST = defineRoute({
  permission: ["attendance.mark", "attendance.create", "attendance.update"],
  bodySchema: markSingleAttendanceSchema,
  auditAction: "attendance.markSingle",
  auditResource: { type: "Attendance" },
  auditSummary: ({ session, body }) =>
    `${session?.name} marked student ${body.studentId} as ${body.status} on ${body.date}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const allowed = await canAccessClass(
      { id: session.sub, role: session.role },
      body.classId
    );
    if (!allowed) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "You are not assigned to this class" } },
        { status: 403 }
      );
    }

    const record = await AttendanceService.markSingleAttendance(
      session.sub,
      session.centerId,
      body
    );

    return { data: record };
  },
});
