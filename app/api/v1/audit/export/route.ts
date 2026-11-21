import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/core/audit/model";

export const GET = defineRoute({
  permission: "audit.view",
  handler: async () => {
    await connectDB();

    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const headers = ["Timestamp", "Actor", "Role", "Action", "Resource Type", "Summary", "Result", "IP"];
    const rows = logs.map((log) => [
      log.createdAt ? new Date(log.createdAt).toISOString() : "",
      `"${(log.actorName || "System").replace(/"/g, '""')}"`,
      log.actorRole || "system",
      `"${log.action.replace(/"/g, '""')}"`,
      log.resource?.type || "General",
      `"${log.summary.replace(/"/g, '""')}"`,
      log.result,
      log.ip || "-",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-trail-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  },
});
