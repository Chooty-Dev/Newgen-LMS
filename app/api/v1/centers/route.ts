import { defineRoute } from "@/core/http/defineRoute";
import { CentersService } from "@/modules/centers/service";
import { z } from "zod";

const createCenterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("Asia/Colombo"),
});

const updateCenterSchema = z.object({
  id: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().default("Asia/Colombo"),
});

const deleteCenterQuerySchema = z.object({
  id: z.string().optional(),
});

export const GET = defineRoute({
  permission: "centers.view",
  handler: async ({ session }) => {
    if (session?.role === "super_admin" || session?.role === "admin") {
      const centers = await CentersService.listCenters();
      return { data: centers };
    }
    const center = await CentersService.getCenter(session?.centerId);
    return { data: center ? [center] : [] };
  },
});

export const POST = defineRoute({
  permission: "centers.create",
  bodySchema: createCenterSchema,
  auditAction: "center.create",
  auditResource: {
    type: "Center",
    getId: (ctx) => (ctx as unknown as { result?: { _id: string } })?.result?._id,
  },
  auditSummary: ({ body }) => `Created education center: ${body.name}`,
  handler: async ({ body, session }) => {
    const created = await CentersService.createCenter(body, session?.sub);
    return { data: created };
  },
});

export const PUT = defineRoute({
  permission: "centers.update",
  bodySchema: updateCenterSchema,
  auditAction: "center.update",
  auditResource: {
    type: "Center",
    getId: ({ body }) => body.id,
  },
  auditSummary: ({ body }) => `Updated center profile: ${body.name}`,
  handler: async ({ body }) => {
    const { id, ...data } = body;
    const updated = await CentersService.updateCenter(id, data);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "centers.delete",
  querySchema: deleteCenterQuerySchema,
  auditAction: "center.delete",
  auditResource: {
    type: "Center",
    getId: ({ query }) => query.id,
  },
  auditSummary: ({ query }) => `Deleted education center: ${query.id}`,
  handler: async ({ query, req }) => {
    let id = query.id;
    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {
        // No body
      }
    }
    if (!id) {
      throw new Error("Center ID is required");
    }
    await CentersService.deleteCenter(id);
    return { success: true };
  },
});
