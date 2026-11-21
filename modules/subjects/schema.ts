import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").trim(),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(10).trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "archived"]).default("active"),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(2).trim().optional(),
  code: z.string().min(2).max(10).trim().toUpperCase().optional(),
  description: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "archived"]).optional(),
});
