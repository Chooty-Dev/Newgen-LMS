import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  username: z.string().min(3, "Username must be at least 3 characters").max(30).trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  role: z.enum(["super_admin", "admin", "teacher", "staff", "student"]).optional().default("student"),
  // Student specific
  admissionNo: z.string().optional(),
  grade: z.string().optional(),
  classId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  guardian: z
    .object({
      name: z.string().default(""),
      phone: z.string().default(""),
      relation: z.string().default("Parent"),
    })
    .optional(),
  // Teacher/Staff specific
  title: z.string().optional(),
  position: z.string().optional(),
  centerIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  status: z.enum(["active", "disabled"]).optional(),
  // Student specific
  grade: z.string().optional(),
  dateOfBirth: z.string().optional(),
  guardian: z
    .object({
      name: z.string(),
      phone: z.string(),
      relation: z.string(),
    })
    .optional(),
  // Teacher/Staff specific
  title: z.string().optional(),
  position: z.string().optional(),
  centerIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim().optional(),
  phone: z.string().optional().or(z.literal("")),
  avatarUrl: z.string().optional().or(z.literal("")),
  socialLinks: z
    .array(
      z.object({
        platform: z.string(),
        url: z.string().url("Must be a valid URL"),
      })
    )
    .optional(),
});

export const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(1000).default(10),
  search: z.string().optional().default(""),
  status: z.string().optional(),
  classId: z.string().optional(),
  group: z.string().optional(),
});
