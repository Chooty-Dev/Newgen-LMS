import { AuditLog } from "./model";
import { connectDB } from "@/lib/db";
import { UserRole } from "@/core/rbac/permissions";
import mongoose from "mongoose";

export interface LogAuditParams {
  actorId?: string;
  actorRole?: UserRole;
  actorName?: string;
  action: string;
  resource: {
    type: string;
    id?: string;
  };
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  result: "success" | "denied" | "failed";
  ip?: string;
  userAgent?: string;
  requestId: string;
}

// Remove sensitive fields from audit logs
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "sessionSecret",
  "jwtSecret",
  "secret",
]);

export function sanitizeAuditData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      sanitized[key] = sanitizeAuditData(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function logAudit(params: LogAuditParams): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: params.actorId ? new mongoose.Types.ObjectId(params.actorId) : undefined,
      actorRole: params.actorRole,
      actorName: params.actorName,
      action: params.action,
      resource: params.resource,
      summary: params.summary,
      before: sanitizeAuditData(params.before),
      after: sanitizeAuditData(params.after),
      result: params.result,
      ip: params.ip,
      userAgent: params.userAgent,
      requestId: params.requestId,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
