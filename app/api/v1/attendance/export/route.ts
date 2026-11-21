import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { Attendance } from "@/modules/attendance/model";
import { connectDB } from "@/lib/db";

export const GET = defineRoute({
  permission: "attendance.export",
  handler: async ({ req }) => {
    await connectDB();
    const date = new URL(req.url).searchParams.get("date");
    const query: Record<string, unknown> = {};
    if (date) query.date = date;

    const records = await Attendance.find(query)
      .populate("studentId", "name username")
      .populate("classId", "name")
      .populate("markedBy", "name")
      .sort({ date: -1 })
      .lean();

    const headers = ["Date", "Student Name", "Username", "Class", "Status", "Source", "Marked By"];
    const rows = records.map((r) => {
      const s = r.studentId as unknown as { name: string; username: string } | null;
      const c = r.classId as unknown as { name: string } | null;
      const m = r.markedBy as unknown as { name: string } | null;

      return [
        r.date,
        `"${(s?.name || "Student").replace(/"/g, '""')}"`,
        s?.username || "",
        `"${(c?.name || "-").replace(/"/g, '""')}"`,
        r.status,
        r.source,
        `"${(m?.name || "-").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${Date.now()}.csv"`,
      },
    });
  },
});
