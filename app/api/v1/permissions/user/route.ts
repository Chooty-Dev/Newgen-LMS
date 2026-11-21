import { defineRoute } from "@/core/http/defineRoute";
import { PermissionsService } from "@/modules/permissions/service";
import { Permission } from "@/core/rbac/permissions";
import { z } from "zod";

const updateUserSchema = z.object({
  userId: z.string(),
  grants: z.array(z.string()).optional(),
  revokes: z.array(z.string()).optional(),
  reset: z.boolean().optional(),
});

export const PUT = defineRoute({
  permission: "permissions.manage",
  bodySchema: updateUserSchema,
  auditAction: "permissions.user.update",
  auditResource: {
    type: "UserPermission",
    getId: ({ body }) => body.userId,
  },
  auditSummary: ({ body }) =>
    body.reset
      ? `Reset user permissions to role defaults`
      : `Updated custom user permission grants and revokes`,
  handler: async ({ body }) => {
    const { userId, grants, revokes, reset } = body;
    const result = await PermissionsService.updateUserPermissions(userId, {
      grants: grants as Permission[],
      revokes: revokes as Permission[],
      reset,
    });
    return { data: result };
  },
});
