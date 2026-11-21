import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AnnouncementService } from "@/modules/announcements/service";
import { updateAnnouncementSchema } from "@/modules/announcements/schema";

export const PATCH = defineRoute({
  permission: "announcements.update",
  bodySchema: updateAnnouncementSchema,
  auditAction: "announcements.update",
  auditResource: { type: "Announcement" },
  auditSummary: ({ session, params, body }) => `${session?.name} updated announcement ID: ${params.id} (${body.title || ""})`,
  handler: async ({ params, body }) => {
    const updated = await AnnouncementService.updateAnnouncement(params.id, body as unknown as Record<string, unknown>);
    return { data: updated };
  },
});

export const DELETE = defineRoute({
  permission: "announcements.delete",
  auditAction: "announcements.delete",
  auditResource: { type: "Announcement" },
  auditSummary: ({ session, params }) => `${session?.name} deleted announcement ID: ${params.id}`,
  handler: async ({ session, params }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }
    await AnnouncementService.deleteAnnouncement(params.id, session.sub);
    return { data: { success: true, message: "Announcement deleted successfully" } };
  },
});
