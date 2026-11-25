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
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Edit, BookOpen, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "./AdminUI";

interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
}

export function AdminSubjectsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editSubject, setEditSubject] = React.useState<SubjectRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["subjects", search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/v1/subjects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  const subjects: SubjectRecord[] = data?.data || [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code: code.toUpperCase(), description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to add subject");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setCreateOpen(false);
      toast.success("Subject added");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editSubject) return;
      const res = await fetch(`/api/v1/subjects/${editSubject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code: code.toUpperCase(), description }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update subject");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setEditSubject(null);
      toast.success("Subject updated");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/subjects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setDeleteId(null);
      toast.success("Subject deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
  };

  const handleOpenEdit = (s: SubjectRecord) => {
    setEditSubject(s);
    setName(s.name);
    setCode(s.code);
    setDescription(s.description || "");
  };

  const columns: ColumnDef<SubjectRecord>[] = [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="font-mono text-xs font-bold text-[var(--primary)]">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Subject",
      cell: ({ row }) => <span className="font-bold text-xs text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: "Summary",
      cell: ({ row }) => <span className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{row.original.description || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <AdminStatusPill label={row.original.status} tone={row.original.status === "active" ? "primary" : "neutral"} />,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Can permission="subjects.update">
            <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
              <Edit className="size-3.5" />
            </Button>
          </Can>
          <Can permission="subjects.delete">
            <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
              <Trash2 className="size-3.5" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const activeCount = subjects.filter((s) => s.status === "active").length;
  const archivedCount = subjects.filter((s) => s.status === "archived").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Subjects", value: subjects.length, icon: BookOpen, badge: "Catalog", tone: 1 },
          { label: "Active", value: activeCount, icon: CheckCircle2, badge: "Teaching", tone: 2 },
          { label: "Archived", value: archivedCount, icon: Clock, badge: "Past", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search subjects..."
        filters={
          <AdminFilterSelect value={statusFilter} onChange={setStatusFilter}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </AdminFilterSelect>
        }
        actions={
          <Can permission="subjects.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Subject</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={subjects}
          loading={isLoading}
          emptyMessage="No subjects found."
          mobileCardRender={(s) => (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold">{s.code} — {s.name}</span>
                <AdminStatusPill label={s.status} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Can permission="subjects.update"><Button variant="outline" size="sm" onClick={() => handleOpenEdit(s)}>Edit</Button></Can>
                <Can permission="subjects.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(s.id)}>Delete</Button></Can>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader><DialogTitle className="text-lg font-bold">Add Subject</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Code</label>
                <Input placeholder="MATH" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-9 rounded-xl" />
              </div>
              <div className="col-span-2">
                <label className="font-semibold block mb-1">Name</label>
                <Input placeholder="Mathematics" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Summary (Optional)</label>
              <Textarea placeholder="Short overview..." value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !code || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Adding..." : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSubject} onOpenChange={(open) => !open && setEditSubject(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader><DialogTitle className="text-lg font-bold">Edit Subject</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="font-semibold block mb-1">Code</label>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="h-9 rounded-xl" />
              </div>
              <div className="col-span-2">
                <label className="font-semibold block mb-1">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Summary</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubject(null)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!name || !code || editMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete subject?"
        description="Past records are preserved."
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
      />
    </div>
  );
}
