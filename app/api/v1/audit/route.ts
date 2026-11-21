import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/core/audit/model";

export const GET = defineRoute({
  permission: "audit.view",
  handler: async ({ req }) => {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const result = searchParams.get("result") || "";
    const action = searchParams.get("action") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (result && ["success", "denied", "failed"].includes(result)) {
      query.result = result;
    }

    if (action) {
      query.action = action;
    }

    if (search) {
      query.$or = [
        { summary: { $regex: search, $options: "i" } },
        { actorName: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
      ];
    }

    const [logs, total, totalSuccess, totalDenied, totalFailed] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
      AuditLog.countDocuments({ result: "success" }),
      AuditLog.countDocuments({ result: "denied" }),
      AuditLog.countDocuments({ result: "failed" }),
    ]);

    const formatted = logs.map((log) => ({
      id: log._id.toString(),
      actorId: log.actorId?.toString(),
      actorName: log.actorName || "System",
      actorRole: log.actorRole || "system",
      action: log.action,
      resourceType: log.resource?.type || "General",
      resourceId: log.resource?.id,
      summary: log.summary,
      before: log.before,
      after: log.after,
      result: log.result,
      ip: log.ip,
      userAgent: log.userAgent,
      requestId: log.requestId,
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : "",
    }));

    return {
      data: formatted,
      stats: {
        total,
        totalSuccess,
        totalDenied,
        totalFailed,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
});
