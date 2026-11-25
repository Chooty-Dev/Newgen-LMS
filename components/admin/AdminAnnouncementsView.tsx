"use client";

import * as React from "react";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Megaphone, Pin, Globe } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminAssetTiles, AdminStatusPill, AdminSurface, AdminToolbar } from "./AdminUI";

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

export function AdminAnnouncementsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [audience, setAudience] = React.useState<"center" | "classes">("center");
  const [selectedClassId, setSelectedClassId] = React.useState("");
  const [pinned, setPinned] = React.useState(false);

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

  const { data: classesData } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => (await fetch("/api/v1/classes")).json(),
  });

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
      if (!res.ok) throw new Error(json.error?.message || "Failed to publish");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setCreateOpen(false);
      toast.success("Announcement published");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setDeleteId(null);
      toast.success("Deleted");
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
  const centerCount = announcements.filter((a) => a.audience === "center").length;

  const columns: ColumnDef<AnnouncementRecord>[] = [
    {
      accessorKey: "title",
      header: "Notice",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground text-xs flex items-center gap-1.5">
            {row.original.pinned && <Pin className="size-3.5 text-[var(--primary)] fill-[var(--primary)]" />}
            <span>{row.original.title}</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{row.original.body}</p>
        </div>
      ),
    },
    {
      accessorKey: "audience",
      header: "Target",
      cell: ({ row }) => (
        <AdminStatusPill
          label={row.original.audience === "center" ? "Center" : row.original.classes.join(", ") || "Class"}
          tone="neutral"
        />
      ),
    },
    {
      accessorKey: "publishAt",
      header: "Date",
      cell: ({ row }) => <span className="text-xs text-muted-foreground tabular-nums">{row.original.publishAt}</span>,
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Can permission="announcements.delete">
          <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
            <Trash2 className="size-3.5" />
          </Button>
        </Can>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Notices", value: announcements.length, icon: Megaphone, badge: "Published", tone: 1 },
          { label: "Pinned", value: pinnedItems.length, icon: Pin, badge: "Highlighted", tone: 2 },
          { label: "Center-Wide", value: centerCount, icon: Globe, badge: "Broadcast", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search announcements..."
        actions={
          <Can permission="announcements.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>New Notice</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable columns={columns} data={announcements} loading={isLoading} emptyMessage="No announcements found." />
      </AdminSurface>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader><DialogTitle className="text-lg font-bold">New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Title</label>
              <Input placeholder="Term Exam Timetable" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Message</label>
              <Textarea placeholder="Short notice content..." value={body} onChange={(e) => setBody(e.target.value)} className="rounded-xl min-h-[100px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Audience</label>
                <Select value={audience} onChange={(e) => setAudience(e.target.value as "center" | "classes")} className="h-9 rounded-xl">
                  <option value="center">Entire Center</option>
                  <option value="classes">Specific Class</option>
                </Select>
              </div>
              {audience === "classes" && (
                <div>
                  <label className="font-semibold block mb-1">Class</label>
                  <Select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="h-9 rounded-xl">
                    <option value="">Select Class</option>
                    {(classesData?.data || []).map((c: { id: string; name: string }) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="font-semibold">Pin to top</span>
              <Switch checked={pinned} onCheckedChange={setPinned} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!title || !body || (audience === "classes" && !selectedClassId) || createMutation.isPending}
              className="rounded-full h-10 px-5 text-xs"
            >
              {createMutation.isPending ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete announcement?"
        description="Removes this notice immediately."
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
      />
    </div>
  );
}
