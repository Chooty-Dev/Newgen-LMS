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
  BookMarked,
  BookOpen,
  Sparkles,
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  ExternalLink,
  Layers,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
}

const addSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").trim(),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(10, "Subject code max 10 characters").trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
});
type AddSubjectFormData = z.infer<typeof addSubjectSchema>;

const editSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").trim(),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(10, "Subject code max 10 characters").trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
});
type EditSubjectFormData = z.infer<typeof editSubjectSchema>;

export function TeacherSubjectsView() {
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
  const [editSubject, setEditSubject] = React.useState<SubjectRecord | null>(null);
  const [deleteSubject, setDeleteSubject] = React.useState<SubjectRecord | null>(null);

  // React Hook Form for Add Subject
  const addForm = useForm<AddSubjectFormData>({
    resolver: zodResolver(addSubjectSchema) as any,
    defaultValues: { name: "", code: "", description: "" },
  });

  // React Hook Form for Edit Subject
  const editForm = useForm<EditSubjectFormData>({
    resolver: zodResolver(editSubjectSchema) as any,
    defaultValues: { name: "", code: "", description: "" },
  });

  // Fetch subjects
  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ["subjects", page, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "12",
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/v1/subjects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  const subjects: SubjectRecord[] = subjectsData?.data || [];
  const meta = subjectsData?.meta || { total: 0, totalPages: 1 };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AddSubjectFormData) => {
      const res = await fetch("/api/v1/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to create subject");
        error.fields = json.error?.fields;
        throw error;
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Subject created successfully");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setCreateOpen(false);
      addForm.reset();
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          addForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      }
      toast.error(err.message || "Failed to create subject");
    },
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditSubjectFormData }) => {
      const res = await fetch(`/api/v1/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to update subject");
        error.fields = json.error?.fields;
        throw error;
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Subject updated successfully");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setEditSubject(null);
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          editForm.setError(f as any, { message: (msgs as string[])[0] });
        });
      }
      toast.error(err.message || "Failed to update subject");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/subjects/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete subject");
      return json;
    },
    onSuccess: () => {
      toast.success("Subject deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setDeleteSubject(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenEdit = (sub: SubjectRecord) => {
    setEditSubject(sub);
    editForm.reset({
      name: sub.name,
      code: sub.code,
      description: sub.description || "",
    });
  };

  const activeCount = subjects.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Curriculum Subjects
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Manage academic subjects and curriculum courses taught in your classes. Configure subject codes and syllabus descriptions.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  addForm.reset();
                  setCreateOpen(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="size-4" />
                <span>Add New Subject</span>
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/my courses.webp"
              alt="Subjects Illustration"
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
                <BookMarked className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {meta.total}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Subjects
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Layers className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {activeCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Active Subjects
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <GraduationCap className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  Standard
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  National Syllabus
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
                  Coverage
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search subjects by name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* 2. Subjects Grid */}
      <section className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Subject Catalog</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All curriculum subjects registered in the institution.</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
            {meta.total} Registered
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : subjects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground space-y-2">
            <BookMarked className="size-10 mx-auto opacity-30 text-primary" />
            <p className="text-sm font-bold text-foreground">No subjects found</p>
            <p className="text-xs">Create a new subject to link with your classes.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-card border border-border/80 hover:border-primary/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-secondary text-primary border border-border">
                      {sub.code}
                    </span>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold capitalize",
                        sub.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-foreground">{sub.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {sub.description || "No curriculum description provided."}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Added {new Date(sub.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(sub)}
                      className="size-8 p-0 rounded-full text-muted-foreground hover:text-foreground"
                      title="Edit Subject"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteSubject(sub)}
                      className="size-8 p-0 rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Delete Subject"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Subject Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) addForm.reset(); }}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Add New Subject</DialogTitle>
          </DialogHeader>
          <form onSubmit={addForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <FormLabel label="Subject Name" required />
              <Input
                type="text"
                placeholder="e.g. Combined Mathematics"
                {...addForm.register("name")}
                className={cn("w-full h-9 px-3 rounded-xl bg-secondary/50 border text-xs focus:outline-none focus:ring-1 focus:ring-primary", inputErrorClass(addForm.formState.errors.name))}
              />
              <FormError message={addForm.formState.errors.name?.message} />
            </div>
            <div className="space-y-1">
              <FormLabel label="Subject Code" required />
              <Input
                type="text"
                placeholder="e.g. MATH-101"
                {...addForm.register("code")}
                className={cn("w-full h-9 px-3 rounded-xl bg-secondary/50 border text-xs focus:outline-none focus:ring-1 focus:ring-primary uppercase", inputErrorClass(addForm.formState.errors.code))}
              />
              <FormError message={addForm.formState.errors.code?.message} />
            </div>
            <div className="space-y-1">
              <FormLabel label="Description" optional />
              <textarea
                placeholder="e.g. Comprehensive curriculum covering calculus, statistics and algebra..."
                rows={3}
                {...addForm.register("description")}
                className={cn("w-full p-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none", inputErrorClass(addForm.formState.errors.description))}
              />
              <FormError message={addForm.formState.errors.description?.message} />
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
                {createMutation.isPending ? "Creating..." : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Subject Dialog */}
      <Dialog open={!!editSubject} onOpenChange={(open) => !open && setEditSubject(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground">Edit Subject</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) => {
              if (editSubject) {
                updateMutation.mutate({ id: editSubject.id, data });
              }
            })}
            className="space-y-4 py-2 text-xs"
          >
            <div className="space-y-1">
              <FormLabel label="Subject Name" required />
              <Input
                type="text"
                placeholder="e.g. Combined Mathematics"
                {...editForm.register("name")}
                className={cn("w-full h-9 px-3 rounded-xl bg-secondary/50 border text-xs focus:outline-none focus:ring-1 focus:ring-primary", inputErrorClass(editForm.formState.errors.name))}
              />
              <FormError message={editForm.formState.errors.name?.message} />
            </div>
            <div className="space-y-1">
              <FormLabel label="Subject Code" required />
              <Input
                type="text"
                placeholder="e.g. MATH-101"
                {...editForm.register("code")}
                className={cn("w-full h-9 px-3 rounded-xl bg-secondary/50 border text-xs focus:outline-none focus:ring-1 focus:ring-primary uppercase", inputErrorClass(editForm.formState.errors.code))}
              />
              <FormError message={editForm.formState.errors.code?.message} />
            </div>
            <div className="space-y-1">
              <FormLabel label="Description" optional />
              <textarea
                placeholder="e.g. Comprehensive curriculum covering calculus, statistics and algebra..."
                rows={3}
                {...editForm.register("description")}
                className={cn("w-full p-3 rounded-xl bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none", inputErrorClass(editForm.formState.errors.description))}
              />
              <FormError message={editForm.formState.errors.description?.message} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditSubject(null)} className="rounded-full text-xs">
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

      {/* Delete Subject Confirmation */}
      <ConfirmDialog
        open={!!deleteSubject}
        onOpenChange={(open) => { if (!open) setDeleteSubject(null); }}
        title="Delete Subject"
        description={`Are you sure you want to delete ${deleteSubject?.name}? Note: deletion will be blocked if any active classes or assessments reference this subject.`}
        confirmLabel="Delete Subject"
        isDestructive={true}
        onConfirm={() => {
          if (deleteSubject) deleteMutation.mutate(deleteSubject.id);
        }}
      />
    </div>
  );
}
