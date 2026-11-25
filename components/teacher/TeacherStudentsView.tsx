"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiFieldError, applyApiFieldErrors } from "@/lib/api-error";
import { z } from "zod";
import { FormLabel, FormError, inputErrorClass } from "@/components/ui/form-field";
import {
  Users,
  Award,
  AlertCircle,
  TrendingUp,
  Search,
  ArrowRight,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  GraduationCap,
  LayoutGrid,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface StudentRecord {
  id: string;
  name: string;
  username: string;
  admissionNo: string;
  grade: string;
  email?: string;
  phone?: string;
  status?: "active" | "disabled";
  performanceScore: number;
  group: "weak" | "medium" | "excellent";
  guardian?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

interface ClassOption {
  id: string;
  name: string;
}

const registerStudentSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens or underscores only")
    .trim(),
  password: z
    .string()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters",
    })
    .optional(),
  grade: z.string().optional(),
  classId: z.string().optional(),
  email: z
    .string()
    .trim()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    })
    .optional(),
  phone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

type RegisterStudentFormValues = z.infer<typeof registerStudentSchema>;

const editStudentSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").trim(),
  email: z
    .string()
    .trim()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    })
    .optional(),
  phone: z.string().optional(),
  grade: z.string().optional(),
  status: z.enum(["active", "disabled"]),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
});

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

