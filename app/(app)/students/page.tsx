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
import { Plus, Download, KeyRound, Trash2, Edit, Copy, Check, Users, Award, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { TeacherStudentsView } from "@/components/teacher/TeacherStudentsView";
import { cn } from "@/lib/utils";

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

export default function StudentsPage() {
  const { user } = useAuth();
  if (user?.role === "teacher") {
    return <TeacherStudentsView />;
  }

  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("");
  const [groupFilter, setGroupFilter] = React.useState("");
  const [page, setPage] = React.useState(1);

  // Modals state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editStudent, setEditStudent] = React.useState<StudentRecord | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [resetId, setResetId] = React.useState<string | null>(null);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Form fields
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [grade, setGrade] = React.useState("");
  const [guardianName, setGuardianName] = React.useState("");
  const [guardianPhone, setGuardianPhone] = React.useState("");

  // Fetch students
  const { data, isLoading } = useQuery({
    queryKey: ["students", page, search, statusFilter, groupFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      });
      if (statusFilter) params.append("status", statusFilter);
      if (groupFilter) params.append("group", groupFilter);

      const res = await fetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load students");
      return res.json();
    },
  });

  const students: StudentRecord[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Create mutation
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
      if (!res.ok) throw new Error(json.error?.message || "Failed to create student");
      return json.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setCreateOpen(false);
      setTempPassword(result.temporaryPassword);
      toast.success("Student added successfully");
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Edit mutation
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
      toast.success("Student updated successfully");
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/students/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete student");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setDeleteId(null);
      toast.success("Student deleted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Reset password mutation
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
      toast.success("Password reset successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
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

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  const columns: ColumnDef<StudentRecord>[] = [
    {
      accessorKey: "admissionNo",
      header: "Adm No",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.admissionNo}</span>,
    },
    {
      accessorKey: "name",
      header: "Student Name",
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">{row.original.username}</div>
        </div>
      ),
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <span>{row.original.grade || "-"}</span>,
    },
    {
      accessorKey: "performanceScore",
      header: "Score",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-foreground">
          {row.original.performanceScore}/100
        </span>
      ),
    },
    {
      accessorKey: "group",
      header: "Status",
      cell: ({ row }) => {
        const g = row.original.group;
        const isEx = g === "excellent";
        const isWeak = g === "weak";
        const label = isEx ? "Excellent" : isWeak ? "Needs Help" : "Good";
        return (
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-0.5 text-xs font-bold",
              isEx
                ? "bg-emerald-100 text-emerald-700"
                : isWeak
                ? "bg-amber-100 text-amber-700"
                : "bg-secondary text-primary border border-border"
            )}
          >
            {label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Can permission="students.update">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleOpenEdit(row.original)}
              aria-label="Edit student"
            >
              <Edit className="size-4" />
            </Button>
          </Can>
          <Can permission="students.resetPassword">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setResetId(row.original.id)}
              aria-label="Reset password"
            >
              <KeyRound className="size-4" />
            </Button>
          </Can>
          <Can permission="students.delete">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setDeleteId(row.original.id)}
              aria-label="Delete student"
            >
              <Trash2 className="size-4" />
            </Button>
          </Can>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Students"
        description="Add, edit or remove your students here."
      >
        <Can permission="students.export">
          <Button
            variant="outline"
            className="rounded-full h-12"
            onClick={() => window.open("/api/v1/students/export", "_blank")}
          >
            <Download className="size-5 mr-2" />
            Export CSV
          </Button>
        </Can>
        <Can permission="students.create">
          <Button
            className="rounded-full h-12"
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="size-5 mr-2" />
            Add Student
          </Button>
        </Can>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Total Students"
          value={meta.total}
          subtitle="Enrolled in center"
          icon={Users}
        />
        <StatCard
          label="High Performers"
          value={students.filter((s) => s.group === "excellent").length}
          subtitle="Scored 75 and above"
          icon={Award}
        />
        <StatCard
          label="Needs Help"
          value={students.filter((s) => s.group === "weak").length}
          subtitle="Attention required"
          icon={AlertCircle}
        />
      </div>

      {/* Search and Filters */}
      <FilterBar>
        <SearchInput
          value={search}
          onValueChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="Search by name or username..."
        />
        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              value={groupFilter}
              onChange={(e) => {
                setGroupFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Groups</option>
              <option value="excellent">Excellent</option>
              <option value="medium">Good</option>
              <option value="weak">Needs Help</option>
            </Select>
          </div>
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
        </div>
      </FilterBar>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={students}
        loading={isLoading}
        pageCount={meta.totalPages}
        currentPage={page}
        onPageChange={setPage}
        emptyMessage="No students found."
        mobileCardRender={(student) => (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground text-lg">{student.name}</span>
              <span className="inline-flex rounded-full bg-muted px-3 py-0.5 text-xs font-semibold">
                {student.group === "excellent" ? "Excellent" : student.group === "medium" ? "Good" : "Needs Help"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Admission: {student.admissionNo} • Grade: {student.grade || "-"}
            </div>
            <div className="text-base font-semibold text-foreground">
              Score: {student.performanceScore}/100
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Can permission="students.update">
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(student)}>
                  Edit
                </Button>
              </Can>
              <Can permission="students.resetPassword">
                <Button variant="outline" size="sm" onClick={() => setResetId(student.id)}>
                  Reset Password
                </Button>
              </Can>
              <Can permission="students.delete">
                <Button variant="outline" size="sm" onClick={() => setDeleteId(student.id)}>
                  Delete
                </Button>
              </Can>
            </div>
          </div>
        )}
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
            <DialogDescription>
              A temporary password will be generated automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Full Name</label>
              <Input
                placeholder="e.g. Kasun Perera"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Username</label>
              <Input
                placeholder="e.g. kasun2026"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
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
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Email (Optional)</label>
              <Input
                type="email"
                placeholder="kasun@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Phone (Optional)</label>
              <Input
                placeholder="+94 77 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Grade</label>
              <Input
                placeholder="e.g. Grade 11"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Guardian Name</label>
              <Input
                placeholder="e.g. Sunil Perera"
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Guardian Phone</label>
              <Input
                placeholder="+94 71 987 6543"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name || !username || createMutation.isPending}
            >
              {createMutation.isPending ? "Adding..." : "Add Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={(open) => !open && setEditStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student contact information and grade.</DialogDescription>
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
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Grade</label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => editMutation.mutate()}
              disabled={!name || editMutation.isPending}
            >
              {editMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Temporary Password Notification Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent className="max-w-md text-center">
          <DialogHeader>
            <DialogTitle>Temporary Password</DialogTitle>
            <DialogDescription>
              This password will only be shown once. Please copy and give it to the student.
            </DialogDescription>
          </DialogHeader>
          <div className="my-6 p-4 rounded-3xl bg-muted/60 border border-border flex items-center justify-between">
            <span className="text-2xl font-bold tracking-wider text-foreground select-all font-mono">
              {tempPassword}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={handleCopyPassword}
              aria-label="Copy password"
            >
              {copied ? <Check className="size-4 text-foreground" /> : <Copy className="size-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setTempPassword(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this student?"
        description="This cannot be undone. All marks and attendance records will be preserved."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        open={!!resetId}
        onOpenChange={(open) => !open && setResetId(null)}
        title="Reset student password?"
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
