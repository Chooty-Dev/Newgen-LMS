import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { defineRoute } from "@/core/http/defineRoute";
import { User, TeacherProfile } from "@/modules/users/model";
import { Center } from "@/modules/centers/model";
import { updateSessionCenter, COOKIE_NAME } from "@/core/auth/session";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

const switchCenterSchema = z.object({
  centerId: z.string().min(1, "Center ID is required"),
});

export const POST = defineRoute({
  requireAuth: true,
  bodySchema: switchCenterSchema,
  auditAction: "center.switch",
  auditSummary: ({ session, body }) =>
    `${session?.name} switched active education center to ID: ${body.centerId}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not signed in" } },
        { status: 401 }
      );
    }

    if (!mongoose.isValidObjectId(body.centerId)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Invalid center ID" } },
        { status: 400 }
      );
    }

    await connectDB();
    const targetCenter = await Center.findById(body.centerId);
    if (!targetCenter) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Target education center not found" } },
        { status: 404 }
      );
    }

    const user = await User.findById(session.sub);
    if (!user || user.status === "disabled" || user.deletedAt) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Account inactive" } },
        { status: 401 }
      );
    }

    // Permission check for switching center:
    // super_admin & admin: can switch to any center
    // teacher: can switch to any center in assignedCenterIds or primary centerId
    // others: can switch to assigned centers
    if (user.role !== "super_admin" && user.role !== "admin") {
      const allowedCenterIds: string[] = [];
      if (user.centerId) {
        allowedCenterIds.push(user.centerId.toString());
      }
      if (user.assignedCenterIds && user.assignedCenterIds.length > 0) {
        allowedCenterIds.push(...user.assignedCenterIds.map((id) => id.toString()));
      }

      if (user.role === "teacher") {
        const teacherProfile = await TeacherProfile.findOne({ userId: user._id });
        if (teacherProfile?.assignedCenterIds) {
          allowedCenterIds.push(...teacherProfile.assignedCenterIds.map((id) => id.toString()));
        }
        const allCenters = await Center.find().select("_id").lean();
        allowedCenterIds.push(...allCenters.map((c) => c._id.toString()));
      }

      const isAllowed = allowedCenterIds.includes(body.centerId);
      if (!isAllowed) {
        return NextResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You are not assigned to this education center",
            },
          },
          { status: 403 }
        );
      }
    }

    // Update user's current center in DB
    user.centerId = new mongoose.Types.ObjectId(body.centerId);
    await user.save();
    await User.updateOne(
      { _id: user._id },
      { $set: { centerId: user.centerId } }
    );

    // Generate new JWT with updated centerId
    const token = await updateSessionCenter(session, body.centerId);

    // Set updated session cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return {
      success: true,
      center: {
        id: targetCenter._id.toString(),
        name: targetCenter.name,
      },
    };
  },
});
