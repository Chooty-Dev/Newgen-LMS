import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import {
  getStudentTeacherInsights,
  TeacherInsightActionError,
} from "@/modules/analysis/teacher-insights.service";
import { canAccessStudent } from "@/core/rbac/policies";

function extractClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;
  return "127.0.0.1";
}

export const GET = defineRoute({
  permission: ["analysis.viewStudents", "students.view"],
  handler: async ({ session, params, req }) => {
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
        { status: 401 }
      );
    }

    const forceRefresh = new URL(req.url).searchParams.get("refresh") === "1";
    const ipAddress = extractClientIp(req);

    try {
      const data = await getStudentTeacherInsights(params.id, {
        forceRefresh,
        actorId: session.sub,
        sessionId: session.jti,
        ipAddress,
      });

      const allowed = await canAccessStudent(
        { id: session.sub, role: session.role },
        data.student.id
      );
      if (!allowed) {
        return NextResponse.json(
          { error: { code: "FORBIDDEN", message: "You do not have access to this student" } },
          { status: 403 }
        );
      }

      return { data };
    } catch (err) {
      if (err instanceof TeacherInsightActionError) {
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              unlocksAt: err.unlocksAt,
              quota: err.quota,
            },
          },
          { status: err.statusCode }
        );
      }

      const msg = (err as Error).message || "Failed to generate analysis";
      if (msg === "Student not found") {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Student not found" } },
          { status: 404 }
        );
      }
      throw err;
    }
  },
});
