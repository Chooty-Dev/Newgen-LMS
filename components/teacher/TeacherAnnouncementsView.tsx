"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
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

export function TeacherAnnouncementsView() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  // Form fields
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [audience, setAudience] = React.useState<"center" | "classes">("center");
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [pinned, setPinned] = React.useState(false);

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
    mutationFn: async () => {
      const res = await fetch("/api/v1/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          classIds: audience === "classes" && selectedClassId ? [selectedClassId] : [],
          pinned,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to post announcement");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setCreateOpen(false);
      setTitle("");
      setBody("");
      toast.success("Announcement published successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pinnedItems = announcements.filter((a) => a.pinned);
  const centerCount = announcements.filter((a) => a.audience === "center").length;
  const classesCount = announcements.filter((a) => a.audience === "classes").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Welcome Banner */}
      <section className="rounded-3xl p-6 sm:p-8 md:p-9 bg-gradient-to-r from-primary to-[#23589b] text-primary-foreground relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[200px] flex flex-col justify-between">
        <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[11px] font-bold uppercase tracking-wider backdrop-blur-xs text-white">
            <Sparkles className="size-3" />
            <span>Center Communications</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Messages & Bulletins
          </h2>
          <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
            Broadcast important updates to your classes or view center-wide administrative bulletins.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6"
            >
              <Plus className="size-4" />
              <span>Post New Notice</span>
            </Button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="pointer-events-none absolute -bottom-2 right-2 sm:right-6 w-44 sm:w-56 h-36 sm:h-44 z-10">
          <Image
            src="/images/announce.webp"
            alt="Announcements"
            fill
            priority
            className="object-contain object-bottom-right drop-shadow-md"
          />
        </div>
      </section>

      {/* 2. Four KPI Stat Pill Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Megaphone className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {announcements.length}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Total Bulletins
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Pin className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {pinnedItems.length}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Pinned Notices
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <Globe className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {centerCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Center-wide
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
            <Layers className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-black text-foreground tabular-nums">
              {classesCount}
            </p>
            <p className="text-[11px] font-semibold text-muted-foreground truncate">
              Class Specific
            </p>
          </div>
        </div>
      </section>

      {/* 3. Search Bar */}
      <section className="flex items-center justify-between gap-4">
        <h3 className="font-extrabold text-lg text-foreground tracking-tight">
          Recent Bulletins
        </h3>
        <div className="relative w-full sm:w-72">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search bulletins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      {/* 4. Announcements Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center space-y-3">
          <Bell className="size-12 mx-auto text-muted-foreground/40" />
          <h4 className="font-extrabold text-base text-foreground">No bulletins right now</h4>
          <p className="text-xs text-muted-foreground">Click &quot;Post New Notice&quot; to publish a notice.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="bg-card border border-border rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-secondary text-primary border border-border">
                      {ann.audience === "center" ? "Entire Center" : ann.classes.join(", ") || "Class"}
                    </span>
                    {ann.pinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        <Pin className="size-3 fill-amber-500" />
                        <span>Pinned</span>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(ann.publishAt).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors">
                  {ann.title}
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed line-clamp-3">
                  {ann.body}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-medium">
                <span>By {ann.authorName} ({ann.authorRole})</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Notice Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground">
              Post Announcement
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Broadcast a message to your students or center members.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Notice Title
              </label>
              <Input
                placeholder="e.g. Term 1 Revision Schedule Updates"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Audience
              </label>
              <Select
                value={audience}
                onChange={(e) => setAudience(e.target.value as any)}
              >
                <option value="center">Entire Center</option>
                <option value="classes">Specific Class Batch</option>
              </Select>
            </div>

            {audience === "classes" && (
              <div>
                <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                  Select Class
                </label>
                <Select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Select a class batch...</option>
                  {(classesData?.data || []).map((cls: any) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-foreground block pl-2 mb-1">
                Notice Content
              </label>
              <Textarea
                rows={4}
                placeholder="Write notice details..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="rounded-2xl"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-secondary">
              <div>
                <p className="text-xs font-bold text-foreground">Pin to top</p>
                <p className="text-[10px] text-muted-foreground">
                  Keep notice highlighted at top of students&apos; feeds
                </p>
              </div>
              <Switch checked={pinned} onCheckedChange={setPinned} />
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="rounded-full h-11 px-5"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !title || !body}
              className="rounded-full h-11 px-6 font-bold"
            >
              {createMutation.isPending ? "Posting..." : "Publish Notice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
