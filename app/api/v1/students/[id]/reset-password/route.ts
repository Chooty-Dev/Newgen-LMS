import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";

export const POST = defineRoute({
  permission: "students.resetPassword",
  auditAction: "students.resetPassword",
  auditResource: { type: "Student" },
  auditSummary: ({ session, params }) => `${session?.name} reset password for student ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const { temporaryPassword } = await UserService.resetUserPassword(
      { id: session.sub, role: session.role },
      params.id
    );

    return {
      data: {
        temporaryPassword,
        message: "Temporary password generated. Please copy and provide it to the student.",
      },
    };
  },
});
