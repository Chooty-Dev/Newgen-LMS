import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().min(2, "Class name is required").trim(),
  subjectId: z.string().min(1, "Subject is required"),
  grade: z.coerce.number().min(6, "Grade must be between 6 and 12").max(12, "Grade must be between 6 and 12").optional(),
  teacherId: z.string().min(1, "Teacher is required"),
  staffIds: z.array(z.string()).default([]),
  scheduleType: z.enum(["regular", "special"]),
  // Regular schedule
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Special schedule
  sessions: z
    .array(
      z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
      })
    )
    .optional(),
  capacity: z.number().min(1).default(50),
});

export const updateClassSchema = createClassSchema.partial();

export const enrollStudentsSchema = z.object({
  studentIds: z.array(z.string()).min(1, "Select at least one student"),
});
