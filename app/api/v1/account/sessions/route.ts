import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { SessionModel } from "@/core/auth/model";
import { revokeAllUserSessions } from "@/core/auth/session";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  permission: "account.update",
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await connectDB();
    const now = new Date();
    const sessions = await SessionModel.find({
      userId: new mongoose.Types.ObjectId(session.sub),
      expiresAt: { $gt: now },
      revokedAt: { $exists: false },
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    const data = sessions.map((s) => ({
      id: s._id,
      ip: s.ip,
      userAgent: s.userAgent,
      lastActiveAt: s.lastActiveAt,
      isCurrent: s._id === session.jti,
    }));

    return { data };
  },
});

export const POST = defineRoute({
  permission: "account.update",
  auditAction: "account.revokeOtherSessions",
  auditResource: { type: "Session" },
  auditSummary: ({ session }) => `${session?.name} signed out all other devices`,
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await revokeAllUserSessions(session.sub, session.jti);

    return { data: { success: true, message: "Signed out of all other devices" } };
  },
});
