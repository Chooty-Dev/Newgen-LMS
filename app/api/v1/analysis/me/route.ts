import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AnalysisService } from "@/modules/analysis/service";

export const GET = defineRoute({
  permission: "analysis.viewOwn",
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }
    const analysis = await AnalysisService.getStudentAnalysis(session.sub);
    return { data: analysis };
  },
});
