import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AttendanceService } from "@/modules/attendance/service";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const GET = defineRoute({
  permission: ["attendance.view", "attendance.mark", "attendance.create"],
  handler: async ({ session, req }) => {
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
        { status: 401 }
      );
    }

    const rawDate = new URL(req.url).searchParams.get("date");
    const date = rawDate || new Date().toISOString().slice(0, 10);

    if (!DATE_PATTERN.test(date)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid date format. Expected YYYY-MM-DD." } },
        { status: 400 }
      );
    }

    const data = await AttendanceService.getScheduledSessionsForDate({
      centerId: session.centerId || "",
      date,
      staffId: session.role === "staff" ? session.sub : undefined,
      teacherId: session.role === "teacher" ? session.sub : undefined,
    });

    return { data };
  },
});