export function TeacherStudentsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState<"all" | "excellent" | "medium" | "weak">("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  // Modals state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editStudent, setEditStudent] = React.useState<StudentRecord | null>(null);
  const [deleteStudent, setDeleteStudent] = React.useState<StudentRecord | null>(null);
  const [resetStudent, setResetStudent] = React.useState<StudentRecord | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // RHF Forms
  const registerForm = useForm<RegisterStudentFormValues>({
    mode: "all",
    resolver: zodResolver(registerStudentSchema) as unknown as Resolver<RegisterStudentFormValues>,
    defaultValues: {
      name: "",
      username: "",
      password: "",
      grade: "",
      classId: "",
      email: "",
      phone: "",
      guardianName: "",
      guardianPhone: "",
    },
  });

  const editForm = useForm<EditStudentFormValues>({
    mode: "all",
    resolver: zodResolver(editStudentSchema) as unknown as Resolver<EditStudentFormValues>,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      grade: "",
      status: "active",
      guardianName: "",
      guardianPhone: "",
    },
  });

  // Fetch students
  const { data, isLoading } = useQuery({
    queryKey: ["students", "teacher-directory", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/students?limit=250");
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const students: StudentRecord[] = data?.data || [];

  // Fetch teacher's classes for enrollment dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes", "teacher", user?.centerId],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });

  const teacherClasses: ClassOption[] = (classesData?.data || []).map(
    (c: { id: string; name: string }) => ({ id: c.id, name: c.name })
  );

  // Create Student Mutation
  const createMutation = useMutation({
    mutationFn: async (values: RegisterStudentFormValues) => {
      const payload = {
        name: values.name,
        username: values.username.toLowerCase().trim(),
        password: values.password || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        grade: values.grade || undefined,
        classId: values.classId || undefined,
        guardian: values.guardianName
          ? { name: values.guardianName, phone: values.guardianPhone || "", relation: "Parent" }
          : undefined,
        role: "student",
      };

      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new ApiFieldError(json.error?.message || "Failed to register student", json.error?.fields);
      }
      return json;
    },
    onSuccess: (resData) => {
      toast.success("Student registered successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      queryClient.invalidateQueries({ queryKey: ["analysis"] });
      setCreateOpen(false);
      registerForm.reset();
      if (resData.data?.temporaryPassword) {
        setTempPassword(resData.data.temporaryPassword);
      }
    },
    onError: (err: ApiFieldError) => {
      if (err.fields) {
        applyApiFieldErrors(err, registerForm.setError);
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes("username")) {
          registerForm.setError("username", { message: err.message });
        } else if (msg.includes("email")) {
          registerForm.setError("email", { message: err.message });
        } else if (msg.includes("phone")) {
          registerForm.setError("phone", { message: err.message });
        } else if (msg.includes("name")) {
          registerForm.setError("name", { message: err.message });
        }
      }
      toast.error(err.message || "Failed to register student");
    },
  });

  // Edit Student Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EditStudentFormValues }) => {
      const payload: Record<string, unknown> = {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        grade: values.grade || undefined,
        status: values.status,
        guardian: values.guardianName
          ? { name: values.guardianName, phone: values.guardianPhone || "", relation: "Parent" }
          : undefined,
      };

      const res = await fetch(`/api/v1/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new ApiFieldError(json.error?.message || "Failed to update student", json.error?.fields);
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Student updated successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditStudent(null);
    },
    onError: (err: ApiFieldError) => {
      if (err.fields) {
        applyApiFieldErrors(err, editForm.setError);
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes("email")) {
          editForm.setError("email", { message: err.message });
        } else if (msg.includes("phone")) {
          editForm.setError("phone", { message: err.message });
        } else if (msg.includes("name")) {
          editForm.setError("name", { message: err.message });
        }
      }
      toast.error(err.message || "Failed to update student");
    },
  });

  // Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/students/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete student");
      return json;
    },
    onSuccess: () => {
      toast.success("Student removed successfully");
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setDeleteStudent(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/students/${id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reset password");
      return json;
    },
    onSuccess: (resData) => {
      toast.success("Password reset successfully");
      setTempPassword(resData.data?.temporaryPassword || null);
      setResetStudent(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenEdit = (st: StudentRecord) => {
    setEditStudent(st);
    editForm.reset({
      name: st.name || "",
      email: st.email || "",
      phone: st.phone || "",
      grade: st.grade || "",
      status: st.status || "active",
      guardianName: st.guardian?.name || "",
      guardianPhone: st.guardian?.phone || "",
    });
  };

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  const filtered = students.filter((s) => {
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.username.toLowerCase().includes(search.toLowerCase()) ||
      (s.admissionNo && s.admissionNo.toLowerCase().includes(search.toLowerCase()));
    const matchesGroup = groupFilter === "all" || s.group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const excellentCount = students.filter((s) => s.group === "excellent").length;
  const mediumCount = students.filter((s) => s.group === "medium").length;
  const weakCount = students.filter((s) => s.group === "weak").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              My Students Directory
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Register new students, assign batches, monitor performance standings, and manage profile credentials seamlessly.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  registerForm.reset({
                    name: "",
                    username: "",
                    password: "",
                    grade: "",
                    classId: teacherClasses.length > 0 ? teacherClasses[0].id : "",
                    email: "",
                    phone: "",
                    guardianName: "",
                    guardianPhone: "",
                  });
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="size-4" />
                <span>Add a Student</span>
              </button>
              <Link
                href="/analysis"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all backdrop-blur-xs"
              >
                <TrendingUp className="size-4" />
                <span>Performance Insights</span>
              </Link>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-student-bg.webp"
                alt="Students"
                fill
                priority
                className="object-contain object-right drop-shadow-xl"
              />
            </div>
          </div>
        </div>

        {/* Search Bar + Theme Swatches + 4 Stats Cards */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          {/* Search bar on top */}
          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>

          {/* Quick Apple-style Color Palette Bar */}
          <CardThemeBar />

          {/* 4 Stats Cards tightly grouped in 2x2 grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {students.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Enrolled
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {excellentCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  High Performers
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                <UserCheck className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {mediumCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Good Standing
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {weakCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Needs Help
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Filter Tabs & View Mode Switcher (Cards / Table) */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(
            [
              { id: "all", label: "All Students", count: students.length },
              { id: "excellent", label: "High Performers", count: excellentCount },
              { id: "medium", label: "Good", count: mediumCount },
              { id: "weak", label: "Needs Help", count: weakCount },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setGroupFilter(tab.id)}
              className={cn(
                "h-10 px-4 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                groupFilter === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px]",
                  groupFilter === tab.id ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Mode Toggle: Cards (Default) vs Table */}
        <div className="flex items-center bg-secondary/80 border border-border rounded-full p-1 shadow-2xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
              viewMode === "cards"
                ? "bg-white text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="size-3.5" />
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer",
              viewMode === "table"
                ? "bg-white text-primary shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Table2 className="size-3.5" />
            <span>Table</span>
          </button>
        </div>
      </section>

      {/* 3. Students Content (Cards or Table) */}
      {isLoading ? (
        <DataLoader text="Loading students..." minHeight="min-h-[260px]" />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Users className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No students found</h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try adjusting your search query or click &quot;Add a Student&quot; to enroll a new student.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-in fade-in duration-300">
          {filtered.map((st) => {
            const initials = st.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase();

            const isEx = st.group === "excellent";
            const isWeak = st.group === "weak";

            return (
              <div
                key={st.id}
                className="card-themed rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative"
              >
                {/* 1. Top Row: Avatar + Student Name + Username / Admission + Status Tag */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Link
                      href={`/students/${st.username}`}
                      className="size-11 rounded-2xl card-themed-tag font-black text-sm flex items-center justify-center border border-border/70 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                    >
                      {initials}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/students/${st.username}`}
                        className="font-extrabold text-sm sm:text-base text-foreground truncate block group-hover:text-primary transition-colors leading-tight"
                        title={st.name}
                      >
                        {st.name}
                      </Link>
                      <p className="text-[11px] card-themed-sub font-medium truncate mt-0.5">
                        @{st.username} {st.admissionNo ? `• ${st.admissionNo}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    <CardTypeFlag type={st.status || "active"} />
                  </div>
                </div>

                {/* 2. Middle Row: Standing Score & Status Pill */}
                <div className="py-2 px-3 rounded-2xl bg-secondary/40 border border-border/50 flex items-center justify-between">
                  <span className="text-xs card-themed-sub font-bold">Standing Score</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-foreground tabular-nums">
                      {st.performanceScore || 70}/100
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-extrabold",
                        isEx
                          ? "bg-emerald-100 text-emerald-700"
                          : isWeak
                          ? "bg-amber-100 text-amber-700"
                          : "bg-secondary text-primary border border-border/60"
                      )}
                    >
                      {isEx ? "Excellent" : isWeak ? "Needs Help" : "Good"}
                    </span>
                  </div>
                </div>

                {/* 3. Bottom Row: Dedicated Action Line with Text Colors (No Backgrounds) */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  {/* Left: View & Analyze Links */}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/students/${st.username}`}
                      className="font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      title="View Student Profile"
                    >
                      <span>Profile</span>
                      <ArrowRight className="size-3" />
                    </Link>
                    <Link
                      href={`/analysis?studentId=${st.id}`}
                      className="font-bold text-sky-600 hover:underline inline-flex items-center gap-1 transition-colors"
                      title="View Student Analytics"
                    >
                      <span>Analysis</span>
                      <TrendingUp className="size-3" />
                    </Link>
                  </div>

                  {/* Right: Action Buttons with Interactive Text Colors (Blue, Amber/Yellow, Red) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(st)}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Edit Student"
                    >
                      <Edit className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetStudent(st)}
                      className="p-1 text-amber-500 hover:text-amber-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Reset Password"
                    >
                      <KeyRound className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStudent(st)}
                      className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Delete Student"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="card-themed rounded-3xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-secondary/60 border-b border-border/80 text-muted-foreground font-bold">
                <tr>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Admission</th>
                  <th className="py-3.5 px-4 text-center">Score</th>
                  <th className="py-3.5 px-4 text-center">Standing</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((st) => {
                  const isEx = st.group === "excellent";
                  const isWeak = st.group === "weak";
                  return (
                    <tr key={st.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl card-themed-tag font-bold text-xs flex items-center justify-center shrink-0 border border-border/60">
                            {st.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/students/${st.username}`}
                              className="font-extrabold text-foreground hover:text-primary transition-colors block truncate"
                            >
                              {st.name}
                            </Link>
                            <span className="text-[11px] card-themed-sub block truncate">
                              @{st.username}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {st.admissionNo || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className="text-foreground tabular-nums">
                          {st.performanceScore || 70}/100
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold",
                            isEx
                              ? "bg-emerald-100 text-emerald-700"
                              : isWeak
                              ? "bg-amber-100 text-amber-700"
                              : "bg-secondary text-primary border border-border/60"
                          )}
                        >
                          {isEx ? "Excellent" : isWeak ? "Needs Help" : "Good"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <CardTypeFlag type={st.status || "active"} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/students/${st.username}`}
                            className="text-primary font-bold hover:underline text-xs"
                            title="Profile"
                          >
                            Profile
                          </Link>
                          <Link
                            href={`/analysis?studentId=${st.id}`}
                            className="text-sky-600 font-bold hover:underline text-xs"
                            title="Analysis"
                          >
                            Analysis
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(st)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit Student"
                          >
                            <Edit className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetStudent(st)}
                            className="p-1 text-amber-500 hover:text-amber-600 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteStudent(st)}
                            className="p-1 text-rose-500 hover:text-rose-600 transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Student Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) registerForm.reset();
      }}>
        <DialogContent className="sm:max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">Register New Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={registerForm.handleSubmit((values) => createMutation.mutate(values), () => toast.error("Please fill in all required fields correctly"))} className="space-y-3.5 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Full Name" required />
                <input
                  type="text"
                  placeholder="e.g. Kasun Bandara"
                  {...registerForm.register("name")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.name)
                  )}
                />
                <FormError message={registerForm.formState.errors.name?.message} />
              </div>
              <div>
                <FormLabel label="Username" required />
                <input
                  type="text"
                  placeholder="e.g. kasun2026"
                  {...registerForm.register("username")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.username)
                  )}
                />
                <FormError message={registerForm.formState.errors.username?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Initial Password" optional />
                <input
                  type="password"
                  placeholder="e.g. Min 8 chars (or leave empty)"
                  {...registerForm.register("password")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.password)
                  )}
                />
                <FormError message={registerForm.formState.errors.password?.message} />
              </div>
              <div>
                <FormLabel label="Grade / Level" optional />
                <input
                  type="text"
                  placeholder="e.g. Grade 11"
                  {...registerForm.register("grade")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.grade)
                  )}
                />
                <FormError message={registerForm.formState.errors.grade?.message} />
              </div>
            </div>

            {/* Class Assignment Dropdown */}
            <div>
              <FormLabel label="Enroll into Class" optional>
                <GraduationCap className="size-3.5 text-primary" />
              </FormLabel>
              <select
                {...registerForm.register("classId")}
                className="w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">-- No class enrollment now --</option>
                {teacherClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Email Address" optional />
                <input
                  type="email"
                  placeholder="e.g. kasun@example.com"
                  {...registerForm.register("email")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.email)
                  )}
                />
                <FormError message={registerForm.formState.errors.email?.message} />
              </div>
              <div>
                <FormLabel label="Phone Number" optional />
                <input
                  type="text"
                  placeholder="e.g. 077 1234567"
                  {...registerForm.register("phone")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.phone)
                  )}
                />
                <FormError message={registerForm.formState.errors.phone?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
              <div>
                <FormLabel label="Guardian Name" optional />
                <input
                  type="text"
                  placeholder="e.g. S. Bandara"
                  {...registerForm.register("guardianName")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.guardianName)
                  )}
                />
                <FormError message={registerForm.formState.errors.guardianName?.message} />
              </div>
              <div>
                <FormLabel label="Guardian Phone" optional />
                <input
                  type="text"
                  placeholder="e.g. 071 9876543"
                  {...registerForm.register("guardianPhone")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!registerForm.formState.errors.guardianPhone)
                  )}
                />
                <FormError message={registerForm.formState.errors.guardianPhone?.message} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-full text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
              >
                {createMutation.isPending ? "Registering..." : "Register Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => {
        if (!open) {
          setEditStudent(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Edit Student Information</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(
              (values) => {
                if (editStudent) {
                  updateMutation.mutate({ id: editStudent.id, values });
                }
              },
              () => toast.error("Please fill in all required fields correctly")
            )}
            className="space-y-3 py-2"
          >
            <div>
              <FormLabel label="Full Name" required />
              <input
                type="text"
                placeholder="e.g. Kasun Bandara"
                {...editForm.register("name")}
                className={cn(
                  "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                  inputErrorClass(!!editForm.formState.errors.name)
                )}
              />
              <FormError message={editForm.formState.errors.name?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Email" optional />
                <input
                  type="email"
                  placeholder="e.g. kasun@example.com"
                  {...editForm.register("email")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.email)
                  )}
                />
                <FormError message={editForm.formState.errors.email?.message} />
              </div>
              <div>
                <FormLabel label="Phone" optional />
                <input
                  type="text"
                  placeholder="e.g. 077 1234567"
                  {...editForm.register("phone")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.phone)
                  )}
                />
                <FormError message={editForm.formState.errors.phone?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Grade / Level" optional />
                <input
                  type="text"
                  placeholder="e.g. Grade 11"
                  {...editForm.register("grade")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.grade)
                  )}
                />
                <FormError message={editForm.formState.errors.grade?.message} />
              </div>
              <div>
                <FormLabel label="Status" required />
                <select
                  {...editForm.register("status")}
                  className="w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <div>
                <FormLabel label="Guardian Name" optional />
                <input
                  type="text"
                  placeholder="e.g. S. Bandara"
                  {...editForm.register("guardianName")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.guardianName)
                  )}
                />
                <FormError message={editForm.formState.errors.guardianName?.message} />
              </div>
              <div>
                <FormLabel label="Guardian Phone" optional />
                <input
                  type="text"
                  placeholder="e.g. 071 9876543"
                  {...editForm.register("guardianPhone")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.guardianPhone)
                  )}
                />
                <FormError message={editForm.formState.errors.guardianPhone?.message} />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditStudent(null)} className="rounded-full text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Student Confirmation */}
      <ConfirmDialog
        open={!!deleteStudent}
        onOpenChange={(open) => { if (!open) setDeleteStudent(null); }}
        title="Remove Student"
        description={`Are you sure you want to remove student "${deleteStudent?.name}" (@${deleteStudent?.username})? Their class enrollments will be set to inactive.`}
        confirmLabel="Remove Student"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={() => {
          if (deleteStudent) {
            deleteMutation.mutate(deleteStudent.id);
          }
        }}
      />

      {/* Reset Password Confirmation */}
      <ConfirmDialog
        open={!!resetStudent}
        onOpenChange={(open) => { if (!open) setResetStudent(null); }}
        title="Reset Student Password"
        description={`Generate a new temporary password for "${resetStudent?.name}" (@${resetStudent?.username})?`}
        confirmLabel="Generate New Password"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (resetStudent) {
            resetPasswordMutation.mutate(resetStudent.id);
          }
        }}
      />

      {/* Temporary Password Display Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Temporary Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Please copy and securely deliver this temporary password to the student. They will be prompted to choose a new password upon initial sign in.
            </p>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-secondary/80 border border-border">
              <span className="font-mono font-bold text-sm text-foreground select-all tracking-wider">
                {tempPassword}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="rounded-full gap-1.5 text-xs text-primary font-bold hover:bg-primary/10"
              >
                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setTempPassword(null)}
              className="w-full rounded-full bg-primary text-primary-foreground font-bold text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
