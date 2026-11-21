import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { z } from "zod";
import { User } from "@/modules/users/model";
import { comparePassword, hashPassword, validatePasswordStrength } from "@/core/auth/password";
import { revokeAllUserSessions } from "@/core/auth/session";
import { connectDB } from "@/lib/db";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(10, "New password must be at least 10 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export const POST = defineRoute({
  requireAuth: true,
  bodySchema: changePasswordSchema,
  auditAction: "account.changePassword",
  auditResource: { type: "User" },
  auditSummary: ({ session }) => `${session?.name} changed their account password`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.sub).select("+passwordHash");
    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User account not found" } }, { status: 404 });
    }

    // Verify current password
    const valid = await comparePassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: { code: "INVALID_CURRENT_PASSWORD", message: "Your current password was entered incorrectly" } },
        { status: 400 }
      );
    }

    // Check strength
    const strength = validatePasswordStrength(body.newPassword, user.username);
    if (!strength.valid) {
      return NextResponse.json(
        { error: { code: "WEAK_PASSWORD", message: strength.message || "Password is too weak" } },
        { status: 400 }
      );
    }

    // Hash and update
    const newHash = await hashPassword(body.newPassword);
    await User.updateOne(
      { _id: user._id },
      {
        passwordHash: newHash,
        mustChangePassword: false,
        $inc: { permissionsVersion: 1 },
      }
    );

    // Revoke other sessions
    await revokeAllUserSessions(user._id.toString(), session.jti);

    return { data: { success: true, message: "Password updated successfully" } };
  },
});
