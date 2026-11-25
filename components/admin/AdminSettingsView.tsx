"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, SessionUser } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Smartphone, Laptop, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSectionHeader, AdminStatusPill, AdminSurface } from "./AdminUI";

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

function AdminProfileForm({
  user,
  onUpdated,
}: {
  user: SessionUser | null;
  onUpdated: () => Promise<void>;
}) {
  const [name, setName] = React.useState(user?.name || "");
  const [phone, setPhone] = React.useState(user?.phone || "");

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update profile");
      return json.data;
    },
    onSuccess: async () => {
      await onUpdated();
      toast.success("Profile updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminSurface className="p-6 space-y-4">
      <AdminSectionHeader title="Account Profile" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-semibold block mb-1">Full Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <div>
          <label className="font-semibold block mb-1">Phone</label>
          <Input placeholder="+94 77..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-xl" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending || !name} className="rounded-full h-10 px-5 text-xs font-bold">
          {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </AdminSurface>
  );
}

export function AdminSettingsView() {
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const { data: sessionData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/v1/account/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const activeSessions: ActiveSession[] = sessionData?.data || [];

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 10) throw new Error("Password must be at least 10 characters");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update password");
      return json.data;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/account/sessions", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to revoke sessions");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      toast.success("Signed out other devices");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-200">
      <AdminProfileForm key={user?.id || "unloaded"} user={user} onUpdated={refetchUser} />

      <AdminSurface className="p-6 space-y-4">
        <AdminSectionHeader title="Change Password" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="font-semibold block mb-1">Current</label>
            <Input type="password" placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div>
            <label className="font-semibold block mb-1">New (10+ chars)</label>
            <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Confirm</label>
            <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => changePasswordMutation.mutate()}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-full h-10 px-5 text-xs font-bold"
          >
            {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </AdminSurface>

      <AdminSurface className="p-6 space-y-4">
        <AdminSectionHeader
          title="Active Sessions"
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-9 text-xs gap-1.5"
              onClick={() => revokeOthersMutation.mutate()}
              disabled={revokeOthersMutation.isPending || activeSessions.length <= 1}
            >
              <LogOut className="size-3.5" />
              <span>Sign Out Others</span>
            </Button>
          }
        />
        <div className="space-y-2.5 text-xs">
          {sessionsLoading ? (
            <p className="text-muted-foreground">Loading sessions...</p>
          ) : activeSessions.length === 0 ? (
            <p className="text-muted-foreground">No active sessions.</p>
          ) : (
            activeSessions.map((s) => {
              const isMobile = s.userAgent.toLowerCase().includes("mobile");
              const Icon = isMobile ? Smartphone : Laptop;
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[var(--admin-surface)] border border-[var(--admin-border)]">
                  <div className="flex items-center gap-3">
                    <Icon className="size-5 text-[var(--primary)]" />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        <span>{isMobile ? "Mobile" : "Desktop"}</span>
                        {s.isCurrent && <AdminStatusPill label="Current" />}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {s.ip} • {new Date(s.lastActiveAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </AdminSurface>
    </div>
  );
}
