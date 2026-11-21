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
import { Plus, KeyRound, Trash2, Edit, Copy, Check, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AdminRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  role: "super_admin" | "admin";
  status: "active" | "disabled";
  joinedAt: string;
}

export default function AdminsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editAdmin, setEditAdmin] = React.useState<AdminRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admins", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      });
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`/api/v1/admins?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load administrators");
      return res.json();
    },
  });

  const admins: AdminRecord[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email: email || undefined,
          phone: phone || undefined,
          role: "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create administrator");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Administrator added successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editAdmin) return;
      const res = await fetch(`/api/v1/admins/${editAdmin.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update administrator");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setEditAdmin(null);
      toast.success("Administrator updated successfully");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admins/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete administrator");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setDeleteId(null);
      toast.success("Administrator deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/admins/${id}/reset-password`, { method: "POST" });
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
    setEmail("");
    setPhone("");
  };

  const handleOpenEdit = (a: AdminRecord) => {
    setEditAdmin(a);
    setName(a.name);
    setUsername(a.username);
    setEmail(a.email || "");
    setPhone(a.phone || "");
  };

  const columns: ColumnDef<AdminRecord>[] = [
    {
      accessorKey: "name",
      header: "Administrator",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {row.original.role === "super_admin" ? "Super Admin (Developer)" : "Center Admin"}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span>{row.original.email || "-"}</span>,
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
      cell: ({ row }) => {
        const isSuper = row.original.role === "super_admin";
        return (
          <div className="flex items-center gap-2">
            <Can permission="admins.update">
              <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
                <Edit className="size-4" />
              </Button>
            </Can>
            <Can permission="admins.resetPassword">
              <Button variant="outline" size="icon-sm" onClick={() => setResetId(row.original.id)} aria-label="Reset Password">
                <KeyRound className="size-4" />
              </Button>
            </Can>
            {!isSuper && (
              <Can permission="admins.delete">
                <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} aria-label="Delete">
                  <Trash2 className="size-4" />
                </Button>
              </Can>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Administrators" description="Manage system administrators.">
        <Can permission="admins.create">
          <Button
            className="rounded-full h-12"
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="size-5 mr-2" />
            Add Administrator
          </Button>
        </Can>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard label="Total Admins" value={meta.total} subtitle="Center owners and developers" icon={ShieldAlert} />
        <StatCard label="Active Status" value={admins.filter((a) => a.status === "active").length} subtitle="System managers" icon={ShieldCheck} />
      </div>

      <FilterBar>
        <SearchInput
          value={search}
          onValueChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search by administrator name or username..."
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
        data={admins}
        loading={isLoading}
        pageCount={meta.totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyMessage="No administrators found."
        mobileCardRender={(a) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{a.name}</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold capitalize">
                {a.role.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{a.email || a.phone || "-"}</div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Can permission="admins.update">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(a)}>Edit</Button>
              </Can>
              <Can permission="admins.resetPassword">
                <Button variant="outline" size="sm" onClick={() => setResetId(a.id)}>Reset</Button>
              </Can>
              {a.role !== "super_admin" && (
                <Can permission="admins.delete">
                  <Button variant="outline" size="sm" onClick={() => setDeleteId(a.id)}>Delete</Button>
                </Can>
              )}
            </div>
          </div>
        )}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Administrator</DialogTitle>
            <DialogDescription>A temporary password will be generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Full Name</label>
              <Input placeholder="e.g. Priyantha Dissanayake" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Username</label>
              <Input placeholder="e.g. priyantha" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Email</label>
              <Input type="email" placeholder="priyantha@newgen.lk" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Phone</label>
              <Input placeholder="+94 77 555 1234" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !username || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Administrator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAdmin} onOpenChange={(open) => !open && setEditAdmin(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Administrator</DialogTitle>
            <DialogDescription>Update administrator details.</DialogDescription>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdmin(null)}>Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!name || editMutation.isPending}>
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription>This password will only be shown once. Please copy and give it to the administrator.</DialogDescription>
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
        title="Delete this administrator?"
        description="This cannot be undone. System audit records will be kept."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />

      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => !open && setResetId(null)}
        title="Reset administrator password?"
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
