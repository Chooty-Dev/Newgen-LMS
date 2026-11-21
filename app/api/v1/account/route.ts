import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User } from "@/modules/users/model";
import { updateAccountSchema } from "@/modules/users/schema";
import { connectDB } from "@/lib/db";

export const GET = defineRoute({
  permission: "account.update",
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.sub).lean();
    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    }

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatarUrl: user.avatarUrl,
        socialLinks: user.socialLinks || [],
        joinedAt: user.createdAt,
      },
    };
  },
});

export const PATCH = defineRoute({
  permission: "account.update",
  bodySchema: updateAccountSchema,
  auditAction: "account.update",
  auditResource: { type: "User" },
  auditSummary: ({ session }) => `${session?.name} updated account details`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(session.sub);
    if (!user) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "User not found" } }, { status: 404 });
    }

    if (body.name) user.name = body.name;
    if (body.phone !== undefined) user.phone = body.phone || undefined;
    if (body.avatarUrl !== undefined) user.avatarUrl = body.avatarUrl || undefined;
    if (body.socialLinks) user.socialLinks = body.socialLinks;
    await user.save();

    return { data: { success: true, message: "Profile updated successfully" } };
  },
});
