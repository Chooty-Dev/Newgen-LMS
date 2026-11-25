"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth, SessionUser } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Smartphone, Laptop, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

function ProfileDetailsSection({
  user,
  onUpdated,
}: {
  user: SessionUser | null;
  onUpdated: () => Promise<void>;
}) {
  const [name, setName] = React.useState(user?.name || "");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [githubUrl, setGithubUrl] = React.useState(
    user?.socialLinks?.find((s) => s.platform.toLowerCase() === "github")?.url || ""
  );
  const [linkedinUrl, setLinkedinUrl] = React.useState(
    user?.socialLinks?.find((s) => s.platform.toLowerCase() === "linkedin")?.url || ""
  );

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const socialLinks: Array<{ platform: string; url: string }> = [];
      if (githubUrl) socialLinks.push({ platform: "GitHub", url: githubUrl });
      if (linkedinUrl) socialLinks.push({ platform: "LinkedIn", url: linkedinUrl });

      const res = await fetch("/api/v1/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          socialLinks,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update profile");
      return json.data;
    },
    onSuccess: async () => {
      await onUpdated();
      toast.success("Profile updated successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Card className="rounded-3xl border-border bg-card p-6 md:p-8">
      <CardHeader>
        <CardTitle>Account Details</CardTitle>
        <CardDescription>Update your personal information and social links.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground block pl-2 mb-1">Your Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block pl-2 mb-1">Phone Number</label>
            <Input
              placeholder="+94 77 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block pl-2 mb-1">GitHub URL (Optional)</label>
            <Input
              placeholder="https://github.com/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block pl-2 mb-1">LinkedIn URL (Optional)</label>
            <Input
              placeholder="https://linkedin.com/in/..."
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
        </div>
        <div className="pt-2 flex justify-end">
          <Button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending || !name}
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { StudentSettingsView } from "@/components/student/StudentSettingsView";
import { TeacherSettingsView } from "@/components/teacher/TeacherSettingsView";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";

export default function SettingsPage() {
  const { user } = useAuth();
  if (user?.role === "student") {
    return <StudentSettingsView />;
  }
  if (user?.role === "teacher") {
    return <TeacherSettingsView />;
  }
  if (user?.role === "admin" || user?.role === "super_admin") {
    return <AdminSettingsView />;
  }
  return <StaffSettingsPage />;
}

function StaffSettingsPage() {
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Fetch active sessions
  const { data: sessionData, isLoading: sessionsLoading } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/v1/account/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const activeSessions: ActiveSession[] = sessionData?.data || [];

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 10) throw new Error("New password must be at least 10 characters long");
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match");

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
      toast.success("Password changed successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Sign out other sessions
  const revokeOthersMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/account/sessions", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to revoke sessions");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      toast.success("Signed out of all other devices");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      <PageHeader
        title="Settings"
        description="Update your account details and preferences."
      />

      {/* Account Profile Section */}
      <ProfileDetailsSection
        key={user?.id || "unloaded"}
        user={user}
        onUpdated={refetchUser}
      />

      {/* Security & Password Card */}
      <Card className="rounded-3xl border-border bg-card p-6 md:p-8">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Keep your account secure with a strong password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Current Password</label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">New Password</label>
              <Input
                type="password"
                placeholder="At least 10 chars"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block pl-2 mb-1">Confirm New Password</label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={
                changePasswordMutation.isPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions Card */}
      <Card className="rounded-3xl border-border bg-card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>Devices where you are currently signed in.</CardDescription>
          </div>
          <Button
            variant="outline"
            className="rounded-full h-12"
            onClick={() => revokeOthersMutation.mutate()}
            disabled={revokeOthersMutation.isPending || activeSessions.length <= 1}
          >
            <LogOut className="size-4 mr-2" />
            Sign out other devices
          </Button>
        </div>
        <CardContent className="pt-6 space-y-4">
          {sessionsLoading ? (
            <p className="text-muted-foreground">Loading active sessions...</p>
          ) : activeSessions.length === 0 ? (
            <p className="text-muted-foreground">No active sessions found.</p>
          ) : (
            activeSessions.map((s) => {
              const isMobile = s.userAgent.toLowerCase().includes("mobile");
              const Icon = isMobile ? Smartphone : Laptop;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border"
                >
                  <div className="flex items-center gap-4">
                    <Icon className="size-6 text-foreground stroke-[1.8]" />
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{isMobile ? "Mobile Device" : "Computer / Browser"}</span>
                        {s.isCurrent && (
                          <span className="rounded-full bg-primary text-primary-foreground text-xs px-2.5 py-0.5 font-medium">
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        IP: {s.ip} • Last active: {new Date(s.lastActiveAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
