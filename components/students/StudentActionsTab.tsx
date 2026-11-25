"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Check,
  Copy,
  KeyRound,
  Plus,
  Printer,
  Save,
  Shield,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StudentDetailRecord } from "./studentProfileTypes";

export function StudentActionsTab({
  student,
  onOpenAnalysis,
}: {
  student: StudentDetailRecord;
  onOpenAnalysis: () => void;
}) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canUpdateStudent = hasPermission("students.update");
  const canResetPassword = hasPermission("students.resetPassword");
  const canEnrollClass = hasPermission("classes.enrollStudents");

  // Profile Edit State
  const [name, setName] = React.useState(student.name);
  const [phone, setPhone] = React.useState(student.phone || "");
  const [email, setEmail] = React.useState(student.email || "");
  const [grade, setGrade] = React.useState(student.grade === "-" ? "" : student.grade);
  const [guardianName, setGuardianName] = React.useState(student.guardian?.name || "");
  const [guardianRelation, setGuardianRelation] = React.useState(
    student.guardian?.relation || "Parent"
  );
  const [guardianPhone, setGuardianPhone] = React.useState(student.guardian?.phone || "");

  // Class Enroll State
  const [selectedClassId, setSelectedClassId] = React.useState("");

  // Password & Status Confirmation Dialogs
  const [resetConfirmOpen, setResetConfirmOpen] = React.useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = React.useState(false);
  const [tempPassword, setTempPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const { data: classesData } = useQuery({
    queryKey: ["classes-for-student-enroll"],
    queryFn: async () => {
      const res = await fetch("/api/v1/classes?status=active");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: canEnrollClass,
  });

  const enrolledClassIds = new Set(
    student.enrollments.filter((e) => e.status === "active").map((e) => e.classId)
  );
  const availableClasses: Array<{ id: string; name: string }> = (classesData?.data || []).filter(
    (c: { id: string }) => !enrolledClassIds.has(c.id)
  );

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/v1/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update student");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-details"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setStatusConfirmOpen(false);
      toast.success("Student profile updated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const enrollClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      const res = await fetch(`/api/v1/classes/${classId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [student.id] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to enroll student");
      return json.data;
    },
    onSuccess: () => {
      setSelectedClassId("");
      queryClient.invalidateQueries({ queryKey: ["student-details"] });
      toast.success("Student enrolled into class.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/v1/students/${student.id}/reset-password`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to reset password");
      return json.data;
    },
    onSuccess: (data) => {
      setResetConfirmOpen(false);
      setTempPassword(data?.temporaryPassword || null);
      toast.success("Temporary password generated.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      grade: grade.trim(),
      guardian: {
        name: guardianName.trim(),
        relation: guardianRelation.trim() || "Parent",
        phone: guardianPhone.trim(),
      },
    });
  };

  const handleCopyTempPassword = () => {
    if (!tempPassword) return;
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Password copied to clipboard.");
  };

  const nextStatus = student.status === "active" ? "disabled" : "active";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-200">
      {/* Left: Update Profile & Guardian Details */}
      <div className="lg:col-span-7 bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#DDE8F8]">
          <div className="size-8 rounded-xl bg-[#EBF3FE] text-[#184880] flex items-center justify-center">
            <UserCog className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#0F172A]">Student & Guardian Profile</h3>
            <p className="text-[11px] text-[#627D98]">Keep contact records current for outreach.</p>
          </div>
        </div>

        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#627D98]">Full Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canUpdateStudent}
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#627D98]">Grade</label>
              <Input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                disabled={!canUpdateStudent}
                placeholder="e.g. Grade 11"
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#627D98]">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!canUpdateStudent}
                placeholder="+94 7X XXX XXXX"
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#627D98]">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canUpdateStudent}
                placeholder="student@example.com"
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#DDE8F8] space-y-3">
            <p className="text-xs font-extrabold text-[#0F172A]">Guardian Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                disabled={!canUpdateStudent}
                placeholder="Guardian name"
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
              />
              <Input
                value={guardianRelation}
                onChange={(e) => setGuardianRelation(e.target.value)}
                disabled={!canUpdateStudent}
                placeholder="Relation"
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
              />
              <Input
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                disabled={!canUpdateStudent}
                placeholder="Guardian phone"
                className="rounded-xl h-10 bg-[#F4F8FD] border-[#DDE8F8]"
              />
            </div>
          </div>

          {canUpdateStudent && (
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="rounded-full h-10 px-6 bg-[#184880] hover:bg-[#184880]/95 text-white text-xs font-bold gap-1.5"
              >
                <Save className="size-3.5" />
                <span>{updateProfileMutation.isPending ? "Saving..." : "Save Changes"}</span>
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Right: Enrollment, Account Controls, & Shortcuts */}
      <div className="lg:col-span-5 space-y-5">
        {canEnrollClass && (
          <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DDE8F8]">
              <div className="size-8 rounded-xl bg-[#EBF3FE] text-[#184880] flex items-center justify-center">
                <Plus className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#0F172A]">Enroll in Class</h3>
                <p className="text-[11px] text-[#627D98]">Assign this student to another batch.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={availableClasses.length === 0}
                className="flex-1 h-10 rounded-full bg-[#F4F8FD] border-[#DDE8F8] text-xs"
              >
                <option value="">
                  {availableClasses.length === 0 ? "Enrolled in all active classes" : "Choose a class..."}
                </option>
                {availableClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                disabled={!selectedClassId || enrollClassMutation.isPending}
                onClick={() => selectedClassId && enrollClassMutation.mutate(selectedClassId)}
                className="rounded-full h-10 px-5 bg-[#184880] hover:bg-[#184880]/95 text-white text-xs font-bold shrink-0"
              >
                {enrollClassMutation.isPending ? "Enrolling..." : "Enroll"}
              </Button>
            </div>
          </div>
        )}

        <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#DDE8F8]">
            <div className="size-8 rounded-xl bg-[#EBF3FE] text-[#184880] flex items-center justify-center">
              <Shield className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#0F172A]">Account & Security</h3>
              <p className="text-[11px] text-[#627D98]">Manage credentials, status, and report output.</p>
            </div>
          </div>

          <div className="space-y-3">
            {canResetPassword && (
              <div className="p-4 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#0F172A] flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-[#184880]" />
                    <span>Reset Password</span>
                  </p>
                  <p className="text-[11px] text-[#627D98] mt-0.5">
                    Generates a temporary login password.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResetConfirmOpen(true)}
                  className="rounded-full h-9 px-4 text-xs font-bold border-[#DDE8F8] bg-white shrink-0"
                >
                  Reset
                </Button>
              </div>
            )}

            {canUpdateStudent && (
              <div className="p-4 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-[#0F172A]">Account Access</p>
                  <p className="text-[11px] text-[#627D98] mt-0.5 capitalize">
                    Currently {student.status}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusConfirmOpen(true)}
                  className="rounded-full h-9 px-4 text-xs font-bold border-[#DDE8F8] bg-white shrink-0"
                >
                  {student.status === "active" ? "Disable" : "Activate"}
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onOpenAnalysis}
                className="rounded-full h-9 text-xs font-bold border-[#DDE8F8]"
              >
                View AI Brief
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="rounded-full h-9 text-xs font-bold border-[#DDE8F8] gap-1.5"
              >
                <Printer className="size-3.5" />
                <span>Print Report</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="Reset Student Password?"
        description={`Generate a new temporary password for ${student.name}? Active login sessions will be signed out.`}
        confirmLabel="Generate Password"
        isDestructive={false}
        onConfirm={() => resetPasswordMutation.mutate()}
      />

      <ConfirmDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={`${nextStatus === "disabled" ? "Disable" : "Activate"} Student Account?`}
        description={`Are you sure you want to mark ${student.name}'s account as ${nextStatus}?`}
        confirmLabel={nextStatus === "disabled" ? "Disable Account" : "Activate Account"}
        isDestructive={nextStatus === "disabled"}
        onConfirm={() => updateProfileMutation.mutate({ status: nextStatus })}
      />

      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#0F172A]">
              Temporary Password Generated
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-[#627D98]">
              Share this password with {student.name}. They will be asked to change it on sign in.
            </p>
            <div className="p-4 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8] flex items-center justify-between gap-2">
              <span className="font-mono text-base font-bold text-[#0F172A] select-all">
                {tempPassword}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyTempPassword}
                className="rounded-full size-8 p-0"
              >
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setTempPassword(null)}
              className="rounded-full bg-[#184880] text-white font-bold text-xs"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
