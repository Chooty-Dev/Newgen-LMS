import { defineRoute } from "@/core/http/defineRoute";
import { CentersService } from "@/modules/centers/service";
import { z } from "zod";

const updateCenterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("Asia/Colombo"),
});

export const GET = defineRoute({
  permission: "centers.view",
  handler: async ({ params }) => {
    const center = await CentersService.getCenter(params.id);
    if (!center) throw new Error("Center not found");
    return { data: center };
  },
});

export const PUT = defineRoute({
  permission: "centers.update",
  bodySchema: updateCenterSchema,
  auditAction: "center.update",
  auditResource: {
    type: "Center",
    getId: ({ params }) => params.id,
  },
  auditSummary: ({ body }) => `Updated center profile: ${body.name}`,
  handler: async ({ params, body }) => {
    const updated = await CentersService.updateCenter(params.id, body);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "centers.delete",
  auditAction: "center.delete",
  auditResource: {
    type: "Center",
    getId: ({ params }) => params.id,
  },
  auditSummary: ({ params }) => `Deleted education center: ${params.id}`,
  handler: async ({ params }) => {
    await CentersService.deleteCenter(params.id);
    return { success: true };
  },
});
