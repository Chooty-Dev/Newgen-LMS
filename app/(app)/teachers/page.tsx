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
import { Plus, KeyRound, Trash2, Edit, Copy, Check, UserCheck, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "@/components/admin/AdminUI";

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
      const params = new URLSearchParams({ page: page.toString(), limit: "10", search });
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
      if (!res.ok) throw new Error(json.error?.message || "Failed to add teacher");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Teacher added");
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
      toast.success("Teacher updated");
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
      toast.success("Teacher deleted");
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
      toast.success("Password reset");
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
      header: "Teacher",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground text-xs">{row.original.name}</div>
          <div className="text-[11px] text-muted-foreground">@{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => <span className="text-xs">{row.original.title}</span>,
    },
    {
      accessorKey: "centers",
      header: "Centers",
      cell: ({ row }) => {
        const list = row.original.centers || [];
        if (list.length === 0) return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {list.map((c) => (
              <AdminStatusPill key={c.id} label={c.name} tone="neutral" />
            ))}
          </div>
        );
      },
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Can permission="teachers.update">
            <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
              <Edit className="size-3.5" />
            </Button>
          </Can>
          <Can permission="teachers.resetPassword">
            <Button variant="outline" size="icon-sm" onClick={() => setResetId(row.original.id)} aria-label="Reset Password">
              <KeyRound className="size-3.5" />
            </Button>
          </Can>
          <Can permission="teachers.delete">
            <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
              <Trash2 className="size-3.5" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const activeCount = teachers.filter((t) => t.status === "active").length;
  const multiCenterCount = teachers.filter((t) => t.assignedCenterIds && t.assignedCenterIds.length > 1).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Teachers", value: meta.total, icon: UserCheck, badge: "Faculty", tone: 1 },
          { label: "Active", value: activeCount, icon: ShieldCheck, badge: "Verified", tone: 2 },
          { label: "Multi-Center", value: multiCenterCount, icon: Building2, badge: "Cross-branch", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search teachers..."
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
          <Can permission="teachers.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Teacher</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={teachers}
          loading={isLoading}
          pageCount={meta.totalPages}
          currentPage={page}
          onPageChange={setPage}
          emptyMessage="No teachers found."
          mobileCardRender={(t) => (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">{t.name}</span>
                <AdminStatusPill label={t.status} tone={t.status === "active" ? "primary" : "danger"} />
              </div>
              <div className="text-muted-foreground">{t.title}</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Can permission="teachers.update"><Button variant="outline" size="sm" onClick={() => handleOpenEdit(t)}>Edit</Button></Can>
                <Can permission="teachers.resetPassword"><Button variant="outline" size="sm" onClick={() => setResetId(t.id)}>Reset</Button></Can>
                <Can permission="teachers.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(t.id)}>Delete</Button></Can>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Teacher</DialogTitle>
            <DialogDescription className="text-xs">Temporary password auto-generates if blank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Full Name</label>
                <Input placeholder="Dr. Kamal Silva" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Username</label>
                <Input placeholder="kamal" value={username} onChange={(e) => setUsername(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Email</label>
                <Input type="email" placeholder="kamal@newgen.lk" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phone</label>
                <Input placeholder="+94 77 123 4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Designation</label>
                <Input placeholder="Physics Lecturer" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Password (optional)</label>
                <Input placeholder="Auto-generate" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            {canAssignCenters && availableCenters.length > 0 && (
              <div>
                <label className="font-semibold block mb-1">Centers ({selectedCenterIds.length})</label>
                <div className="rounded-xl border border-border bg-[var(--admin-surface)] p-2.5 space-y-1.5 max-h-32 overflow-y-auto">
                  {availableCenters.map((c) => (
                    <label key={c._id} className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white cursor-pointer">
                      <Checkbox
                        checked={selectedCenterIds.includes(c._id)}
                        onCheckedChange={(checked) =>
                          setSelectedCenterIds((prev) =>
                            checked ? [...prev, c._id] : prev.filter((id) => id !== c._id)
                          )
                        }
                      />
                      <span className="font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !username || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Adding..." : "Add Teacher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTeacher} onOpenChange={(open) => !open && setEditTeacher(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Designation</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 rounded-xl" />
            </div>
            {canAssignCenters && availableCenters.length > 0 && (
              <div>
                <label className="font-semibold block mb-1">Centers ({selectedCenterIds.length})</label>
                <div className="rounded-xl border border-border bg-[var(--admin-surface)] p-2.5 space-y-1.5 max-h-32 overflow-y-auto">
                  {availableCenters.map((c) => (
                    <label key={c._id} className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-white cursor-pointer">
                      <Checkbox
                        checked={selectedCenterIds.includes(c._id)}
                        onCheckedChange={(checked) =>
                          setSelectedCenterIds((prev) =>
                            checked ? [...prev, c._id] : prev.filter((id) => id !== c._id)
                          )
                        }
                      />
                      <span className="font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacher(null)} className="rounded-full h-10 text-xs">Cancel</Button>
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
            <DialogDescription className="text-xs">Copy and share this one-time password.</DialogDescription>
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
        title="Delete teacher?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => { if (deleteId) await deleteMutation.mutateAsync(deleteId); }}
      />

      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => !open && setResetId(null)}
        title="Reset password?"
        description="Generates a new temporary password and revokes active sessions."
        confirmLabel="Reset"
        isDestructive={false}
        onConfirm={async () => { if (resetId) await resetPasswordMutation.mutateAsync(resetId); }}
      />
    </div>
  );
}
