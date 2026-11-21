import { defineRoute } from "@/core/http/defineRoute";
import { ClassService } from "@/modules/classes/service";
import { enrollStudentsSchema } from "@/modules/classes/schema";

export const POST = defineRoute({
  permission: "classes.enrollStudents",
  bodySchema: enrollStudentsSchema,
  auditAction: "classes.enrollStudents",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params, body }) =>
    `${session?.name} enrolled ${body.studentIds.length} students in class ${params.id}`,
  handler: async ({ params, body }) => {
    await ClassService.enrollStudents(params.id, body.studentIds);
    return { data: { success: true, message: "Students enrolled successfully" } };
  },
});

export const DELETE = defineRoute({
  permission: "classes.enrollStudents",
  auditAction: "classes.removeStudent",
  auditResource: { type: "Class" },
  auditSummary: ({ session, params, req }) => {
    const sId = new URL(req.url).searchParams.get("studentId");
    return `${session?.name} removed student ${sId} from class ${params.id}`;
  },
  handler: async ({ params, req }) => {
    const studentId = new URL(req.url).searchParams.get("studentId");
    if (!studentId) {
      throw new Error("Student ID is required");
    }
    await ClassService.removeStudent(params.id, studentId);
    return { data: { success: true, message: "Student removed from class" } };
  },
});
