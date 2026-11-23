import { defineRoute } from "@/core/http/defineRoute";
import { AnalysisService } from "@/modules/analysis/service";

export const GET = defineRoute({
  permission: "analysis.viewStudents",
  handler: async ({ session }) => {
    const teacherId = session?.role === "teacher" ? session.sub : undefined;
    const analytics = await AnalysisService.getTeacherAnalytics(session?.centerId, teacherId);
    return { data: analytics };
  },
});
