import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { User, TeacherProfile } from "@/modules/users/model";
import { Center } from "@/modules/centers/model";
import { resolveEffectivePermissions } from "@/core/rbac/resolver";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

export const GET = defineRoute({
  requireAuth: true,
  handler: async ({ session }) => {
    if (!session) {
      return NextResponse.json({ data: null });
    }

    await connectDB();
    const user = await User.findById(session.sub).lean();
    if (!user || user.status === "disabled" || user.deletedAt) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Account not active" } },
        { status: 401 }
      );
    }

    const permissions = await resolveEffectivePermissions(
      user._id.toString(),
      user.role,
      user.permissionsVersion
    );

    // Resolve current center & assigned centers
    let currentCenter = await Center.findById(user.centerId).lean();
    if (!currentCenter) {
      currentCenter = await Center.findOne().lean();
      if (currentCenter) {
        await User.updateOne({ _id: user._id }, { $set: { centerId: currentCenter._id } });
        user.centerId = currentCenter._id;
      }
    }
    let assignedCenters: Array<{ id: string; name: string }> = [];

    if (user.role === "super_admin" || user.role === "admin") {
      const allCenters = await Center.find().sort({ createdAt: 1 }).lean();
      assignedCenters = allCenters.map((c) => ({
        id: c._id.toString(),
        name: c.name,
      }));
    } else {
      const centerIdSet = new Set<string>();
      if (user.centerId) centerIdSet.add(user.centerId.toString());
      if (user.assignedCenterIds && Array.isArray(user.assignedCenterIds)) {
        user.assignedCenterIds.forEach((id: mongoose.Types.ObjectId) => centerIdSet.add(id.toString()));
      }
      if (user.role === "teacher") {
        const teacherProfile = await TeacherProfile.findOne({ userId: user._id }).lean();
        if (teacherProfile?.assignedCenterIds && Array.isArray(teacherProfile.assignedCenterIds)) {
          teacherProfile.assignedCenterIds.forEach((id: mongoose.Types.ObjectId) => centerIdSet.add(id.toString()));
        }
        if (centerIdSet.size <= 1) {
          const allCenters = await Center.find().lean();
          allCenters.forEach((c) => centerIdSet.add(c._id.toString()));
        }
      }

      const centers = await Center.find({
        _id: { $in: Array.from(centerIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
      }).lean();

      assignedCenters = centers.map((c) => ({
        id: c._id.toString(),
        name: c.name,
      }));

      if (assignedCenters.length === 0 && currentCenter) {
        assignedCenters = [{ id: currentCenter._id.toString(), name: currentCenter.name }];
      }
    }

    return {
      data: {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        centerId: user.centerId.toString(),
        centerName: currentCenter?.name || "Education Center",
        assignedCenters,
        avatarUrl: user.avatarUrl,
        socialLinks: user.socialLinks || [],
        mustChangePassword: user.mustChangePassword,
        permissions,
      },
    };
  },
});
