import { connectDB } from "@/lib/db";
import { RolePermissionModel, UserPermissionModel } from "./model";
import {
  Permission,
  UserRole,
  ALL_PERMISSIONS,
  SUPER_ADMIN_EXCLUSIVE,
  MODULE_GROUPS,
} from "@/core/rbac/permissions";
import { ROLE_DEFAULT_PERMISSIONS } from "@/core/rbac/defaults";
import { invalidatePermissionCache } from "@/core/rbac/resolver";
import { User } from "@/modules/users/model";
import mongoose from "mongoose";

export class PermissionsService {
  static async getPermissionsOverview() {
    await connectDB();

    // 1. Module catalog
    const moduleCatalog = MODULE_GROUPS;

    // 2. Role permissions
    const roleDocs = await RolePermissionModel.find().lean();
    const rolePermissions: Record<string, Permission[]> = {
      super_admin: ALL_PERMISSIONS,
      admin: ROLE_DEFAULT_PERMISSIONS.admin,
      teacher: ROLE_DEFAULT_PERMISSIONS.teacher,
      staff: ROLE_DEFAULT_PERMISSIONS.staff,
      student: ROLE_DEFAULT_PERMISSIONS.student,
    };

    for (const doc of roleDocs) {
      if (doc.role !== "super_admin") {
        rolePermissions[doc.role] = doc.permissions as Permission[];
      }
    }

    // 3. User overrides
    const overrides = await UserPermissionModel.find()
      .populate("userId", "name username role")
      .lean();

    return {
      moduleCatalog,
      rolePermissions,
      overrides: overrides.map((o) => ({
        id: o._id.toString(),
        userId: (o.userId as unknown as { _id: { toString: () => string } })?._id?.toString() || "",
        user: o.userId as unknown as { name: string; username: string; role: string },
        grants: o.grants,
        revokes: o.revokes,
      })),
      superAdminExclusive: SUPER_ADMIN_EXCLUSIVE,
    };
  }

  static async updateRolePermissions(role: UserRole, permissions: Permission[]) {
    if (role === "super_admin") {
      throw new Error("Super Admin permissions cannot be modified");
    }

    await connectDB();

    // Filter out super_admin exclusive permissions from non-super_admin roles
    const safePermissions = permissions.filter((p) => !SUPER_ADMIN_EXCLUSIVE.includes(p));

    await RolePermissionModel.findOneAndUpdate(
      { role },
      { $set: { permissions: safePermissions } },
      { upsert: true, returnDocument: "after" }
    );

    // Invalidate entire cache
    invalidatePermissionCache();

    return { role, permissions: safePermissions };
  }

  static async updateUserPermissions(
    userId: string,
    options: { grants?: Permission[]; revokes?: Permission[]; reset?: boolean }
  ) {
    await connectDB();
    const uId = new mongoose.Types.ObjectId(userId);

    const user = await User.findById(uId);
    if (!user) throw new Error("User not found");
    if (user.role === "super_admin") {
      throw new Error("Super Admin user permissions cannot be overridden");
    }

    if (options.reset) {
      await UserPermissionModel.deleteOne({ userId: uId });
      invalidatePermissionCache(userId);
      return { userId, reset: true };
    }

    const safeGrants = (options.grants || []).filter((p) => !SUPER_ADMIN_EXCLUSIVE.includes(p));
    const safeRevokes = options.revokes || [];

    await UserPermissionModel.findOneAndUpdate(
      { userId: uId },
      { $set: { grants: safeGrants, revokes: safeRevokes } },
      { upsert: true, returnDocument: "after" }
    );

    invalidatePermissionCache(userId);
    return { userId, grants: safeGrants, revokes: safeRevokes };
  }
}
