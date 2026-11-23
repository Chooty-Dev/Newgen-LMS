"use client";

import * as React from "react";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScoreInfoDialog } from "@/components/shared/ScoreInfoDialog";
import {
  ShieldCheck,
  KeyRound,
  Laptop,
  Smartphone,
  LogOut,
  Mail,
  Phone,
  CheckCircle2,
  Crown,
  Medal,
  Trophy,
  GraduationCap,
  Sparkles,
} from "lucide-react";

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export function StudentSettingsView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Password state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  // Fetch student home info for score, grade, and rank
  const { data: homeData } = useQuery({
    queryKey: ["student-home"],
    queryFn: async () => {
      const res = await fetch("/api/v1/student/home");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const studentHome = homeData?.data;

  // Change password mutation
  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const res = await fetch("/api/v1/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Active sessions query
  const { data: sessionsData } = useQuery<{
    data: ActiveSession[];
  }>({
    queryKey: ["active-sessions"],
    queryFn: async () => {
      const res = await fetch("/api/v1/account/sessions");
      if (!res.ok) throw new Error("Failed to load sessions");
      return res.json();
    },
  });

  const sessions = sessionsData?.data || [];

  const terminateOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/account/sessions/other", {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to log out other devices");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Logged out of all other devices");
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
    },
    onError: () => {
      toast.error("Could not log out other devices");
    },
  });

  const initials = user?.name
    ? user.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
    : "ST";

  const lmsRank = studentHome?.lmsRank;
  const displayScore = studentHome?.overallScore ?? null;
  const groupLabel = studentHome?.groupLabel || "Dedicated Learner";
  const grade = studentHome?.student?.grade || "Grade 10";

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Banner */}
      <section className="bg-secondary border border-border rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] relative overflow-hidden min-h-[220px]">
        <div className="space-y-2.5 max-w-lg text-center md:text-left z-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-primary tracking-tight leading-tight">
            My Profile & Details
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Manage your personal profile, keep your login secure, and view account details.
          </p>
        </div>

        <div className="relative w-full h-44 sm:h-52 md:h-full md:absolute md:right-4 md:top-0 md:bottom-0 md:w-56 lg:w-64 flex items-center justify-center md:justify-end shrink-0 z-10">
          <Image
            src="/images/kid-reading-4.webp"
            alt="My Profile"
            fill
            priority
            className="object-contain w-full h-full drop-shadow-sm"
            sizes="(max-width: 768px) 160px, 192px"
          />
        </div>
      </section>

      {/* 2. Profile Overview Card */}
      <section className="relative overflow-hidden bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
          {/* Avatar & Info */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="size-20 sm:size-24 rounded-full bg-secondary text-primary flex items-center justify-center font-black text-2xl sm:text-3xl border-2 border-border shrink-0 shadow-sm">
              {initials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-extrabold text-foreground">
                  {user?.name}
                </h3>
                {lmsRank && (
                  <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                    {lmsRank === 1 ? (
                      <Crown className="size-3.5 text-amber-600 fill-amber-500" />
                    ) : lmsRank <= 3 ? (
                      <Medal className="size-3.5 text-amber-600" />
                    ) : (
                      <Trophy className="size-3.5 text-muted-foreground" />
                    )}
                    <span>#{lmsRank} in LMS</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <GraduationCap className="size-4" />
                  {grade}
                </span>
                <span>•</span>
                <span>{user?.username}</span>
                <span>•</span>
                <span>{studentHome?.student?.centerName || "Main Center"}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted-foreground">
                {user?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="size-3.5 text-muted-foreground" />
                    {user.email}
                  </span>
                )}
                {user?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3.5 text-muted-foreground" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Academic Rating Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-secondary border border-border text-center min-w-[140px]">
            <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-primary">
              <span>Performance</span>
              <ScoreInfoDialog studentId={user?.id} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-primary tabular-nums mt-0.5">
              {displayScore !== null ? `${displayScore}%` : "—"}
            </div>
            <span className="text-xs font-semibold text-muted-foreground block mt-0.5">
              {groupLabel}
            </span>
          </div>
        </div>
      </section>

      {/* 3. Account Details Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="p-5 rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Full Name</span>
          <p className="text-sm sm:text-base font-bold text-foreground">{user?.name}</p>
        </div>
        <div className="p-5 rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Class / Grade</span>
          <p className="text-sm sm:text-base font-bold text-foreground">{grade}</p>
        </div>
        <div className="p-5 rounded-3xl bg-card border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-1">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Role Status</span>
          <p className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Active Student</span>
          </p>
        </div>
      </section>

      {/* 4. Password Security Form */}
      <section className="relative overflow-hidden bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <KeyRound className="size-4" />
          <span>Security & Password</span>
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground">Change Password</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update your secret password to keep your student account safe.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            passwordMutation.mutate();
          }}
          className="space-y-4 pt-1 max-w-lg"
        >
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">
              Current Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-11 px-5 rounded-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">
              New Password
            </label>
            <input
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-11 px-5 rounded-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">
              Confirm New Password
            </label>
            <input
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-11 px-5 rounded-full bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={passwordMutation.isPending}
              className="h-11 rounded-full px-7 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {passwordMutation.isPending ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </section>

      {/* 5. Active Devices / Sessions */}
      <section className="relative overflow-hidden bg-card rounded-3xl p-6 sm:p-7 border border-border shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="size-4" />
            <span>Active Devices</span>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => terminateOtherSessionsMutation.mutate()}
              disabled={terminateOtherSessionsMutation.isPending}
              className="rounded-full h-9 px-4 text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="size-3.5" />
              <span>Log Out Other Devices</span>
            </button>
          )}
        </div>

        <div>
          <h4 className="text-lg font-bold text-foreground">Signed In Devices</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Devices that currently have active login sessions for your account.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {sessions.map((sess) => {
            const isMobile = sess.userAgent.toLowerCase().includes("mobile");
            return (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-background border border-border shadow-xs flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-full bg-secondary text-primary flex items-center justify-center shrink-0">
                    {isMobile ? (
                      <Smartphone className="size-5" />
                    ) : (
                      <Laptop className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate">
                        {isMobile ? "Mobile Device" : "Computer / Browser"}
                      </span>
                      {sess.isCurrent && (
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-secondary text-primary">
                          This device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate pt-0.5">
                      Last active: {new Date(sess.lastActiveAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
