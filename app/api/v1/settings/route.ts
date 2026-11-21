import { defineRoute } from "@/core/http/defineRoute";
import { SettingsService } from "@/modules/settings/service";
import { CentersService } from "@/modules/centers/service";
import { z } from "zod";

const updateSettingsSchema = z.object({
  performanceWeights: z
    .object({
      marks: z.number().min(0).max(1),
      attendance: z.number().min(0).max(1),
      improvement: z.number().min(0).max(1),
    })
    .optional(),
  groupThresholds: z
    .object({
      excellent: z.number().min(0).max(100),
      medium: z.number().min(0).max(100),
    })
    .optional(),
  gradeScale: z
    .array(
      z.object({
        grade: z.string(),
        min: z.number().min(0).max(100),
      })
    )
    .optional(),
});

export const GET = defineRoute({
  permission: "settings.system",
  handler: async ({ session }) => {
    let centerId = session?.centerId;
    if (!centerId) {
      const center = await CentersService.getCenter();
      centerId = center?._id.toString();
    }
    const settings = await SettingsService.getAllSettings(centerId!);
    return { data: settings };
  },
});

export const PUT = defineRoute({
  permission: "settings.system",
  bodySchema: updateSettingsSchema,
  auditAction: "settings.update",
  auditResource: {
    type: "Setting",
  },
  auditSummary: () => "Updated system settings (performance weights / thresholds / grade scale)",
  handler: async ({ session, body }) => {
    let centerId = session?.centerId;
    if (!centerId) {
      const center = await CentersService.getCenter();
      centerId = center?._id.toString();
    }

    if (body.performanceWeights) {
      await SettingsService.updateSetting(centerId!, "performanceWeights", body.performanceWeights);
    }
    if (body.groupThresholds) {
      await SettingsService.updateSetting(centerId!, "groupThresholds", body.groupThresholds);
    }
    if (body.gradeScale) {
      await SettingsService.updateSetting(centerId!, "gradeScale", body.gradeScale);
    }

    const updated = await SettingsService.getAllSettings(centerId!);
    return { data: updated };
  },
});
