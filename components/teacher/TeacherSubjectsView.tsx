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
  LayoutGrid,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  grades?: number[];
  status: "active" | "archived";
  createdAt: string;
}

const addSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").trim(),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(10, "Subject code max 10 characters").trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  grades: z
    .array(z.coerce.number().min(6, "Grade must be between 6 and 12").max(12, "Grade must be between 6 and 12"))
    .min(1, "Please select at least one grade between 6 and 12"),
});
type AddSubjectFormData = z.infer<typeof addSubjectSchema>;

const editSubjectSchema = z.object({
  name: z.string().min(2, "Subject name must be at least 2 characters").trim(),
  code: z.string().min(2, "Subject code must be at least 2 characters").max(10, "Subject code max 10 characters").trim().toUpperCase(),
  description: z.string().optional().or(z.literal("")),
  grades: z
    .array(z.coerce.number().min(6, "Grade must be between 6 and 12").max(12, "Grade must be between 6 and 12"))
    .min(1, "Please select at least one grade between 6 and 12"),
});
type EditSubjectFormData = z.infer<typeof editSubjectSchema>;

export function TeacherSubjectsView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
  const [editSubject, setEditSubject] = React.useState<SubjectRecord | null>(null);
  const [deleteSubject, setDeleteSubject] = React.useState<SubjectRecord | null>(null);

  // React Hook Form for Add Subject
  const addForm = useForm<AddSubjectFormData>({
    resolver: zodResolver(addSubjectSchema) as unknown as Resolver<AddSubjectFormData>,
    defaultValues: { name: "", code: "", description: "", grades: [6, 7, 8, 9, 10, 11] },
  });

  // React Hook Form for Edit Subject
  const editForm = useForm<EditSubjectFormData>({
    resolver: zodResolver(editSubjectSchema) as unknown as Resolver<EditSubjectFormData>,
    defaultValues: { name: "", code: "", description: "", grades: [6, 7, 8, 9, 10, 11] },
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
        throw new ApiFieldError(json.error?.message || "Failed to create subject", json.error?.fields);
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Subject created successfully");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setCreateOpen(false);
      addForm.reset();
    },
    onError: (err: ApiFieldError) => {
      applyApiFieldErrors(err, addForm.setError);
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
        throw new ApiFieldError(json.error?.message || "Failed to update subject", json.error?.fields);
      }
      return json;
    },
    onSuccess: () => {
      toast.success("Subject updated successfully");
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setEditSubject(null);
    },
    onError: (err: ApiFieldError) => {
      applyApiFieldErrors(err, editForm.setError);
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
      grades: sub.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11],
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
                <span>Add a Subject</span>
              </button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-subject-bg.webp"
                alt="Subjects Illustration"
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
              placeholder="Search subjects by name or code..."
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
        </div>
      </section>

      {/* 2. Subjects Catalog (Cards / Table) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div>
            <h3 className="font-extrabold text-base text-foreground">Subject Catalog</h3>
            <p className="text-xs text-muted-foreground mt-0.5">All curriculum subjects registered in the institution.</p>
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
          <DataLoader text="Loading subjects..." minHeight="min-h-[200px]" />
        ) : subjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
            <BookMarked className="size-10 mx-auto opacity-30 text-primary" />
            <p className="text-sm font-bold text-foreground">No subjects found</p>
            <p className="text-xs text-muted-foreground">Create a new subject to link with your classes.</p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 animate-in fade-in duration-300">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="card-themed rounded-3xl p-5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative"
              >
                {/* 1. Header: Code Tag + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <span className="card-themed-tag px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-border/80">
                    {sub.code}
                  </span>
                  <CardTypeFlag type={sub.status} />
                </div>

                {/* 2. Title & Description */}
                <div className="space-y-1.5">
                  <h4 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {sub.name}
                  </h4>
                  <p className="text-xs card-themed-sub line-clamp-2 leading-relaxed">
                    {sub.description || "Curriculum subject registered for student classes."}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] font-bold card-themed-sub">Grades:</span>
                    {(sub.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11]).map((g) => (
                      <span key={g} className="px-1.5 py-0.5 rounded-md card-themed-tag font-bold text-[10px]">
                        Grade {g}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Dedicated Bottom Line (Text Colors, No Background Box) */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] card-themed-sub font-medium">
                    Added {new Date(sub.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sub)}
                      className="p-1 text-blue-600 hover:text-blue-700 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Edit Subject"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteSubject(sub)}
                      className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                      title="Delete Subject"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table View */
          <div className="card-themed rounded-3xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-secondary/60 border-b border-border/80 text-muted-foreground font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Subject Name</th>
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Grades</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-extrabold text-foreground block">
                          {sub.name}
                        </span>
                        <span className="text-[11px] card-themed-sub line-clamp-1">
                          {sub.description || "No description"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {sub.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(sub.grades && sub.grades.length > 0 ? sub.grades : [6, 7, 8, 9, 10, 11]).map((g) => (
                            <span key={g} className="px-1.5 py-0.2 rounded text-[10px] card-themed-tag font-bold">
                              G{g}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <CardTypeFlag type={sub.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(sub)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteSubject(sub)}
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
            <div className="space-y-1.5">
              <FormLabel label="Applicable Grades (Grades 06 - 12)" required />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[6, 7, 8, 9, 10, 11, 12].map((g) => {
                  const currentGrades = addForm.watch("grades") || [];
                  const isSelected = currentGrades.includes(g);
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => {
                        const updated = isSelected
                          ? currentGrades.filter((x) => x !== g)
                          : [...currentGrades, g].sort((a, b) => a - b);
                        addForm.setValue("grades", updated, { shouldValidate: true });
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-all",
                        isSelected
                          ? "bg-primary text-white shadow-xs"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border/60"
                      )}
                    >
                      Grade {g < 10 ? `0${g}` : g}
                    </button>
                  );
                })}
              </div>
              <FormError message={addForm.formState.errors.grades?.message} />
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
            <div className="space-y-1.5">
              <FormLabel label="Applicable Grades (Grades 06 - 12)" required />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[6, 7, 8, 9, 10, 11, 12].map((g) => {
                  const currentGrades = editForm.watch("grades") || [];
                  const isSelected = currentGrades.includes(g);
                  return (
                    <button
                      type="button"
                      key={g}
                      onClick={() => {
                        const updated = isSelected
                          ? currentGrades.filter((x) => x !== g)
                          : [...currentGrades, g].sort((a, b) => a - b);
                        editForm.setValue("grades", updated, { shouldValidate: true });
                      }}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold transition-all",
                        isSelected
                          ? "bg-primary text-white shadow-xs"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border/60"
                      )}
                    >
                      Grade {g < 10 ? `0${g}` : g}
                    </button>
                  );
                })}
              </div>
              <FormError message={editForm.formState.errors.grades?.message} />
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
