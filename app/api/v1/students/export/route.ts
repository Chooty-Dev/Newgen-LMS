import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { UserService } from "@/modules/users/service";

export const GET = defineRoute({
  permission: "students.export",
  handler: async ({ session }) => {
    const { data } = await UserService.listStudents({
      centerId: session?.centerId || "",
      page: 1,
      limit: 1000,
    });

    const headers = ["Admission No", "Name", "Username", "Email", "Phone", "Grade", "Status", "Score", "Group"];
    const rows = data.map((s) => [
      s.admissionNo,
      `"${s.name.replace(/"/g, '""')}"`,
      s.username,
      s.email || "",
      s.phone || "",
      s.grade || "",
      s.status,
      s.performanceScore,
      s.group,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="students-${Date.now()}.csv"`,
      },
    });
  },
});
