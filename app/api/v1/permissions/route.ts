import { defineRoute } from "@/core/http/defineRoute";
import { PermissionsService } from "@/modules/permissions/service";

export const GET = defineRoute({
  permission: "permissions.view",
  handler: async () => {
    const overview = await PermissionsService.getPermissionsOverview();
    return { data: overview };
  },
});
