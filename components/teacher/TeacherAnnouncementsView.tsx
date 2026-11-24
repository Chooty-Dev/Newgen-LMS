"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormLabel, FormError, inputErrorClass } from "@/components/ui/form-field";
import {
  Megaphone,
  Pin,
  Globe,
  Plus,
  Search,
  Sparkles,
  Calendar,
  Layers,
  Trash2,
  Bell,
  ArrowRight,
  LayoutGrid,
  Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DataLoader } from "@/components/ui/data-loader";
import { CardThemeBar } from "./CardThemeBar";
import { CardTypeFlag } from "./CardTypeFlag";

interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  audience: "center" | "classes";
  classes: string[];
  classIds: string[];
  pinned: boolean;
  publishAt: string;
  authorName: string;
  authorRole: string;
}

const announcementFormSchema = z
  .object({
    title: z.string().min(2, "Notice title must be at least 2 characters").trim(),
    body: z.string().min(5, "Notice details must be at least 5 characters").trim(),
    audience: z.enum(["center", "classes"]),
    selectedClassId: z.string().optional(),
    pinned: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.audience === "classes" && !data.selectedClassId) {
        return false;
      }
      return true;
    },
    {
      message: "Please select a target class batch",
      path: ["selectedClassId"],
    }
  );
type AnnouncementFormData = z.infer<typeof announcementFormSchema>;

