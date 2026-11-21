import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";

export const POST = defineRoute({
  permission: "admins.resetPassword",
  auditAction: "admins.resetPassword",
  auditResource: { type: "Admin" },
  auditSummary: ({ session, params }) => `${session?.name} reset password for admin ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const { temporaryPassword } = await UserService.resetUserPassword(
      { id: session.sub, role: session.role },
      params.id
    );

    return { data: { temporaryPassword, message: "Temporary password generated successfully." } };
  },
});
