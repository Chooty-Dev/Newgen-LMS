import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { MarkService } from "@/modules/marks/service";

export const GET = defineRoute({
  permission: "marks.export",
  handler: async ({ session, req }) => {
    const classId = new URL(req.url).searchParams.get("classId") || undefined;
    const studentId = session?.role === "student" ? session.sub : undefined;

    const { data } = await MarkService.listMarks({ classId, studentId });

    const headers = ["Date", "Student Name", "Username", "Subject", "Class", "Type", "Title", "Marks", "Out Of", "Percentage", "Grade", "Status"];
    const rows = data.map((m) => [
      m.date,
      `"${m.studentName.replace(/"/g, '""')}"`,
      m.studentUsername,
      `"${m.subject.replace(/"/g, '""')}"`,
      `"${m.class.replace(/"/g, '""')}"`,
      m.type,
      `"${m.title.replace(/"/g, '""')}"`,
      m.score,
      m.totalMarks,
      `${m.percentage}%`,
      m.grade,
      m.attendanceStatus,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="marks-${Date.now()}.csv"`,
      },
    });
  },
});
