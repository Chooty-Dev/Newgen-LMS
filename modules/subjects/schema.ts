import { z } from "zod";

export const createSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").trim(),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(10).trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  grades: z
    .array(z.coerce.number().min(6, "Grade must be between 6 and 12").max(12, "Grade must be between 6 and 12"))
    .min(1, "Please select at least one grade between 6 and 12")
    .default([6, 7, 8, 9, 10, 11]),
  status: z.enum(["active", "archived"]).default("active"),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(2).trim().optional(),
  code: z.string().min(2).max(10).trim().toUpperCase().optional(),
  description: z.string().optional().or(z.literal("")),
  grades: z
    .array(z.coerce.number().min(6, "Grade must be between 6 and 12").max(12, "Grade must be between 6 and 12"))
    .min(1, "Please select at least one grade between 6 and 12")
    .optional(),
  status: z.enum(["active", "archived"]).optional(),
});
