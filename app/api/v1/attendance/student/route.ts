import { defineRoute } from "@/core/http/defineRoute";
import { AttendanceService } from "@/modules/attendance/service";

export const GET = defineRoute({
  permission: "attendance.view",
  handler: async ({ session, req }) => {
    const url = new URL(req.url);
    const studentId = url.searchParams.get("studentId");
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

    if (!studentId) {
      throw new Error("studentId query parameter is required");
    }

    const schedule = await AttendanceService.getStudentDaySchedule({
      centerId: session?.centerId || "",
      studentId,
      date,
    });

    return { data: schedule };
  },
});
