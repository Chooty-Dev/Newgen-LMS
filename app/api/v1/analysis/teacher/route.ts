import { defineRoute } from "@/core/http/defineRoute";
import { AnalysisService } from "@/modules/analysis/service";

export const GET = defineRoute({
  permission: "analysis.viewStudents",
  handler: async ({ session }) => {
    const analytics = await AnalysisService.getTeacherAnalytics(session?.centerId);
    return { data: analytics };
  },
});
