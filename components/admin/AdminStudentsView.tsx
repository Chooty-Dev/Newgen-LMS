"use client";

import * as React from "react";
import Link from "next/link";
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
import {
  Plus,
  Download,
  KeyRound,
  Trash2,
  Edit,
  Copy,
  Check,
  Users,
  Award,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminAssetTiles,
  AdminFilterSelect,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "./AdminUI";

interface StudentRecord {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  status: "active" | "disabled";
  joinedAt: string;
  admissionNo: string;
  grade: string;
  performanceScore: number;
  group: "weak" | "medium" | "excellent";
}

export function AdminStudentsView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  const [createOpen, setCreateOpen] = React.useState(false);
  const [editStudent, setEditStudent] = React.useState<StudentRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [guardianName, setGuardianName] = React.useState("");
  const [guardianPhone, setGuardianPhone] = React.useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["students", page, search, statusFilter, groupFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: page.toString(), limit: "10", search });
      if (statusFilter) params.append("status", statusFilter);
      if (groupFilter) params.append("group", groupFilter);
      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const students: StudentRecord[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          username,
          email: email || undefined,
          phone: phone || undefined,
          role: "student",
          password: password.trim() ? password.trim() : undefined,
          grade: grade || undefined,
          guardian: guardianName ? { name: guardianName, phone: guardianPhone, relation: "Parent" } : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to add student");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Student added");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editStudent) return;
      const res = await fetch(`/api/v1/students/${editStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          grade: grade || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update student");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditStudent(null);
      toast.success("Student updated");
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete student");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setDeleteId(null);
      toast.success("Student deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/students/${id}/reset-password`, { method: "POST" });
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
    setGrade("");
    setGuardianName("");
    setGuardianPhone("");
  };

  const handleOpenEdit = (student: StudentRecord) => {
    setEditStudent(student);
    setName(student.name);
    setUsername(student.username);
    setEmail(student.email || "");
    setPhone(student.phone || "");
    setGrade(student.grade || "");
  };

  const columns: ColumnDef<StudentRecord>[] = [
    {
      accessorKey: "name",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <Link
            href={`/students/${row.original.username}`}
            className="font-bold text-foreground text-xs hover:text-[var(--primary)] inline-flex items-center gap-1"
          >
            <span>{row.original.name}</span>
            <ExternalLink className="size-3 opacity-50" />
          </Link>
          <div className="text-[11px] text-muted-foreground">
            @{row.original.username} • {row.original.admissionNo}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <span className="text-xs font-medium">{row.original.grade || "—"}</span>,
    },
    {
      accessorKey: "performanceScore",
      header: "Score",
      cell: ({ row }) => (
        <span className="text-xs font-bold tabular-nums text-foreground">
          {row.original.performanceScore}/100
        </span>
      ),
    },
    {
      accessorKey: "group",
      header: "Standing",
      cell: ({ row }) => {
        const g = row.original.group;
        const label = g === "excellent" ? "Excellent" : g === "weak" ? "Needs Help" : "Good";
        return <AdminStatusPill label={label} tone={g === "weak" ? "danger" : g === "excellent" ? "primary" : "sky"} />;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Can permission="students.update">
            <Button variant="outline" size="icon-sm" onClick={() => handleOpenEdit(row.original)} aria-label="Edit">
              <Edit className="size-3.5" />
            </Button>
          </Can>
          <Can permission="students.resetPassword">
            <Button variant="outline" size="icon-sm" onClick={() => setResetId(row.original.id)} aria-label="Reset Password">
              <KeyRound className="size-3.5" />
            </Button>
          </Can>
          <Can permission="students.delete">
            <Button variant="outline" size="icon-sm" onClick={() => setDeleteId(row.original.id)} className="text-rose-600" aria-label="Delete">
              <Trash2 className="size-3.5" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  const excellentCount = students.filter((s) => s.group === "excellent").length;
  const needsHelpCount = students.filter((s) => s.group === "weak").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Students", value: meta.total, icon: Users, badge: "Enrolled", tone: 1 },
          { label: "Top Standing", value: excellentCount, icon: Award, badge: "Excellent", tone: 2 },
          { label: "Needs Support", value: needsHelpCount, icon: AlertCircle, badge: "Monitor", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search students..."
        filters={
          <>
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
            <AdminFilterSelect
              value={groupFilter}
              onChange={(val) => {
                setGroupFilter(val);
                setPage(1);
              }}
            >
              <option value="">All Tiers</option>
              <option value="excellent">Excellent</option>
              <option value="medium">Good</option>
              <option value="weak">Needs Help</option>
            </AdminFilterSelect>
          </>
        }
        actions={
          <>
            <Can permission="students.export">
              <Button
                variant="outline"
                onClick={() => window.open("/api/v1/students/export", "_blank")}
                className="rounded-full h-10 px-4 text-xs font-bold gap-1.5"
              >
                <Download className="size-3.5" />
                <span>Export</span>
              </Button>
            </Can>
            <Can permission="students.create">
              <Button
                onClick={() => {
                  resetForm();
                  setCreateOpen(true);
                }}
                className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
              >
                <Plus className="size-4" />
                <span>Add Student</span>
              </Button>
            </Can>
          </>
        }
      />

      <AdminSurface className="p-2 sm:p-4">
        <DataTable
          columns={columns}
          data={students}
          loading={isLoading}
          pageCount={meta.totalPages}
          currentPage={page}
          onPageChange={setPage}
          emptyMessage="No students found."
          mobileCardRender={(st) => (
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <Link href={`/students/${st.username}`} className="font-bold text-foreground">
                  {st.name}
                </Link>
                <AdminStatusPill label={`${st.performanceScore}/100`} />
              </div>
              <div className="text-muted-foreground">@{st.username} • {st.grade || "—"}</div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Can permission="students.update"><Button variant="outline" size="sm" onClick={() => handleOpenEdit(st)}>Edit</Button></Can>
                <Can permission="students.resetPassword"><Button variant="outline" size="sm" onClick={() => setResetId(st.id)}>Reset</Button></Can>
                <Can permission="students.delete"><Button variant="outline" size="sm" onClick={() => setDeleteId(st.id)}>Delete</Button></Can>
              </div>
            </div>
          )}
        />
      </AdminSurface>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Student</DialogTitle>
            <DialogDescription className="text-xs">Temporary password auto-generates if blank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Full Name</label>
                <Input placeholder="Amal Perera" value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Username</label>
                <Input placeholder="amal26" value={username} onChange={(e) => setUsername(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Grade</label>
                <Input placeholder="Grade 10" value={grade} onChange={(e) => setGrade(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Password (optional)</label>
                <Input placeholder="Auto-generate" value={password} onChange={(e) => setPassword(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Email</label>
                <Input type="email" placeholder="email@student.lk" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phone</label>
                <Input placeholder="+94 77..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
              <div>
                <label className="font-semibold block mb-1">Guardian Name</label>
                <Input placeholder="Optional" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Guardian Phone</label>
                <Input placeholder="Optional" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!name || !username || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
              {createMutation.isPending ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Grade</label>
                <Input value={grade} onChange={(e) => setGrade(e.target.value)} className="h-9 rounded-xl" />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-9 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)} className="rounded-full h-10 text-xs">Cancel</Button>
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
        title="Delete student?"
        description="This cannot be undone."
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
