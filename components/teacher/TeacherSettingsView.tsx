"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiFieldError, applyApiFieldErrors } from "@/lib/api-error";
import { z } from "zod";
import { FormLabel, FormError, inputErrorClass } from "@/components/ui/form-field";
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
import { DataLoader } from "@/components/ui/data-loader";

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  phone: z.string().optional().or(z.literal("")),
  githubUrl: z.string().url("Please enter a valid URL (e.g. https://github.com/...)").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Please enter a valid URL (e.g. https://linkedin.com/in/...)").optional().or(z.literal("")),
});
type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(10, "Password must be at least 10 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });
type PasswordFormData = z.infer<typeof passwordSchema>;

export function TeacherSettingsView() {
  const queryClient = useQueryClient();
  const { user, refetchUser } = useAuth();

  // Profile Form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema) as unknown as Resolver<ProfileFormData>,
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      githubUrl: user?.socialLinks?.find((s) => s.platform.toLowerCase() === "github")?.url || "",
      linkedinUrl: user?.socialLinks?.find((s) => s.platform.toLowerCase() === "linkedin")?.url || "",
    },
  });

  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        phone: user.phone || "",
        githubUrl: user.socialLinks?.find((s) => s.platform.toLowerCase() === "github")?.url || "",
        linkedinUrl: user.socialLinks?.find((s) => s.platform.toLowerCase() === "linkedin")?.url || "",
      });
    }
  }, [user, profileForm]);

  // Password Form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema) as unknown as Resolver<PasswordFormData>,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

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
    mutationFn: async (data: ProfileFormData) => {
      const socialLinks: Array<{ platform: string; url: string }> = [];
      if (data.githubUrl) socialLinks.push({ platform: "GitHub", url: data.githubUrl });
      if (data.linkedinUrl) socialLinks.push({ platform: "LinkedIn", url: data.linkedinUrl });

      const res = await fetch("/api/v1/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone || undefined,
          socialLinks,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new ApiFieldError(json.error?.message || "Failed to update profile", json.error?.fields);
      }
      return json.data;
    },
    onSuccess: async () => {
      await refetchUser();
      toast.success("Teacher profile updated successfully!");
    },
    onError: (err: ApiFieldError) => {
      applyApiFieldErrors(err, profileForm.setError);
      toast.error(err.message || "Failed to update profile");
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new ApiFieldError(json.error?.message || "Failed to change password", json.error?.fields);
      }
      return json.data;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password changed successfully!");
    },
    onError: (err: ApiFieldError) => {
      applyApiFieldErrors(err, passwordForm.setError);
      toast.error(err.message || "Failed to change password");
    },
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
      {/* 1. Solid Blue Header Banner with Teacher Profile Avatar */}
      <section className="rounded-3xl p-6 sm:p-8 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[190px] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5 z-10 text-center sm:text-left">
          <div className="size-20 sm:size-24 rounded-full bg-white text-primary font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg ring-4 ring-white/20 shrink-0">
            {initials}
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {user?.name || "Teacher Profile"}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium">
              {user?.email} • {user?.username}
            </p>
            <p className="text-[11px] text-white/70 max-w-md pt-1">
              Manage your personal credentials, contact info, and active login sessions to keep your teaching workspace secure.
            </p>
          </div>
        </div>

        <div className="z-10 shrink-0">
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

        <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FormLabel label="Full Name" required />
              <Input
                placeholder="e.g. Samantha Perera"
                {...profileForm.register("name")}
                className={inputErrorClass(profileForm.formState.errors.name)}
              />
              <FormError message={profileForm.formState.errors.name?.message} />
            </div>
            <div>
              <FormLabel label="Phone Number" optional />
              <Input
                placeholder="e.g. 077 123 4567"
                {...profileForm.register("phone")}
                className={inputErrorClass(profileForm.formState.errors.phone)}
              />
              <FormError message={profileForm.formState.errors.phone?.message} />
            </div>
            <div>
              <FormLabel label="GitHub Profile" optional />
              <Input
                placeholder="e.g. https://github.com/samanthap"
                {...profileForm.register("githubUrl")}
                className={inputErrorClass(profileForm.formState.errors.githubUrl)}
              />
              <FormError message={profileForm.formState.errors.githubUrl?.message} />
            </div>
            <div>
              <FormLabel label="LinkedIn Profile" optional />
              <Input
                placeholder="e.g. https://linkedin.com/in/samanthap"
                {...profileForm.register("linkedinUrl")}
                className={inputErrorClass(profileForm.formState.errors.linkedinUrl)}
              />
              <FormError message={profileForm.formState.errors.linkedinUrl?.message} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="rounded-full h-11 px-6 font-bold"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Details"}
            </Button>
          </div>
        </form>
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

        <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FormLabel label="Current Password" required />
              <Input
                type="password"
                placeholder="Enter current password..."
                {...passwordForm.register("currentPassword")}
                className={inputErrorClass(passwordForm.formState.errors.currentPassword)}
              />
              <FormError message={passwordForm.formState.errors.currentPassword?.message} />
            </div>
            <div>
              <FormLabel label="New Password" required />
              <Input
                type="password"
                placeholder="Min 10 characters..."
                {...passwordForm.register("newPassword")}
                className={inputErrorClass(passwordForm.formState.errors.newPassword)}
              />
              <FormError message={passwordForm.formState.errors.newPassword?.message} />
            </div>
            <div>
              <FormLabel label="Confirm Password" required />
              <Input
                type="password"
                placeholder="Repeat new password..."
                {...passwordForm.register("confirmPassword")}
                className={inputErrorClass(passwordForm.formState.errors.confirmPassword)}
              />
              <FormError message={passwordForm.formState.errors.confirmPassword?.message} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="rounded-full h-11 px-6 font-bold"
            >
              {changePasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
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
          <DataLoader text="Loading active sessions..." minHeight="min-h-[100px]" />
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
