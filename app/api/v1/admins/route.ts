import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";
import { createUserSchema, listQuerySchema } from "@/modules/users/schema";

export const GET = defineRoute({
  permission: "admins.view",
  querySchema: listQuerySchema,
  handler: async ({ query }) => {
    return UserService.listAdmins({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
    });
  },
});

export const POST = defineRoute({
  permission: "admins.create",
  bodySchema: createUserSchema,
  auditAction: "admins.create",
  auditResource: { type: "Admin" },
  auditSummary: ({ session, body }) => `${session?.name} created a new admin: ${body.name}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const { user, temporaryPassword } = await UserService.createUser(
      { id: session.sub, role: session.role, centerId: session.centerId },
      { ...body, role: "admin" }
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
