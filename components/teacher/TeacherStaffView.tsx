"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
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
});

type EditStaffFormValues = z.infer<typeof editStaffSchema>;

export function TeacherStaffView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

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
    },
  });

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
                <span>Add Staff Member</span>
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/schedule.webp"
              alt="Staff Illustration"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        {/* 4 Stats Cards + Search Bar */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
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
        </div>
      </section>

      {/* 2. Staff Members List */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Staff Directory</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Click any staff member to view assigned classes and assessments.</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
            {meta.total} Registered
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <UserCheck className="size-10 mx-auto opacity-30 text-primary" />
            <p className="text-sm font-bold text-foreground">No staff members found</p>
            <p className="text-xs">Add staff members to assign them as evaluators.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {staffList.map((st) => (
              <div
                key={st.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-secondary/30 px-3 rounded-2xl transition-colors gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-secondary text-primary border border-border">
                      {st.title || "Staff"}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                        st.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {st.status}
                    </span>
                  </div>
                  <Link
                    href={`/staff/${st.username}`}
                    className="text-base font-extrabold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <span>{st.name}</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{st.username} • {st.position || "Coordinator"} {st.email ? `• ${st.email}` : ""}
                  </p>
                  {/* Granted Permissions Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {st.permissions && st.permissions.length > 0 ? (
                      st.permissions.map((p) => {
                        const label =
                          p === "students.create"
                            ? "Add Student"
                            : p === "students.view"
                            ? "View Student"
                            : p === "students.update"
                            ? "Update Student"
                            : p === "students.delete"
                            ? "Delete Student"
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
                      <span className="text-[10px] text-muted-foreground">Default Staff Permissions</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    href={`/staff/${st.username}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary text-foreground hover:bg-primary hover:text-white transition-colors text-xs font-bold"
                  >
                    <span>View Profile</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setResetId(st.id)}
                    className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                    title="Reset Password"
                  >
                    <KeyRound className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(st)}
                    className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                    title="Edit Staff"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteStaff(st)}
                    className="size-8 p-0 rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete Staff"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Staff Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) addForm.reset();
      }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
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
            <div className="pt-2 border-t border-border/60 space-y-2">
              <label className="font-extrabold text-foreground block">
                Allow Permissions for:
              </label>
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
            <div className="pt-2 border-t border-border/60 space-y-2">
              <label className="font-extrabold text-foreground block">
                Allow Permissions for:
              </label>
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
