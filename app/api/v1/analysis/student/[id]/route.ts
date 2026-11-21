import { defineRoute } from "@/core/http/defineRoute";
import { AnalysisService } from "@/modules/analysis/service";

export const GET = defineRoute({
  permission: "analysis.viewStudents",
  handler: async ({ session, params }) => {
    // If student, can only view own analysis
    let studentId = params.id;
    if (session?.role === "student") {
      studentId = session.sub;
    }

    const analysis = await AnalysisService.getStudentAnalysis(studentId);
    return { data: analysis };
  },
});
