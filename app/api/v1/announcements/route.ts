import { NextResponse } from "next/server";
import { defineRoute } from "@/core/http/defineRoute";
import { AnnouncementService } from "@/modules/announcements/service";
import { createAnnouncementSchema } from "@/modules/announcements/schema";

export const GET = defineRoute({
  permission: "announcements.view",
  handler: async ({ session, req }) => {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;

    return AnnouncementService.listAnnouncements({
      centerId: session?.centerId || "",
      studentId: session?.role === "student" ? session.sub : undefined,
      search,
    });
  },
});

export const POST = defineRoute({
  permission: "announcements.create",
  bodySchema: createAnnouncementSchema,
  auditAction: "announcements.create",
  auditResource: { type: "Announcement" },
  auditSummary: ({ session, body }) => `${session?.name} posted announcement: ${body.title}`,
  handler: async ({ session, body }) => {
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Not signed in" } }, { status: 401 });
    }

    const ann = await AnnouncementService.createAnnouncement(
      session.centerId,
      session.sub,
      body,
      session.role
    );

    return { data: ann };
  },
});
