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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, KeyRound, Trash2, Edit, Copy, Check, ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "@/components/admin/AdminUI";

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
      const params = new URLSearchParams({ page: page.toString(), limit: "10", search });
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
      if (!res.ok) throw new Error(json.error?.message || "Failed to add administrator");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admins"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Administrator added");
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
      toast.success("Administrator updated");
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
      toast.success("Administrator deleted");
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
      toast.success("Password reset");
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
          <div className="font-bold text-foreground text-xs">{row.original.name}</div>
          <div className="text-[11px] text-muted-foreground">@{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <AdminStatusPill
          label={row.original.role === "super_admin" ? "Super Admin" : "Center Admin"}
          tone={row.original.role === "super_admin" ? "primary" : "neutral"}
        />
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.email || "—"}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <AdminStatusPill label={row.original.status} tone={row.original.status === "active" ? "primary" : "danger"} />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const isSuper = row.original.role === "super_admin";
        return (
          <div className="flex items-center gap-1.5">
            <Can permission="admins.update">
              <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
                <Edit className="size-3.5" />
              </Button>
            </Can>
            <Can permission="admins.resetPassword">
              <Button variant="outline" size="icon-sm" onClick={() => setResetId(row.original.id)} aria-label="Reset Password">
                <KeyRound className="size-3.5" />
              </Button>
            </Can>
            {!isSuper && (
              <Can permission="admins.delete">
                <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
                  <Trash2 className="size-3.5" />
                </Button>
              </Can>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Admins", value: meta.total, icon: ShieldAlert, badge: "Registered", tone: 1 },
          { label: "Active", value: admins.filter((a) => a.status === "active").length, icon: ShieldCheck, badge: "Online", tone: 2 },
          { label: "Super Admins", value: admins.filter((a) => a.role === "super_admin").length, icon: Shield, badge: "Root access", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search administrators..."
        filters={
          <AdminFilterSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </AdminFilterSelect>
        }
        actions={
          <Can permission="admins.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Admin</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={admins}
          loading={isLoading}
          pageCount={meta.totalPages}
          currentPage={page}
          onPageChange={setPage}
          emptyMessage="No administrators found."
          mobileCardRender={(a) => (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{a.name}</span>
                <AdminStatusPill label={a.role.replace(/_/g, " ")} />
              </div>
              <div className="text-muted-foreground">{a.email || a.phone || "—"}</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Can permission="admins.update"><Button variant="outline" size="sm" onClick={() => handleOpenEdit(a)}>Edit</Button></Can>
                <Can permission="admins.resetPassword"><Button variant="outline" size="sm" onClick={() => setResetId(a.id)}>Reset</Button></Can>
                {a.role !== "super_admin" && (
                  <Can permission="admins.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(a.id)}>Delete</Button></Can>
                )}
              </div>
            </div>
          )}
        />
      </AdminSurface>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Administrator</DialogTitle>
            <DialogDescription className="text-xs">A temporary password is generated automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Full Name</label>
              <Input placeholder="Priyantha Dissanayake" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Username</label>
              <Input placeholder="priyantha" value={username} onChange={(e) => setUsername(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Email</label>
                <Input type="email" placeholder="email@newgen.lk" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phone</label>
                <Input placeholder="+94 77 555 1234" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !username || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Adding..." : "Add Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAdmin} onOpenChange={(open) => !open && setEditAdmin(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Administrator</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdmin(null)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => editMutation.mutate()} disabled={!name || editMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription className="text-xs">Copy and share this password once.</DialogDescription>
          </DialogHeader>
          <div className="my-4 p-3 rounded-2xl bg-[var(--admin-surface)] border border-border flex items-center justify-between">
            <span className="text-xl font-bold font-mono select-all">{tempPassword}</span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => {
                if (tempPassword) {
                  navigator.clipboard.writeText(tempPassword);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast.success("Copied");
                }
              }}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-full" onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete administrator?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
      />

      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => !open && setResetId(null)}
        title="Reset password?"
        description="Generates a new temporary password."
        confirmLabel="Reset"
        isDestructive={false}
        onConfirm={async () => { if (resetId) await resetPasswordMutation.mutateAsync(resetId); }}
      />
    </div>
  );
}