export function TeacherAnnouncementsView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Delete announcement state
  const [deleteNoticeId, setDeleteNoticeId] = React.useState<string | null>(null);
  const [deleteNoticeTitle, setDeleteNoticeTitle] = React.useState("");

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/announcements/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete announcement");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDeleteNoticeId(null);
      setDeleteNoticeTitle("");
      toast.success("Announcement deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete announcement");
    },
  });

  // React Hook Form
  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementFormSchema) as any,
    defaultValues: {
      title: "",
      body: "",
      audience: "center",
      selectedClassId: "",
      pinned: false,
    },
  });

  // Fetch announcements
  const { data, isLoading } = useQuery({
    queryKey: ["announcements", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetch(`/api/v1/announcements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load announcements");
      return res.json();
    },
  });

  const announcements: AnnouncementRecord[] = data?.data || [];

  // Classes for dropdown
  const { data: classesData } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => (await fetch("/api/v1/classes")).json(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      const res = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          body: data.body,
          audience: data.audience,
          classIds: data.audience === "classes" && data.selectedClassId ? [data.selectedClassId] : [],
          pinned: data.pinned,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const error: any = new Error(json.error?.message || "Failed to post announcement");
        error.fields = json.error?.fields;
        throw error;
      }
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setCreateOpen(false);
      form.reset();
      toast.success("Announcement published successfully!");
    },
    onError: (err: any) => {
      if (err.fields) {
        Object.entries(err.fields).forEach(([f, msgs]) => {
          form.setError(f as any, { message: (msgs as string[])[0] });
        });
      }
      toast.error(err.message || "Failed to post announcement");
    },
  });

  const pinnedItems = announcements.filter((a) => a.pinned);
  const centerCount = announcements.filter((a) => a.audience === "center").length;
  const classesCount = announcements.filter((a) => a.audience === "classes").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Banner: 8 cols on lg (2/3 width) - Solid single blue, NO gradient, large image */}
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Messages & Bulletins
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Broadcast timely announcements to your enrolled students, share examination reminders, and review center-wide administrative updates.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => setCreateOpen(true)}
                className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Plus className="size-4" />
                <span>Post an Announcement</span>
              </Button>
            </div>
          </div>

          {/* Large Right Illustration */}
          <div className="pointer-events-none absolute right-2 sm:right-4 md:right-6 top-0 bottom-0 w-48 sm:w-64 md:w-80 lg:w-96 xl:w-[420px] z-10 flex items-center justify-end py-2 sm:py-3">
            <div className="relative w-full h-full max-h-[260px]">
              <Image
                src="/images/teacher-announcement-bg.webp"
                alt="Announcements"
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
              placeholder="Search bulletins..."
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
                <Megaphone className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {announcements.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Bulletins
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Pin className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {pinnedItems.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Pinned Notices
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {centerCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Center-wide
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:border-primary/30 transition-all flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Layers className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {classesCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Class Specific
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Header Title & View Mode Switcher */}
      <section className="flex items-center justify-between gap-4">
        <h3 className="font-extrabold text-lg text-foreground tracking-tight">
          Recent Bulletins
        </h3>

        {/* View Mode Toggle: Cards (Default) vs Table */}
        <div className="flex items-center bg-secondary/80 border border-border rounded-full p-1 shadow-2xs shrink-0">
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

      {/* 3. Announcements Grid or Table */}
      {isLoading ? (
        <DataLoader text="Loading announcements..." minHeight="min-h-[200px]" />
      ) : announcements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Bell className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No announcements right now</h4>
          <p className="text-xs text-muted-foreground">Click &quot;Post an Announcement&quot; to publish a notice.</p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-300">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="card-themed rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 group border relative overflow-hidden"
            >
              {/* 1. Header: Audience Tag + Pinned Badge + CardTypeFlag */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="card-themed-tag px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border border-border/80">
                    {ann.audience === "center" ? "Entire Center" : ann.classes.join(", ") || "Class"}
                  </span>
                  {ann.pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Pin className="size-3 fill-amber-500" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>
                <CardTypeFlag type={ann.pinned ? "important" : "general"} />
              </div>

              {/* 2. Notice Content */}
              <div className="space-y-1.5">
                <h4 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                  {ann.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed line-clamp-3">
                  {ann.body}
                </p>
              </div>

              {/* 3. Dedicated Bottom Action Line (Interactive Text Colors, No Background Box) */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground truncate">
                  By {ann.authorName} ({ann.authorRole})
                </span>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteNoticeId(ann.id);
                      setDeleteNoticeTitle(ann.title);
                    }}
                    className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Delete Announcement"
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
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">Bulletin Title</th>
                  <th className="py-3.5 px-4">Audience</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {announcements.map((ann) => (
                  <tr key={ann.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-5 max-w-sm">
                      <div className="font-extrabold text-foreground text-xs sm:text-sm line-clamp-1">{ann.title}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-1">{ann.body}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-foreground capitalize">
                        {ann.audience === "center" ? "Entire Center" : ann.classes.join(", ") || "Class"}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {ann.pinned ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          <Pin className="size-3 fill-amber-500" />
                          <span>Pinned</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">General</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                      <span className="font-bold text-foreground block">{ann.authorName}</span>
                      <span className="text-[10px]">{ann.authorRole}</span>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteNoticeId(ann.id);
                          setDeleteNoticeTitle(ann.title);
                        }}
                        className="p-1 text-rose-500 hover:text-rose-600 transition-all hover:scale-110 active:scale-95 cursor-pointer inline-flex items-center"
                        title="Delete Announcement"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post Notice Modal */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) form.reset(); }}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Post Announcement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Broadcast a message to your students or center members.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 pt-2">
            <div>
              <FormLabel label="Notice Title" required />
              <Input
                placeholder="e.g. Term 1 Revision Schedule Updates"
                {...form.register("title")}
                className={inputErrorClass(form.formState.errors.title)}
              />
              <FormError message={form.formState.errors.title?.message} />
            </div>

            <div>
              <FormLabel label="Audience" required />
              <Select
                {...form.register("audience")}
                className={inputErrorClass(form.formState.errors.audience)}
              >
                <option value="center">Entire Center</option>
                <option value="classes">Specific Class Batch</option>
              </Select>
              <FormError message={form.formState.errors.audience?.message} />
            </div>

            {form.watch("audience") === "classes" && (
              <div>
                <FormLabel label="Select Class Batch" required />
                <Select
                  {...form.register("selectedClassId")}
                  className={inputErrorClass(form.formState.errors.selectedClassId)}
                >
                  <option value="">Select a class batch...</option>
                  {(classesData?.data || []).map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </Select>
                <FormError message={form.formState.errors.selectedClassId?.message} />
              </div>
            )}

            <div>
              <FormLabel label="Notice Content" required />
              <Textarea
                rows={4}
                placeholder="e.g. Please be informed that extra classes will be conducted this Saturday from 9 AM to 12 PM..."
                {...form.register("body")}
                className={cn("rounded-2xl", inputErrorClass(form.formState.errors.body))}
              />
              <FormError message={form.formState.errors.body?.message} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary">
              <div>
                <p className="text-xs font-bold text-foreground">Pin to top</p>
                <p className="text-[10px] text-muted-foreground">
                  Keep notice highlighted at top of students&apos; feeds
                </p>
              </div>
              <Switch
                checked={form.watch("pinned")}
                onCheckedChange={(val) => form.setValue("pinned", val)}
              />
            </div>

            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-full h-11 px-5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="rounded-full h-11 px-6 font-bold"
              >
                {createMutation.isPending ? "Posting..." : "Publish Notice"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Announcement Dialog */}
      <Dialog
        open={!!deleteNoticeId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteNoticeId(null);
            setDeleteNoticeTitle("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-foreground">
              Delete Announcement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Are you sure you want to delete <span className="font-bold text-foreground">&quot;{deleteNoticeTitle}&quot;</span>? This bulletin will be removed for all enrolled students. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteNoticeId(null);
                setDeleteNoticeTitle("");
              }}
              className="rounded-full h-10 px-5"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteNoticeId) deleteMutation.mutate(deleteNoticeId);
              }}
              className="rounded-full h-10 px-6 font-bold"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
