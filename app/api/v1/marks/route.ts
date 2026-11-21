import { defineRoute } from "@/core/http/defineRoute";
import { MarkService } from "@/modules/marks/service";
import { markFilterSchema } from "@/modules/marks/schema";

export const GET = defineRoute({
  permission: ["marks.view", "marks.viewOwn"],
  querySchema: markFilterSchema,
  handler: async ({ session, query }) => {
    // If student, view own submitted marks only
    const isStudent = session?.role === "student";
    const studentId = isStudent ? session.sub : query.studentId;

    return MarkService.listMarks({
      studentId,
      classId: query.classId,
      subjectId: query.subjectId,
      type: query.type,
      status: isStudent ? "submitted" : undefined,
    });
  },
});
