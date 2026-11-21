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
import { Select } from "@/components/ui/select";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, KeyRound, Trash2, Edit, Copy, Check, UserCheck, ShieldCheck, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";

interface TeacherRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  title: string;
  status: "active" | "disabled";
  joinedAt: string;
  assignedCenterIds?: string[];
  centers?: Array<{ id: string; name: string }>;
}

export default function TeachersPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editTeacher, setEditTeacher] = React.useState<TeacherRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedCenterIds, setSelectedCenterIds] = React.useState<string[]>([]);

  const canAssignCenters = user?.role === "super_admin" || user?.role === "admin";

  // Fetch available centers for multi-center assignment
  const { data: centersData } = useQuery<{ data: Array<{ _id: string; name: string }> }>({
    queryKey: ["centers-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/centers");
      if (!res.ok) return { data: [] };
      return res.json();
    },
  });
  const availableCenters = centersData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ["teachers", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/v1/teachers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load teachers");
      return res.json();
    },
  });

  const teachers: TeacherRecord[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email: email || undefined,
          phone: phone || undefined,
          role: "teacher",
          title: title || "Teacher",
          password: password.trim() ? password.trim() : undefined,
          centerIds: selectedCenterIds.length > 0 ? selectedCenterIds : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create teacher");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Teacher added successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editTeacher) return;
      const res = await fetch(`/api/v1/teachers/${editTeacher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          title,
          centerIds: selectedCenterIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update teacher");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setEditTeacher(null);
      toast.success("Teacher updated successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/teachers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete teacher");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setDeleteId(null);
      toast.success("Teacher deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/teachers/${id}/reset-password`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reset password");
      return json.data;
    },
    onSuccess: (result) => {
      setResetId(null);
      setTempPassword(result.temporaryPassword);
      toast.success("Password reset successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setEmail("");
    setPhone("");
    setTitle("");
    setSelectedCenterIds(user?.centerId ? [user.centerId] : []);
  };

  const handleOpenEdit = (t: TeacherRecord) => {
    setEditTeacher(t);
    setName(t.name);
    setUsername(t.username);
    setEmail(t.email || "");
    setPhone(t.phone || "");
    setTitle(t.title);
    setSelectedCenterIds(t.assignedCenterIds || (t.centers ? t.centers.map((c) => c.id) : []));
  };

  const columns: ColumnDef<TeacherRecord>[] = [
    {
      accessorKey: "name",
      header: "Teacher Name",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Designation",
      cell: ({ row }) => <span>{row.original.title}</span>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span>{row.original.email || "-"}</span>,
    },
    {
      accessorKey: "centers",
      header: "Assigned Centers",
      cell: ({ row }) => {
        const centersList = row.original.centers || [];
        if (centersList.length === 0) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1.5 max-w-xs">
            {centersList.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                <Building2 className="size-3 text-muted-foreground" />
                <span>{c.name}</span>
              </span>
            ))}
          </div>
        );
      },
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
          <Can permission="teachers.update">
            <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
              <Edit className="size-4" />
            </Button>
          </Can>
          <Can permission="teachers.resetPassword">
            <Button variant="outline" size="icon-sm" onClick={() => setResetId(row.original.id)} aria-label="Reset Password">
              <KeyRound className="size-4" />
            </Button>
          </Can>
          <Can permission="teachers.delete">
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
      <PageHeader title="Manage Teachers" description="Add, edit or remove teachers here.">
        <Can permission="teachers.create">
          <Button
            className="rounded-full h-12"
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="size-5 mr-2" />
            Add Teacher
          </Button>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard label="Total Teachers" value={meta.total} subtitle="Active academic faculty" icon={UserCheck} />
        <StatCard label="Active Status" value={teachers.filter((t) => t.status === "active").length} subtitle="Faculty in service" icon={ShieldCheck} />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onValueChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search by teacher name or username..."
        />
        <div className="w-40">
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </Select>
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={teachers}
        loading={isLoading}
        pageCount={meta.totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyMessage="No teachers found."
        mobileCardRender={(t) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{t.name}</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold capitalize">
                {t.status}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{t.title} • {t.email || t.phone || "-"}</div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Can permission="teachers.update">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(t)}>Edit</Button>
              </Can>
              <Can permission="teachers.resetPassword">
                <Button variant="outline" size="sm" onClick={() => setResetId(t.id)}>Reset</Button>
              </Can>
              <Can permission="teachers.delete">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(t.id)}>Delete</Button>
              </Can>
            </div>
          </div>
        )}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Teacher</DialogTitle>
            <DialogDescription>A temporary password will be generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Full Name</label>
              <Input placeholder="e.g. Dr. Kamal Silva" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Username</label>
              <Input placeholder="e.g. kamal" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">
                Temporary Password <span className="text-muted-foreground font-normal">(optional — auto-generated if blank)</span>
              </label>
              <Input
                type="text"
                placeholder="Leave blank to auto-generate password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Email</label>
              <Input type="email" placeholder="kamal@newgen.lk" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Phone</label>
              <Input placeholder="+94 77 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Designation</label>
              <Input placeholder="e.g. Senior Physics Lecturer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {canAssignCenters && availableCenters.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">
                  Assigned Education Centers ({selectedCenterIds.length} selected)
                </label>
                <div className="rounded-2xl border border-border bg-card p-3 space-y-2 max-h-40 overflow-y-auto">
                  {availableCenters.map((c) => {
                    const isChecked = selectedCenterIds.includes(c._id);
                    return (
                      <label
                        key={c._id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCenterIds((prev) => [...prev, c._id]);
                            } else {
                              setSelectedCenterIds((prev) => prev.filter((id) => id !== c._id));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Building2 className="size-4 text-muted-foreground" />
                          <span>{c.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground pl-2">
                  Only Admins can assign centers. Teachers can switch between their assigned centers in the top header.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !username || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTeacher} onOpenChange={(open) => !open && setEditTeacher(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
            <DialogDescription>Update teacher details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Designation</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            {canAssignCenters && availableCenters.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground block pl-2 mb-1">
                  Assigned Education Centers ({selectedCenterIds.length} selected)
                </label>
                <div className="rounded-2xl border border-border bg-card p-3 space-y-2 max-h-40 overflow-y-auto">
                  {availableCenters.map((c) => {
                    const isChecked = selectedCenterIds.includes(c._id);
                    return (
                      <label
                        key={c._id}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCenterIds((prev) => [...prev, c._id]);
                            } else {
                              setSelectedCenterIds((prev) => prev.filter((id) => id !== c._id));
                            }
                          }}
                        />
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Building2 className="size-4 text-muted-foreground" />
                          <span>{c.name}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground pl-2">
                  Only Admins can assign centers. Teachers can switch between their assigned centers in the top header.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacher(null)}>Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!name || editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription>This password will only be shown once. Please copy and share it with the teacher.</DialogDescription>
          </DialogHeader>
          <div className="my-6 p-4 rounded-3xl bg-muted/60 border border-border flex items-center justify-between">
            <span className="text-2xl font-bold tracking-wider text-foreground select-all font-mono">
              {tempPassword}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => {
                if (tempPassword) {
                  navigator.clipboard.writeText(tempPassword);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast.success("Password copied to clipboard");
                }
              }}
              aria-label="Copy password"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this teacher?"
        description="This cannot be undone. History will be preserved."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />

      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => !open && setResetId(null)}
        title="Reset teacher password?"
        description="This will revoke current sessions and generate a new temporary password."
        confirmLabel="Reset Password"
        isDestructive={false}
        onConfirm={async () => {
          if (resetId) await resetPasswordMutation.mutateAsync(resetId);
        }}
      />
    </div>
  );
}
