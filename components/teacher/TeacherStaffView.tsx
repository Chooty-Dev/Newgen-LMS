"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormLabel, FormError, inputErrorClass } from "@/components/ui/form-field";
import {
  UserCheck,
  Users,
  Sparkles,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  ExternalLink,
  Shield,
  KeyRound,
  Copy,
  Check,
  LayoutGrid,
  Table2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  StaffClassAssessmentPicker,
  useStaffAssignmentOptions,
} from "@/components/shared/StaffClassAssessmentPicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StaffRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  title: string;
  position: string;
  status: "active" | "disabled";
  joinedAt: string;
  permissions?: string[];
  assignedClasses?: Array<{ id: string; name: string }>;
  assignedClassIds?: string[];
  assignedAssessments?: Array<{ id: string; title: string }>;
  assignedAssessmentIds?: string[];
}

const addStaffSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, hyphens or underscores only")
    .trim(),
  email: z
    .string()
    .trim()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    })
    .optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  position: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  assignedClassIds: z.array(z.string()).default([]),
  assignedAssessmentIds: z.array(z.string()).default([]),
});

type AddStaffFormValues = z.infer<typeof addStaffSchema>;

const editStaffSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").trim(),
  email: z
    .string()
    .trim()
    .refine((val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: "Please enter a valid email address",
    })
    .optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(["active", "disabled"]),
  permissions: z.array(z.string()).default([]),
  assignedClassIds: z.array(z.string()).default([]),
  assignedAssessmentIds: z.array(z.string()).default([]),
});

type EditStaffFormValues = z.infer<typeof editStaffSchema>;

