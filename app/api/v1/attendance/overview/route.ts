import { defineRoute } from "@/core/http/defineRoute";
import { AttendanceService } from "@/modules/attendance/service";

export const GET = defineRoute({
  permission: "attendance.view",
  handler: async ({ session, req }) => {
    const date = new URL(req.url).searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const staffId = session?.role === "staff" ? session.sub : undefined;

    const overview = await AttendanceService.getDailyOverview({
      centerId: session?.centerId || "",
      date,
      staffId,
    });

    return { data: overview };
  },
});
