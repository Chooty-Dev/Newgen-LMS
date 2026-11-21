import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/core/auth/model";
import { Setting } from "@/modules/settings/model";
import { AuditLog } from "@/core/audit/model";

interface SecurityConfig {
  idleTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

export const GET = defineRoute({
  permission: "security.view",
  handler: async () => {
    await connectDB();

    // 1. Fetch config settings
    const settings = await Setting.find({
      key: { $in: ["idleTimeoutMinutes", "absoluteTimeoutHours", "maxLoginAttempts", "lockoutDurationMinutes"] },
    }).lean();

    const getVal = (key: string, def: number) => {
      const s = settings.find((item) => item.key === key);
      return typeof s?.value === "number" ? s.value : def;
    };

    const config: SecurityConfig = {
      idleTimeoutMinutes: getVal("idleTimeoutMinutes", 15),
      absoluteTimeoutHours: getVal("absoluteTimeoutHours", 12),
      maxLoginAttempts: getVal("maxLoginAttempts", 5),
      lockoutDurationMinutes: getVal("lockoutDurationMinutes", 15),
    };

    // 2. Fetch center-wide active sessions (revokedAt: null, expiresAt > now)
    const now = new Date();
    const activeSessions = await SessionModel.find({
      revokedAt: null,
      expiresAt: { $gt: now },
    })
      .populate("userId", "name username role email")
      .sort({ lastActiveAt: -1 })
      .limit(50)
      .lean();

    // 3. Fetch recent failed login attempts
    const failedLogins = await AuditLog.find({
      action: "auth.login",
      result: { $in: ["denied", "failed"] },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      data: {
        config,
        activeSessions: activeSessions.map((s) => ({
          id: s._id,
          user: s.userId as unknown as { name: string; username: string; role: string; email: string },
          ip: s.ip,
          userAgent: s.userAgent,
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : "",
          lastActiveAt: s.lastActiveAt ? new Date(s.lastActiveAt).toISOString() : "",
          expiresAt: s.expiresAt ? new Date(s.expiresAt).toISOString() : "",
        })),
        failedLogins: failedLogins.map((f) => ({
          id: f._id.toString(),
          identifier: f.summary,
          ip: f.ip || "unknown",
          time: f.createdAt ? new Date(f.createdAt).toISOString() : "",
          result: f.result,
        })),
      },
    };
  },
});
