import { z } from "zod";

export const markSingleAttendanceSchema = z.object({
  studentId: z.string().min(1),
  classId: z.string().min(1),
  assessmentId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  status: z.enum(["present", "absent", "late", "excused"]).default("present"),
  source: z.enum(["manual", "nfc"]).default("manual"),
});

export const sessionAttendanceBatchSchema = z.object({
  kind: z.enum(["class", "assessment"]),
  refId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  startTime: z.string().default("08:00"),
  endTime: z.string().default("17:00"),
  records: z.array(
    z.object({
      studentId: z.string().min(1),
      classId: z.string().optional().default(""),
      status: z.enum(["present", "absent", "late", "excused"]),
    })
  ),
  finalize: z.boolean().default(false),
});
