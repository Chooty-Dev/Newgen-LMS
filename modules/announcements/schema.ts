import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().min(2, "Title is required").trim(),
  body: z.string().min(5, "Body text must be at least 5 characters").trim(),
  audience: z.enum(["center", "classes"]).default("center"),
  classIds: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
  publishAt: z.string().optional(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();
