import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AttendanceService } from "@/modules/attendance/service";
import { sessionAttendanceBatchSchema } from "@/modules/attendance/schema";
import { canAccessClass, canAccessAssessment } from "@/core/rbac/policies";
import { resolveEffectivePermissions } from "@/core/rbac/resolver";

export const GET = defineRoute({
  permission: ["attendance.view", "attendance.mark", "attendance.create"],
  handler: async ({ session, req }) => {
    const url = new URL(req.url);
    const kind = (url.searchParams.get("kind") as "class" | "assessment") || "class";
    const classId = url.searchParams.get("classId");
    const assessmentId = url.searchParams.get("assessmentId");
    const refId = url.searchParams.get("refId") || (kind === "assessment" ? assessmentId : classId);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

    if (!refId) {
      throw new Error("classId or assessmentId query parameter is required");
    }

    if (session) {
      if (kind === "assessment") {
        const allowed = await canAccessAssessment(
          { id: session.sub, role: session.role },
          refId
        );
        if (!allowed) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "You are not assigned to this assessment" } },
            { status: 403 }
          );
        }
      } else {
        const allowed = await canAccessClass(
          { id: session.sub, role: session.role },
          refId
        );
        if (!allowed) {
          return NextResponse.json(
            { error: { code: "FORBIDDEN", message: "You are not assigned to this class" } },
            { status: 403 }
          );
        }
      }
    }

    const view = await AttendanceService.getSessionView({
      kind,
      refId,
      classId: classId || undefined,
      assessmentId: assessmentId || undefined,
      date,
    });
    return { data: view };
  },
});

export const POST = defineRoute({
  permission: ["attendance.mark", "attendance.create", "attendance.update"],
  bodySchema: sessionAttendanceBatchSchema,
  auditAction: "attendance.markSession",
  auditResource: { type: "AttendanceSession" },
  auditSummary: ({ session, body }) =>
    `${session?.name} marked session attendance for ${body.kind} ${body.refId} on ${body.date} (${body.records.length} students, finalized: ${body.finalize})`,
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
    } else if (body.kind === "assessment") {
      const allowed = await canAccessAssessment(
        { id: session.sub, role: session.role },
        body.refId
      );
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You are not assigned to this assessment" } },
          { status: 403 }
        );
      }
    }

    const effectivePerms = await resolveEffectivePermissions(
      session.sub,
      session.role,
      session.permissionsVersion
    );

    const canEditFinalized =
      session.role === "admin" ||
      session.role === "super_admin" ||
      session.role === "teacher" ||
      effectivePerms.includes("attendance.update");

    const result = await AttendanceService.saveSessionBatch(
      session.sub,
      session.centerId,
      body,
      { canEditFinalized }
    );

    return { data: result };
  },
});
