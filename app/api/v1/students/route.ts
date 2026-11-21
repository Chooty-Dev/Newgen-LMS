import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";
import { createUserSchema, listQuerySchema } from "@/modules/users/schema";
import { ClassModel } from "@/modules/classes/model";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "students.view",
  querySchema: listQuerySchema,
  handler: async ({ session, query }) => {
    let teacherClassesOnly: string[] | undefined;

    // If teacher, restrict to students in own classes
    if (session?.role === "teacher") {
      const myClasses = await ClassModel.find({
        teacherId: new mongoose.Types.ObjectId(session.sub),
        deletedAt: null,
      }).select("_id");
      teacherClassesOnly = myClasses.map((c) => c._id.toString());
    }

    const result = await UserService.listStudents({
      centerId: session?.centerId || "",
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
      classId: query.classId,
      group: query.group,
      teacherClassesOnly,
    });

    return result;
  },
});

export const POST = defineRoute({
  permission: "students.create",
  bodySchema: createUserSchema,
  auditAction: "students.create",
  auditResource: { type: "Student" },
  auditSummary: ({ session, body }) => `${session?.name} created a new student: ${body.name}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const { user, temporaryPassword } = await UserService.createUser(
      { id: session.sub, role: session.role, centerId: session.centerId },
      { ...body, role: "student" }
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
