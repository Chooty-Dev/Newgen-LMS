import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";
import { createUserSchema, listQuerySchema } from "@/modules/users/schema";

export const GET = defineRoute({
  permission: "staff.view",
  querySchema: listQuerySchema,
  handler: async ({ query, session }) => {
    return UserService.listStaff({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      centerId: session?.centerId,
    });
  },
});

export const POST = defineRoute({
  permission: "staff.create",
  bodySchema: createUserSchema,
  auditAction: "staff.create",
  auditResource: { type: "Staff" },
  auditSummary: ({ session, body }) => `${session?.name} added a new staff member: ${body.name}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const { user, temporaryPassword } = await UserService.createUser(
      { id: session.sub, role: session.role, centerId: session.centerId },
      { ...body, role: "staff" }
    );

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        temporaryPassword,
      },
    };
  },
});
