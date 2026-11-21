import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";
import { createUserSchema, listQuerySchema } from "@/modules/users/schema";

export const GET = defineRoute({
  permission: "teachers.view",
  querySchema: listQuerySchema,
  handler: async ({ query, session }) => {
    return UserService.listTeachers({
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      centerId: session?.centerId,
    });
  },
});

export const POST = defineRoute({
  permission: "teachers.create",
  bodySchema: createUserSchema,
  auditAction: "teachers.create",
  auditResource: { type: "Teacher" },
  auditSummary: ({ session, body }) => `${session?.name} added a new teacher: ${body.name}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    // Only super_admin and admin can assign teachers to multiple centers
    let centerIds = body.centerIds;
    if (session.role !== "super_admin" && session.role !== "admin") {
      centerIds = session.centerId ? [session.centerId] : [];
    }

    const { user, temporaryPassword } = await UserService.createUser(
      { id: session.sub, role: session.role, centerId: session.centerId },
      { ...body, centerIds, role: "teacher" }
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
