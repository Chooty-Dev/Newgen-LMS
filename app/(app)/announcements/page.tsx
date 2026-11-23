"use client";

import * as React from "react";
import Image from "next/image";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Megaphone, Pin, Globe, Search, Bell } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { StudentAnnouncementsView } from "@/components/student/StudentAnnouncementsView";
import { TeacherAnnouncementsView } from "@/components/teacher/TeacherAnnouncementsView";

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

export default function AnnouncementsPage() {
  const { user } = useAuth();
  if (user?.role === "student") {
    return <StudentAnnouncementsView />;
  }
  if (user?.role === "teacher") {
    return <TeacherAnnouncementsView />;
  }
  return <StaffAnnouncementsPage />;
}

function StaffAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

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

  // Fetch classes for dropdown
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
      if (!res.ok) throw new Error(json.error?.message || "Failed to create announcement");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setCreateOpen(false);
      toast.success("Announcement published successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete announcement");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDeleteId(null);
      toast.success("Announcement deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setTitle("");
    setBody("");
    setAudience("center");
    setSelectedClassId("");
    setPinned(false);
  };

  const pinnedItems = announcements.filter((a) => a.pinned);

  const columns: ColumnDef<AnnouncementRecord>[] = [
    {
      accessorKey: "title",
      header: "Announcement",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground text-base flex items-center gap-2">
            {row.original.pinned && <Pin className="size-4 text-foreground fill-foreground" />}
            <span>{row.original.title}</span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{row.original.body}</p>
        </div>
      ),
    },
    {
      accessorKey: "audience",
      header: "Audience",
      cell: ({ row }) => {
        const isCenter = row.original.audience === "center";
        return (
          <span className="inline-flex rounded-full bg-secondary text-primary border border-border px-3 py-0.5 text-xs font-bold capitalize">
            {isCenter ? "Entire Center" : row.original.classes.join(", ") || "Classes"}
          </span>
        );
      },
    },
    {
      accessorKey: "publishAt",
      header: "Date Published",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.publishAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Can permission="announcements.delete">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setDeleteId(row.original.id)}
            aria-label="Delete announcement"
          >
            <Trash2 className="size-4" />
          </Button>
        </Can>
      ),
    },
  ];

  const classBulletinsCount = announcements.filter((a) => a.audience === "classes").length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Announcements & Notices
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Broadcast circulars to students, pin urgent examination reminders, or publish updates across target batches.
            </p>
            <div className="pt-2">
              <Can permission="announcements.create">
                <Button
                  onClick={() => {
                    resetForm();
                    setCreateOpen(true);
                  }}
                  className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>New Announcement</span>
                </Button>
              </Can>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/announce.webp"
              alt="Announcements"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Megaphone className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {announcements.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Notices
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Pin className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {pinnedItems.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Pinned Alerts
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Globe className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {announcements.filter((a) => a.audience === "center").length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Center-Wide
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Bell className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {classBulletinsCount}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Class Bulletins
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-full">
            <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 rounded-full bg-card border border-border text-xs sm:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
            />
          </div>
        </div>
      </section>

      {/* Featured Pinned Notices */}
      {pinnedItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Pin className="size-5" />
            <span>Pinned Announcements</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedItems.map((pin) => (
              <Card key={pin.id} className="rounded-3xl border-border bg-card p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {pin.audience === "center" ? "Entire Center" : pin.classes.join(", ")}
                    </span>
                    <h3 className="text-xl font-semibold text-foreground mt-1">{pin.title}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(pin.publishAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-base text-foreground/90 mt-3 whitespace-pre-wrap">{pin.body}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <FilterBar>
        <SearchInput value={search} onValueChange={setSearch} placeholder="Search announcement title or content..." />
      </FilterBar>

      <DataTable
        columns={columns}
        data={announcements}
        loading={isLoading}
        emptyMessage="No announcements found."
        mobileCardRender={(a) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{a.title}</span>
              <span className="text-xs text-muted-foreground">{new Date(a.publishAt).toLocaleDateString()}</span>
            </div>
            <p className="text-base text-foreground/90">{a.body}</p>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold">
                {a.audience === "center" ? "Center" : a.classes.join(", ")}
              </span>
              <Can permission="announcements.delete">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(a.id)}>Delete</Button>
              </Can>
            </div>
          </div>
        )}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post Announcement</DialogTitle>
            <DialogDescription>Publish a notice for students, teachers, and staff.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Title</label>
              <Input placeholder="e.g. Schedule update for Term 1 examination" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Message Content</label>
              <Textarea
                placeholder="Write the detailed announcement message here..."
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Audience</label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={audience === "center" ? "default" : "outline"}
                  onClick={() => setAudience("center")}
                  className="flex-1"
                >
                  Entire Center
                </Button>
                <Button
                  type="button"
                  variant={audience === "classes" ? "default" : "outline"}
                  onClick={() => setAudience("classes")}
                  className="flex-1"
                >
                  Specific Class
                </Button>
              </div>
            </div>

            {audience === "classes" && (
              <div>
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">Select Target Class</label>
                <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
                  <option value="">Choose Class</option>
                  {(classesData?.data || []).map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between p-4 rounded-3xl bg-muted/30 border border-border">
              <div>
                <span className="text-base font-semibold text-foreground block">Pin Announcement</span>
                <span className="text-xs text-muted-foreground">Keep at the top of the feed</span>
              </div>
              <Switch checked={pinned} onCheckedChange={setPinned} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title || !body || (audience === "classes" && !selectedClassId) || createMutation.isPending}
            >
              {createMutation.isPending ? "Publishing..." : "Publish Announcement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this announcement?"
        description="This will remove the announcement for all users."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />
    </div>
  );
}
