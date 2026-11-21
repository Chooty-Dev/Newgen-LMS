import { z } from "zod";

export const createAssessmentSchema = z.object({
  title: z.string().min(2, "Title is required").trim(),
  type: z.enum(["exam", "test", "mcq_quiz", "paper", "assignment"]),
  subjectId: z.string().min(1, "Subject is required"),
  classIds: z.array(z.string()).min(1, "Select at least one class"),
  totalMarks: z.number().min(1).default(100),
  passMark: z.number().min(0).default(40),
  weight: z.number().min(0.1).default(1.0),
  dateMode: z.enum(["single", "multiple"]).default("single"),
  sessions: z
    .array(
      z.object({
        date: z.string().min(1, "Date is required"),
        startTime: z.string().min(1, "Start time is required"),
        endTime: z.string().min(1, "End time is required"),
      })
    )
    .min(1, "At least one session date is required"),
  evaluatorIds: z.array(z.string()).default([]),
  status: z.enum(["draft", "scheduled", "ongoing", "waiting_marks", "completed"]).default("scheduled"),
});

export const updateAssessmentSchema = createAssessmentSchema.partial();
