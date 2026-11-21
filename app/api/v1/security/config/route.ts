import { defineRoute } from "@/core/http/defineRoute";
import { connectDB } from "@/lib/db";
import { Setting } from "@/modules/settings/model";
import { CentersService } from "@/modules/centers/service";
import { z } from "zod";

const updateSecuritySchema = z.object({
  idleTimeoutMinutes: z.number().min(1).max(120).optional(),
  absoluteTimeoutHours: z.number().min(1).max(72).optional(),
  maxLoginAttempts: z.number().min(3).max(20).optional(),
  lockoutDurationMinutes: z.number().min(1).max(120).optional(),
});

export const PATCH = defineRoute({
  permission: "security.manage",
  bodySchema: updateSecuritySchema,
  auditAction: "security.config.update",
  auditResource: {
    type: "SecurityConfig",
  },
  auditSummary: () => "Updated system security timeouts and login lockout thresholds",
  handler: async ({ session, body }) => {
    await connectDB();
    let centerId = session?.centerId;
    if (!centerId) {
      const center = await CentersService.getCenter();
      centerId = center?._id.toString();
    }

    const updates = Object.entries(body);
    for (const [key, value] of updates) {
      if (value !== undefined) {
        await Setting.findOneAndUpdate(
          { centerId, key },
          { $set: { value } },
          { upsert: true }
        );
      }
    }

    return { data: { success: true } };
  },
});
