import { z } from "zod";

export const evaluateMarksSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  status: z.enum(["draft", "submitted"]).default("submitted"),
  entries: z.array(
    z.object({
      studentId: z.string().min(1),
      classId: z.string().min(1),
      score: z.number().min(0),
      attendanceStatus: z.enum(["present", "absent", "excused"]).default("present"),
      remarks: z.string().optional().or(z.literal("")),
    })
  ),
});

export const markFilterSchema = z.object({
  studentId: z.string().optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

export function calculateGrade(percentage: number): "A" | "B" | "C" | "S" | "W" {
  if (percentage >= 75) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 55) return "C";
  if (percentage >= 35) return "S";
  return "W";
}
