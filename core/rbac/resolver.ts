import { Permission, UserRole, ALL_PERMISSIONS, SUPER_ADMIN_EXCLUSIVE } from "./permissions";
import { ROLE_DEFAULT_PERMISSIONS } from "./defaults";
import { RolePermissionModel, UserPermissionModel } from "@/modules/permissions/model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

interface CacheEntry {
  permissions: Permission[];
  cachedAt: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export async function resolveEffectivePermissions(
  userId: string,
  role: UserRole,
  permissionsVersion: number
): Promise<Permission[]> {
  // Super Admin unconditionally has all permissions
  if (role === "super_admin") {
    return ALL_PERMISSIONS;
  }

  const cacheKey = `${userId}:${permissionsVersion}`;
  const now = Date.now();
  const cached = permissionCache.get(cacheKey);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.permissions;
  }

  await connectDB();

  // 1. Get role defaults from DB or fallback to static defaults
  let basePermissions: Permission[] = ROLE_DEFAULT_PERMISSIONS[role] || [];
  try {
    const roleDoc = await RolePermissionModel.findOne({ role }).lean();
    if (roleDoc && roleDoc.permissions?.length) {
      basePermissions = roleDoc.permissions as Permission[];
    }
  } catch {
    // Fallback to static defaults
  }

  // 2. Fetch user overrides
  let grants: Permission[] = [];
  let revokes: Permission[] = [];
  try {
    const userOverride = await UserPermissionModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();
    if (userOverride) {
      grants = (userOverride.grants || []) as Permission[];
      revokes = (userOverride.revokes || []) as Permission[];
    }
  } catch {
    // Ignore override fetch error
  }

  // 3. Compute effective permissions: (base + grants) - revokes
  const permSet = new Set<Permission>(basePermissions);
  for (const g of grants) {
    permSet.add(g);
  }
  for (const r of revokes) {
    permSet.delete(r);
  }

  // Security barrier: non-super_admin users can NEVER be granted super_admin exclusive permissions
  for (const exclusive of SUPER_ADMIN_EXCLUSIVE) {
    permSet.delete(exclusive);
  }

  const result = Array.from(permSet);

  permissionCache.set(cacheKey, {
    permissions: result,
    cachedAt: now,
  });

  return result;
}

export function invalidatePermissionCache(userId?: string) {
  if (userId) {
    for (const key of permissionCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        permissionCache.delete(key);
      }
    }
  } else {
    permissionCache.clear();
  }
}