export function TeacherStaffView() {
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Modals state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editStaff, setEditStaff] = React.useState<StaffRecord | null>(null);
  const [deleteStaff, setDeleteStaff] = React.useState<StaffRecord | null>(null);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // RHF Forms
  const addForm = useForm<AddStaffFormValues>({
    mode: "all",
    resolver: zodResolver(addStaffSchema) as any,
    defaultValues: {
      name: "",
      username: "",
      email: "",
      phone: "",
      title: "",
      position: "",
      permissions: [],
      assignedClassIds: [],
      assignedAssessmentIds: [],
    },
  });

  const editForm = useForm<EditStaffFormValues>({
    mode: "all",
    resolver: zodResolver(editStaffSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      title: "",
      position: "",
      status: "active",
      permissions: [],
      assignedClassIds: [],
      assignedAssessmentIds: [],
    },
  });

  // Lazy, cached fetch of classes & class-linked assessments (only fetched when Add/Edit dialog opens)
  const { classList, assessmentList, isLoadingOptions } = useStaffAssignmentOptions(
    createOpen || Boolean(editStaff)
  );

  // Fetch staff
  const { data: staffData, isLoading } = useQuery({
    queryKey: ["staff", page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/v1/staff?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load staff");
      return res.json();
    },
  });

  const staffList: StaffRecord[] = staffData?.data || [];
  const meta = staffData?.meta || { total: 0, totalPages: 1 };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: AddStaffFormValues) => {
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          username: values.username.toLowerCase().trim(),
          email: values.email || undefined,
          phone: values.phone || undefined,
          assignedClassIds: values.assignedClassIds,
          assignedAssessmentIds: values.assignedAssessmentIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to add staff member");
        error.fields = json.error?.fields;
        throw error;
      }
      return json;
    },
    onSuccess: (data) => {
      toast.success("Staff member created successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setCreateOpen(false);
      addForm.reset();
      if (data.data?.temporaryPassword) {
        setTempPassword(data.data.temporaryPassword);
      }
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          addForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes("username")) addForm.setError("username", { message: err.message });
        else if (msg.includes("email")) addForm.setError("email", { message: err.message });
        else if (msg.includes("phone")) addForm.setError("phone", { message: err.message });
        else if (msg.includes("name")) addForm.setError("name", { message: err.message });
      }
      toast.error(err.message || "Failed to add staff member");
    },
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: EditStaffFormValues }) => {
      const res = await fetch(`/api/v1/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email || undefined,
          phone: values.phone || undefined,
          assignedClassIds: values.assignedClassIds,
          assignedAssessmentIds: values.assignedAssessmentIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to update staff");
        error.fields = json.error?.fields;
        throw error;
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Staff member updated successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditStaff(null);
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          editForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      } else if (err.message) {
        const msg = err.message.toLowerCase();
        if (msg.includes("email")) editForm.setError("email", { message: err.message });
        else if (msg.includes("phone")) editForm.setError("phone", { message: err.message });
        else if (msg.includes("name")) editForm.setError("name", { message: err.message });
      }
      toast.error(err.message || "Failed to update staff member");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/staff/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to remove staff member");
      return json;
    },
    onSuccess: () => {
      toast.success("Staff member removed successfully");
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDeleteStaff(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/staff/${id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reset password");
      return json.data;
    },
    onSuccess: (data) => {
      toast.success("Temporary password generated");
      setResetId(null);
      if (data?.temporaryPassword) {
        setTempPassword(data.temporaryPassword);
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenEdit = (st: StaffRecord) => {
    setEditStaff(st);
    editForm.reset({
      name: st.name || "",
      email: st.email || "",
      phone: st.phone || "",
      title: st.title || "",
      position: st.position || "",
      status: st.status || "active",
      permissions: st.permissions || [],
      assignedClassIds: st.assignedClassIds || (st.assignedClasses || []).map((c) => c.id) || [],
      assignedAssessmentIds: st.assignedAssessmentIds || (st.assignedAssessments || []).map((a) => a.id) || [],
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

  const activeCount = staffList.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Staff Members & Evaluators
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Coordinate with academic staff, assign evaluators to your exams and tests, and collaborate on student progress tracking.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  addForm.reset({
                    name: "",
                    username: "",
                    email: "",
                    phone: "",
                    title: "",
                    position: "",
                    permissions: ["students.create", "students.view", "students.update"],
                  });
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="size-4" />
                <span>Add a Staff Member</span>
              </button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-staff-bg.webp"
                alt="Staff Illustration"
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
              placeholder="Search staff by name or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>

          {/* Quick Apple-style Color Palette Bar */}
          <CardThemeBar />

          {/* 4 Stats Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UserCheck className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {meta.total}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Staff
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Shield className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {activeCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Active
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Users className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  Staff
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Coordinators
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Sparkles className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  100%
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Verified
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Staff Members Directory (Cards / Table) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Staff Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Assigned staff members and designated assessment evaluators.</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full hidden sm:inline-block">
              {meta.total} Registered
            </span>

            {/* View Mode Toggle: Cards (Default) vs Table */}
            <div className="flex items-center bg-secondary/80 border border-border rounded-full p-1 shadow-2xs">
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
          </div>
        </div>

        {isLoading ? (
          <DataLoader text="Loading staff directory..." minHeight="min-h-[180px]" />
        ) : staffList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <UserCheck className="size-10 mx-auto opacity-30 text-primary" />
            <p className="text-sm font-bold text-foreground">No staff members found</p>
            <p className="text-xs text-muted-foreground">Add a staff member to assign them as evaluators.</p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-in fade-in duration-300">
            {staffList.map((st) => {
              const initials = st.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={st.id}
                  className="card-themed rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative"
                >
                  {/* 1. Top Row: Avatar + Name + Position/Username + Status Flag */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Link
                        href={`/staff/${st.username}`}
                        className="size-11 rounded-2xl card-themed-tag font-black text-sm flex items-center justify-center border border-border/70 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                      >
                        {initials}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/staff/${st.username}`}
                          className="font-extrabold text-sm sm:text-base text-foreground truncate block group-hover:text-primary transition-colors leading-tight"
                          title={st.name}
                        >
                          {st.name}
                        </Link>
                        <p className="text-[11px] card-themed-sub font-medium truncate mt-0.5">
                          @{st.username} • {st.position || st.title || "Coordinator"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      <CardTypeFlag type={st.status || "active"} />
                    </div>
                  </div>

                  {/* 2. Middle Row: Granted Permissions & Assigned Classes Badges */}
                  <div className="py-2 px-3 rounded-2xl bg-secondary/40 border border-border/50 space-y-2">
                    <div>
                      <span className="text-[10px] card-themed-sub font-bold block mb-1">Assigned Permissions</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {st.permissions && st.permissions.length > 0 ? (
                          st.permissions
                            .filter((p) => p !== "attendance.create")
                            .map((p) => {
                              const label =
                                p === "students.create"
                                  ? "Add Student"
                                  : p === "students.view"
                                    ? "View Student"
                                    : p === "students.update"
                                      ? "Update Student"
                                      : p === "students.delete"
                                        ? "Delete Student"
                                        : p === "attendance.view"
                                          ? "View Attendance"
                                          : p === "attendance.mark"
                                            ? "Mark Attendance"
                                            : p === "attendance.update"
                                              ? "Edit Attendance"
                                              : p === "attendance.delete"
                                                ? "Delete Attendance"
                                                : p;
                              return (
                                <span
                                  key={p}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20"
                                >
                                  ✓ {label}
                                </span>
                              );
                            })
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">Default Staff Permissions</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] card-themed-sub font-bold block mb-1">Assigned Classes</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {st.assignedClasses && st.assignedClasses.length > 0 ? (
                          st.assignedClasses.map((c) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            >
                              {c.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">No Classes Assigned</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] card-themed-sub font-bold block mb-1">Assigned Assessments</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {st.assignedAssessments && st.assignedAssessments.length > 0 ? (
                          st.assignedAssessments.map((a) => (
                            <span
                              key={a.id}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                            >
                              {a.title}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium">No Assessments Assigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Bottom Row: Dedicated Action Line with Text Colors (No Backgrounds) */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                    {/* Left: View Profile Link */}
                    <Link
                      href={`/staff/${st.username}`}
                      className="font-bold text-primary hover:underline inline-flex items-center gap-1 transition-colors"
                      title="View Staff Profile"
                    >
                      <span>Profile</span>
                      <ArrowRight className="size-3" />
                    </Link>

                    {/* Right: Actions with Text Colors */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(st)}
                        className="p-1 text-blue-600 hover:text-blue-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        title="Edit Staff Member"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetId(st.id)}
                        className="p-1 text-amber-500 hover:text-amber-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        title="Reset Password"
                      >
                        <KeyRound className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteStaff(st)}
                        className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                        title="Delete Staff Member"
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
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Position</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Classes & Assessments</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {staffList.map((st) => (
                    <tr key={st.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl card-themed-tag font-bold text-xs flex items-center justify-center shrink-0 border border-border/60">
                            {st.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/staff/${st.username}`}
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
                        {st.position || st.title || "Coordinator"}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground">
                        {st.email || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-xs">
                          {st.assignedClasses && st.assignedClasses.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {st.assignedClasses.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground border border-border"
                                >
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {st.assignedAssessments && st.assignedAssessments.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {st.assignedAssessments.map((a) => (
                                <span
                                  key={a.id}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                >
                                  {a.title}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {(!st.assignedClasses || st.assignedClasses.length === 0) &&
                            (!st.assignedAssessments || st.assignedAssessments.length === 0) ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <CardTypeFlag type={st.status || "active"} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/staff/${st.username}`}
                            className="text-primary font-bold hover:underline text-xs"
                            title="Profile"
                          >
                            Profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(st)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setResetId(st.id)}
                            className="p-1 text-amber-500 hover:text-amber-600 transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteStaff(st)}
                            className="p-1 text-rose-500 hover:text-rose-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Create Staff Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) addForm.reset();
      }}>
        <DialogContent className="sm:max-w-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Add New Staff Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={addForm.handleSubmit(
              (values) => createMutation.mutate(values),
              () => toast.error("Please fill in all required fields correctly")
            )}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <FormLabel label="Full Name" required />
              <input
                type="text"
                placeholder="e.g. Nimal Fernando"
                {...addForm.register("name")}
                className={cn(
                  "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                  inputErrorClass(!!addForm.formState.errors.name)
                )}
              />
              <FormError message={addForm.formState.errors.name?.message} />
            </div>

            <div>
              <FormLabel label="Username" required />
              <input
                type="text"
                placeholder="e.g. nimal_evaluator"
                {...addForm.register("username")}
                className={cn(
                  "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                  inputErrorClass(!!addForm.formState.errors.username)
                )}
              />
              <FormError message={addForm.formState.errors.username?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Email" optional />
                <input
                  type="email"
                  placeholder="e.g. nimal@example.com"
                  {...addForm.register("email")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!addForm.formState.errors.email)
                  )}
                />
                <FormError message={addForm.formState.errors.email?.message} />
              </div>
              <div>
                <FormLabel label="Phone" optional />
                <input
                  type="text"
                  placeholder="e.g. 077 1234567"
                  {...addForm.register("phone")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!addForm.formState.errors.phone)
                  )}
                />
                <FormError message={addForm.formState.errors.phone?.message} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FormLabel label="Title / Salutation" optional />
                <input
                  type="text"
                  placeholder="e.g. Assistant Teacher"
                  {...addForm.register("title")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!addForm.formState.errors.title)
                  )}
                />
                <FormError message={addForm.formState.errors.title?.message} />
              </div>
              <div>
                <FormLabel label="Position" optional />
                <input
                  type="text"
                  placeholder="e.g. Evaluator"
                  {...addForm.register("position")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!addForm.formState.errors.position)
                  )}
                />
                <FormError message={addForm.formState.errors.position?.message} />
              </div>
            </div>

            {/* Allow Permissions Section */}
            <div className="pt-2 border-t border-border/60 space-y-3">
              <label className="font-extrabold text-foreground block text-xs">
                Allow Permissions for:
              </label>

              {/* Student Permissions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Student Management
                </span>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-secondary/30 border border-border">
                  {[
                    { id: "students.create", label: "Add Student" },
                    { id: "students.view", label: "View Student" },
                    { id: "students.update", label: "Update Student" },
                    { id: "students.delete", label: "Delete Student" },
                  ].map((perm) => {
                    const currentPerms = addForm.watch("permissions") || [];
                    const isChecked = currentPerms.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newPerms = new Set([...currentPerms, perm.id]);
                              if (perm.id !== "students.view") newPerms.add("students.view");
                              addForm.setValue("permissions", Array.from(newPerms));
                            } else {
                              let newPerms = currentPerms.filter((p) => p !== perm.id);
                              if (perm.id === "students.view") {
                                newPerms = newPerms.filter(
                                  (p) => !["students.create", "students.update", "students.delete"].includes(p)
                                );
                              }
                              addForm.setValue("permissions", newPerms);
                            }
                          }}
                          className="rounded size-3.5 border-border text-primary focus:ring-primary"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Permissions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Attendance Management
                </span>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-secondary/30 border border-border">
                  {[
                    { id: "attendance.view", label: "View Attendance" },
                    { id: "attendance.mark", label: "Mark Attendance" },
                    { id: "attendance.update", label: "Edit Attendance" },
                    { id: "attendance.delete", label: "Delete Attendance" },
                  ].map((perm) => {
                    const currentPerms = addForm.watch("permissions") || [];
                    const isChecked = currentPerms.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newPerms = new Set([...currentPerms, perm.id]);
                              if (perm.id !== "attendance.view") newPerms.add("attendance.view");
                              if (perm.id === "attendance.mark") newPerms.add("attendance.create");
                              addForm.setValue("permissions", Array.from(newPerms));
                            } else {
                              let newPerms = currentPerms.filter((p) => p !== perm.id);
                              if (perm.id === "attendance.mark") {
                                newPerms = newPerms.filter((p) => p !== "attendance.create");
                              }
                              if (perm.id === "attendance.view") {
                                newPerms = newPerms.filter(
                                  (p) =>
                                    ![
                                      "attendance.mark",
                                      "attendance.create",
                                      "attendance.update",
                                      "attendance.delete",
                                    ].includes(p)
                                );
                              }
                              addForm.setValue("permissions", newPerms);
                            }
                          }}
                          className="rounded size-3.5 border-border text-primary focus:ring-primary"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Assign to Classes & Filtered Assessments */}
            <StaffClassAssessmentPicker
              classes={classList}
              assessments={assessmentList}
              isLoading={isLoadingOptions}
              selectedClassIds={addForm.watch("assignedClassIds") || []}
              selectedAssessmentIds={addForm.watch("assignedAssessmentIds") || []}
              onChangeClasses={(nextClasses, nextAssessments) => {
                addForm.setValue("assignedClassIds", nextClasses);
                addForm.setValue("assignedAssessmentIds", nextAssessments);
              }}
              onChangeAssessments={(nextAssessments) => {
                addForm.setValue("assignedAssessmentIds", nextAssessments);
              }}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)} className="rounded-full text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full bg-primary text-primary-foreground font-bold text-xs"
              >
                {createMutation.isPending ? "Adding..." : "Add Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={!!editStaff} onOpenChange={(open) => {
        if (!open) {
          setEditStaff(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Edit Staff Member</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit(
              (values) => {
                if (editStaff) {
                  updateMutation.mutate({ id: editStaff.id, values });
                }
              },
              () => toast.error("Please fill in all required fields correctly")
            )}
            className="space-y-3 py-2 text-xs"
          >
            <div>
              <FormLabel label="Full Name" required />
              <input
                type="text"
                placeholder="e.g. Nimal Fernando"
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
                  placeholder="e.g. nimal@example.com"
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
                <FormLabel label="Title / Salutation" optional />
                <input
                  type="text"
                  placeholder="e.g. Assistant Teacher"
                  {...editForm.register("title")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.title)
                  )}
                />
                <FormError message={editForm.formState.errors.title?.message} />
              </div>
              <div>
                <FormLabel label="Position" optional />
                <input
                  type="text"
                  placeholder="e.g. Evaluator"
                  {...editForm.register("position")}
                  className={cn(
                    "w-full h-9 px-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary",
                    inputErrorClass(!!editForm.formState.errors.position)
                  )}
                />
                <FormError message={editForm.formState.errors.position?.message} />
              </div>
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

            {/* Allow Permissions Section */}
            <div className="pt-2 border-t border-border/60 space-y-3">
              <label className="font-extrabold text-foreground block text-xs">
                Allow Permissions for:
              </label>

              {/* Student Permissions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Student Management
                </span>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-secondary/30 border border-border">
                  {[
                    { id: "students.create", label: "Add Student" },
                    { id: "students.view", label: "View Student" },
                    { id: "students.update", label: "Update Student" },
                    { id: "students.delete", label: "Delete Student" },
                  ].map((perm) => {
                    const currentPerms = editForm.watch("permissions") || [];
                    const isChecked = currentPerms.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newPerms = new Set([...currentPerms, perm.id]);
                              if (perm.id !== "students.view") newPerms.add("students.view");
                              editForm.setValue("permissions", Array.from(newPerms));
                            } else {
                              let newPerms = currentPerms.filter((p) => p !== perm.id);
                              if (perm.id === "students.view") {
                                newPerms = newPerms.filter(
                                  (p) => !["students.create", "students.update", "students.delete"].includes(p)
                                );
                              }
                              editForm.setValue("permissions", newPerms);
                            }
                          }}
                          className="rounded size-3.5 border-border text-primary focus:ring-primary"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Attendance Permissions */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Attendance Management
                </span>
                <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-secondary/30 border border-border">
                  {[
                    { id: "attendance.view", label: "View Attendance" },
                    { id: "attendance.mark", label: "Mark Attendance" },
                    { id: "attendance.update", label: "Edit Attendance" },
                    { id: "attendance.delete", label: "Delete Attendance" },
                  ].map((perm) => {
                    const currentPerms = editForm.watch("permissions") || [];
                    const isChecked = currentPerms.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newPerms = new Set([...currentPerms, perm.id]);
                              if (perm.id !== "attendance.view") newPerms.add("attendance.view");
                              if (perm.id === "attendance.mark") newPerms.add("attendance.create");
                              editForm.setValue("permissions", Array.from(newPerms));
                            } else {
                              let newPerms = currentPerms.filter((p) => p !== perm.id);
                              if (perm.id === "attendance.mark") {
                                newPerms = newPerms.filter((p) => p !== "attendance.create");
                              }
                              if (perm.id === "attendance.view") {
                                newPerms = newPerms.filter(
                                  (p) =>
                                    ![
                                      "attendance.mark",
                                      "attendance.create",
                                      "attendance.update",
                                      "attendance.delete",
                                    ].includes(p)
                                );
                              }
                              editForm.setValue("permissions", newPerms);
                            }
                          }}
                          className="rounded size-3.5 border-border text-primary focus:ring-primary"
                        />
                        <span>{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Assign to Classes & Filtered Assessments */}
            <StaffClassAssessmentPicker
              classes={classList}
              assessments={assessmentList}
              isLoading={isLoadingOptions}
              selectedClassIds={editForm.watch("assignedClassIds") || []}
              selectedAssessmentIds={editForm.watch("assignedAssessmentIds") || []}
              onChangeClasses={(nextClasses, nextAssessments) => {
                editForm.setValue("assignedClassIds", nextClasses);
                editForm.setValue("assignedAssessmentIds", nextAssessments);
              }}
              onChangeAssessments={(nextAssessments) => {
                editForm.setValue("assignedAssessmentIds", nextAssessments);
              }}
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditStaff(null)} className="rounded-full text-xs">
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

      {/* Delete Staff Confirmation */}
      <ConfirmDialog
        open={!!deleteStaff}
        onOpenChange={(open) => { if (!open) setDeleteStaff(null); }}
        title="Remove Staff Member"
        description={`Are you sure you want to remove ${deleteStaff?.name}? Note: deletion will be blocked if this staff member is assigned as evaluator on active assessments with pending marks.`}
        confirmLabel="Remove Staff"
        isDestructive={true}
        onConfirm={() => {
          if (deleteStaff) deleteMutation.mutate(deleteStaff.id);
        }}
      />

      {/* Reset Password Confirmation */}
      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => { if (!open) setResetId(null); }}
        title="Reset Password"
        description="Are you sure you want to generate a new temporary password for this staff member?"
        confirmLabel="Reset"
        isDestructive={false}
        onConfirm={() => {
          if (resetId) resetPasswordMutation.mutate(resetId);
        }}
      />

      {/* Display Temporary Password */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Temporary Password Generated</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Please share this temporary password with the staff member. They will be prompted to change it upon login.
            </p>
            <div className="p-4 rounded-2xl bg-secondary border border-border flex items-center justify-between gap-2">
              <span className="font-mono text-base font-bold text-foreground select-all">{tempPassword}</span>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="rounded-full size-8 p-0">
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)} className="rounded-full bg-primary text-primary-foreground font-bold text-xs">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
