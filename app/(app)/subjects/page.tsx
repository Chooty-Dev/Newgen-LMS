"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Can } from "@/components/shared/Can";
import { Button } from "@/components/ui/button";
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
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2, Edit, BookOpen, Layers } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
}

export default function SubjectsPage() {
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
      if (!res.ok) throw new Error(json.error?.message || "Failed to create subject");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setCreateOpen(false);
      toast.success("Subject created successfully");
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
      toast.success("Subject updated successfully");
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
      toast.success("Subject deleted successfully");
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
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: "Subject Name",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.description || "-"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className="inline-flex rounded-full bg-muted px-4 py-1 text-sm font-semibold capitalize text-foreground">
          {row.original.status}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Can permission="subjects.update">
            <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
              <Edit className="size-4" />
            </Button>
          </Can>
          <Can permission="subjects.delete">
            <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} aria-label="Delete">
              <Trash2 className="size-4" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Subjects" description="Add, edit or organize curriculum subjects.">
        <Can permission="subjects.create">
          <Button
            className="rounded-full h-12"
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="size-5 mr-2" />
            Add Subject
          </Button>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard label="Total Subjects" value={subjects.length} subtitle="Active study areas" icon={BookOpen} />
        <StatCard label="Active Curriculum" value={subjects.filter((s) => s.status === "active").length} subtitle="Offered this term" icon={Layers} />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search by subject name or code..."
        />
        <div className="w-40">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={subjects}
        loading={isLoading}
        emptyMessage="No subjects found."
        mobileCardRender={(s) => (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{s.code} - {s.name}</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold capitalize">
                {s.status}
              </span>
            </div>
            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Can permission="subjects.update">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(s)}>Edit</Button>
              </Can>
              <Can permission="subjects.delete">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(s.id)}>Delete</Button>
              </Can>
            </div>
          </div>
        )}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>Create a new academic subject course.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Subject Code</label>
              <Input placeholder="e.g. MATH" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Subject Name</label>
              <Input placeholder="e.g. Mathematics" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Description (Optional)</label>
              <Textarea placeholder="Overview of curriculum..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !code || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editSubject} onOpenChange={(open) => !open && setEditSubject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>Update subject details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Subject Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Subject Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubject(null)}>Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!name || !code || editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this subject?"
        description="This cannot be undone. Past student marks and records will be preserved."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />
    </div>
  );
}
