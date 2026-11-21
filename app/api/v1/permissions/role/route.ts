import { defineRoute } from "@/core/http/defineRoute";
import { PermissionsService } from "@/modules/permissions/service";
import { UserRole, Permission } from "@/core/rbac/permissions";
import { z } from "zod";

const updateRoleSchema = z.object({
  role: z.enum(["admin", "teacher", "staff", "student"]),
  permissions: z.array(z.string()),
});

export const PUT = defineRoute({
  permission: "permissions.manage",
  bodySchema: updateRoleSchema,
  auditAction: "permissions.role.update",
  auditResource: {
    type: "RolePermission",
  },
  auditSummary: ({ body }) => `Updated permissions for role: ${body.role}`,
  handler: async ({ body }) => {
    const { role, permissions } = body;
    const result = await PermissionsService.updateRolePermissions(
      role as UserRole,
      permissions as Permission[]
    );
    return { data: result };
  },
});
