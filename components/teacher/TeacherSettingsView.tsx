"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  Settings,
  ShieldCheck,
  User,
  KeyRound,
  Laptop,
  Smartphone,
  LogOut,
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export function TeacherSettingsView() {
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  // Personal details
  const [name, setName] = React.useState(user?.name || "");
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [githubUrl, setGithubUrl] = React.useState(
    user?.socialLinks?.find((s) => s.platform.toLowerCase() === "github")?.url || ""
  );
  const [linkedinUrl, setLinkedinUrl] = React.useState(
    user?.socialLinks?.find((s) => s.platform.toLowerCase() === "linkedin")?.url || ""
  );

  // Password fields
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

  // Update profile mutation
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
      await refetchUser();
      toast.success("Teacher profile updated successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 10) throw new Error("Password must be at least 10 characters");
      if (newPassword !== confirmPassword) throw new Error("New passwords do not match");

      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to change password");
      return json.data;
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke session mutation
  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch("/api/v1/security/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to revoke session");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      toast.success("Session revoked successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "TE";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* 1. Hero Welcome Banner with Teacher Profile Avatar */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-primary to-[#23589b] text-primary-foreground relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[190px] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 z-10 text-center sm:text-left">
          <div className="size-20 sm:size-24 rounded-full bg-white text-primary font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg ring-4 ring-white/30 shrink-0">
            {initials}
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs text-white">
              <GraduationCap className="size-3" />
              <span>Faculty Member</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user?.name}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              {user?.email} • {user?.username}
            </p>
          </div>
        </div>

        <div className="z-10">
          <span className="px-4 py-2 rounded-full bg-white/15 text-xs font-bold backdrop-blur-xs text-white border border-white/20">
            Term 2026/27 Active
          </span>
        </div>
      </section>

      {/* 2. Personal Information Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <User className="size-5 text-primary" />
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Account Details
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Update your personal display name and contact numbers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              Full Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              Phone Number
            </label>
            <Input
              placeholder="+94 77 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              GitHub Profile (Optional)
            </label>
            <Input
              placeholder="https://github.com/..."
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              LinkedIn Profile (Optional)
            </label>
            <Input
              placeholder="https://linkedin.com/in/..."
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending || !name}
            className="rounded-full h-11 px-6 font-bold"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </div>

      {/* 3. Password & Security Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <KeyRound className="size-5 text-primary" />
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Change Account Password
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ensure your password is at least 10 characters long.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              Current Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              New Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-foreground block pl-2 mb-1">
              Confirm Password
            </label>
            <Input
              type="password"
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => changePasswordMutation.mutate()}
            disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
            className="rounded-full h-11 px-6 font-bold"
          >
            {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>

      {/* 4. Active Logged-in Devices */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border/60">
          <ShieldCheck className="size-5 text-primary" />
          <div>
            <h3 className="font-extrabold text-base text-foreground">
              Active Signed-in Sessions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review devices currently authenticated with your teacher account.
            </p>
          </div>
        </div>

        {sessionsLoading ? (
          <Skeleton className="h-20 rounded-2xl" />
        ) : activeSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No active sessions found.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between py-3.5 hover:bg-secondary/30 px-3 rounded-2xl transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-xl bg-secondary text-primary flex items-center justify-center shrink-0 border border-border">
                    {s.userAgent.toLowerCase().includes("mobile") ? (
                      <Smartphone className="size-5" />
                    ) : (
                      <Laptop className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground flex items-center gap-2 truncate">
                      <span>{s.userAgent}</span>
                      {s.isCurrent && (
                        <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                          Current Device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IP: {s.ip} • Active: {new Date(s.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {!s.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSessionMutation.mutate(s.id)}
                    className="rounded-full text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
