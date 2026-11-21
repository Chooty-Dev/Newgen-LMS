import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { SessionModel } from "@/core/auth/model";
import { z } from "zod";

const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
});

export const POST = defineRoute({
  permission: "security.manage",
  bodySchema: revokeSessionSchema,
  auditAction: "security.session.revoke",
  auditResource: {
    type: "Session",
    getId: ({ body }) => body.sessionId,
  },
  auditSummary: ({ body }) => `Revoked active session ${body.sessionId}`,
  handler: async ({ body }) => {
    await connectDB();
    const { sessionId } = body;

    const session = await SessionModel.findByIdAndUpdate(
      sessionId,
      { $set: { revokedAt: new Date() } },
      { new: true }
    );

    if (!session) {
      throw new Error("Session not found");
    }

    return { data: { revoked: true, sessionId } };
  },
});
