"use client";

import * as React from "react";
import Link from "next/link";
import { DataTable } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  StaffClassAssessmentPicker,
  useStaffAssignmentOptions,
} from "@/components/shared/StaffClassAssessmentPicker";
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
import { Plus, KeyRound, Trash2, Edit, Copy, Check, Users, ShieldCheck, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "./AdminUI";

interface StaffRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  title: string;
  position: string;
  status: "active" | "disabled";
  joinedAt: string;
  permissions?: string[];
  assignedClassIds?: string[];
  assignedAssessmentIds?: string[];
}

export function AdminStaffView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editStaff, setEditStaff] = React.useState<StaffRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = React.useState<string[]>([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = React.useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["staff", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: "10", search });
      if (statusFilter) params.append("status", statusFilter);
      const res = await fetch(`/api/v1/staff?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load staff");
      return res.json();
    },
  });

  const { classList, assessmentList, isLoadingOptions } = useStaffAssignmentOptions(
    createOpen || Boolean(editStaff)
  );

  const staffList: StaffRecord[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email: email || undefined,
          phone: phone || undefined,
          role: "staff",
          position: position || "Coordinator",
          password: password.trim() ? password.trim() : undefined,
          permissions: selectedPermissions,
          assignedClassIds: selectedClassIds,
          assignedAssessmentIds: selectedAssessmentIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to add staff");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Staff added");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editStaff) return;
      const res = await fetch(`/api/v1/staff/${editStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          position,
          permissions: selectedPermissions,
          assignedClassIds: selectedClassIds,
          assignedAssessmentIds: selectedAssessmentIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update staff");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setEditStaff(null);
      toast.success("Staff updated");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/staff/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete staff");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setDeleteId(null);
      toast.success("Staff deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/staff/${id}/reset-password`, { method: "POST" });
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
    setPosition("");
    setSelectedPermissions([]);
    setSelectedClassIds([]);
    setSelectedAssessmentIds([]);
  };

  const handleOpenEdit = (s: StaffRecord) => {
    setEditStaff(s);
    setName(s.name);
    setUsername(s.username);
    setEmail(s.email || "");
    setPhone(s.phone || "");
    setPosition(s.position);
    setSelectedPermissions(s.permissions || []);
    setSelectedClassIds(s.assignedClassIds || []);
    setSelectedAssessmentIds(s.assignedAssessmentIds || []);
  };

  const togglePermission = (permId: string, checked: boolean) => {
    setSelectedPermissions((prev) => {
      if (checked) {
        const next = new Set([...prev, permId]);
        if (permId.startsWith("students.") && permId !== "students.view") next.add("students.view");
        if (permId.startsWith("attendance.") && permId !== "attendance.view") next.add("attendance.view");
        if (permId === "attendance.mark") next.add("attendance.create");
        return Array.from(next);
      }
      let next = prev.filter((p) => p !== permId);
      if (permId === "students.view") next = next.filter((p) => !p.startsWith("students."));
      if (permId === "attendance.view") next = next.filter((p) => !p.startsWith("attendance."));
      if (permId === "attendance.mark") next = next.filter((p) => p !== "attendance.create");
      return next;
    });
  };

  const columns: ColumnDef<StaffRecord>[] = [
    {
      accessorKey: "name",
      header: "Staff Member",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/staff/${row.original.username}`}
            className="font-bold text-foreground text-xs hover:text-[var(--primary)] inline-flex items-center gap-1"
          >
            <span>{row.original.name}</span>
            <ExternalLink className="size-3 opacity-50" />
          </Link>
          <div className="text-[11px] text-muted-foreground">@{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: "position",
      header: "Role",
      cell: ({ row }) => <span className="text-xs">{row.original.position}</span>,
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
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Can permission="staff.update">
            <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
              <Edit className="size-3.5" />
            </Button>
          </Can>
          <Can permission="staff.resetPassword">
            <Button variant="outline" size="icon-sm" onClick={() => setResetId(row.original.id)} aria-label="Reset Password">
              <KeyRound className="size-3.5" />
            </Button>
          </Can>
          <Can permission="staff.delete">
            <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
              <Trash2 className="size-3.5" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const activeCount = staffList.filter((s) => s.status === "active").length;
  const delegatedCount = staffList.filter((s) => s.permissions && s.permissions.length > 0).length;

  const permGrid = (
    <div className="space-y-2 pt-2 border-t border-border">
      <label className="font-semibold block">Permissions</label>
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--admin-surface)] border border-border">
        {[
          { id: "students.view", label: "View Students" },
          { id: "students.create", label: "Add Students" },
          { id: "students.update", label: "Edit Students" },
          { id: "students.delete", label: "Delete Students" },
          { id: "attendance.view", label: "View Attendance" },
          { id: "attendance.mark", label: "Mark Attendance" },
          { id: "attendance.update", label: "Edit Attendance" },
          { id: "attendance.delete", label: "Delete Attendance" },
        ].map((perm) => (
          <label key={perm.id} className="flex items-center gap-2 text-[11px] font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={selectedPermissions.includes(perm.id)}
              onChange={(e) => togglePermission(perm.id, e.target.checked)}
              className="rounded size-3.5"
            />
            <span>{perm.label}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const assignmentLists = (
    <StaffClassAssessmentPicker
      classes={classList}
      assessments={assessmentList}
      isLoading={isLoadingOptions}
      selectedClassIds={selectedClassIds}
      selectedAssessmentIds={selectedAssessmentIds}
      onChangeClasses={(nextClasses, nextAssessments) => {
        setSelectedClassIds(nextClasses);
        setSelectedAssessmentIds(nextAssessments);
      }}
      onChangeAssessments={setSelectedAssessmentIds}
      layout="columns"
      surfaceClassName="bg-[var(--admin-surface)]"
    />
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Staff", value: meta.total, icon: Users, badge: "Registered", tone: 1 },
          { label: "Active", value: activeCount, icon: CheckCircle2, badge: "Operational", tone: 2 },
          { label: "Delegated", value: delegatedCount, icon: ShieldCheck, badge: "Custom access", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search staff..."
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
          <Can permission="staff.create">
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Staff</span>
            </Button>
          </Can>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={staffList}
          loading={isLoading}
          pageCount={meta.totalPages}
          currentPage={page}
          onPageChange={setPage}
          emptyMessage="No staff members found."
          mobileCardRender={(st) => (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <Link href={`/staff/${st.username}`} className="font-bold text-foreground">{st.name}</Link>
                <AdminStatusPill label={st.status} tone={st.status === "active" ? "primary" : "danger"} />
              </div>
              <div className="text-muted-foreground">{st.position}</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Can permission="staff.update"><Button variant="outline" size="sm" onClick={() => handleOpenEdit(st)}>Edit</Button></Can>
                <Can permission="staff.resetPassword"><Button variant="outline" size="sm" onClick={() => setResetId(st.id)}>Reset</Button></Can>
                <Can permission="staff.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(st.id)}>Delete</Button></Can>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Staff</DialogTitle>
            <DialogDescription className="text-xs">Temporary password auto-generates if blank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Full Name</label>
                <Input placeholder="Nimal Fernando" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Username</label>
                <Input placeholder="nimal" value={username} onChange={(e) => setUsername(e.target.value)} className="h-9 rounded-xl" />
              </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Position</label>
                <Input placeholder="Coordinator" value={position} onChange={(e) => setPosition(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Password (optional)</label>
                <Input placeholder="Auto-generate" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            {permGrid}
            {assignmentLists}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !username || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Adding..." : "Add Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editStaff} onOpenChange={(open) => !open && setEditStaff(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Full Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Position</label>
                <Input value={position} onChange={(e) => setPosition(e.target.value)} className="h-9 rounded-xl" />
              </div>
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
            {permGrid}
            {assignmentLists}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStaff(null)} className="rounded-full h-10 text-xs">Cancel</Button>
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
        title="Delete staff member?"
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
