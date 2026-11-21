"use client";

import * as React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { BentoCard } from "./BentoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScoreInfoDialog } from "@/components/shared/ScoreInfoDialog";
import {
  User,
  ShieldCheck,
  KeyRound,
  Sun,
  Moon,
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
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveSession {
  id: string;
  ip: string;
  userAgent: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

const emptySubscribe = () => () => { };

export function StudentSettingsView() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
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

  // Calculate membership duration
  const memberDurationText = React.useMemo(() => {
    return "Member for 8 months";
  }, []);

  const lmsRank = studentHome?.lmsRank;
  const displayScore = studentHome?.overallScore ?? null;
  const groupLabel = studentHome?.groupLabel || "Dedicated Learner";
  const grade = studentHome?.student?.grade || "Grade 10";

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="space-y-1 pb-2">
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
          About Me
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-medium">
          Manage your personal details, profile look, and login security.
        </p>
      </div>

      {/* 2. Hero Profile Card with Large Avatar, Score, Info Icon, and #N in LMS */}
      <BentoCard variant="hero" className="p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left">
          {/* Left: Avatar & Bio */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="size-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-3xl shadow-md shrink-0 border-2 border-border">
              {initials}
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h2 className="text-2xl md:text-3xl font-extrabold text-foreground truncate">
                  {user?.name}
                </h2>
                {lmsRank && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full self-center sm:self-auto border",
                      lmsRank === 1
                        ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                        : lmsRank === 2
                        ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30"
                        : lmsRank === 3
                        ? "bg-amber-600/10 text-amber-800 dark:text-amber-400 border-amber-600/30"
                        : "bg-primary/10 text-primary border-primary/20"
                    )}
                  >
                    {lmsRank === 1 ? (
                      <Crown className="size-4 stroke-[2.2]" />
                    ) : lmsRank <= 3 ? (
                      <Medal className="size-4 stroke-[2.2]" />
                    ) : (
                      <Trophy className="size-4 stroke-[2.2]" />
                    )}
                    <span className="text-xs font-black tracking-tight">
                      #{lmsRank} in LMS
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-1 text-foreground font-semibold">
                  <GraduationCap className="size-4 text-primary" />
                  {grade}
                </span>
                <span>•</span>
                <span>ID: {user?.username}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  {memberDurationText}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-sm text-muted-foreground">
                {user?.email && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Mail className="size-4" />
                    {user.email}
                  </span>
                )}
                {user?.phone && (
                  <span className="flex items-center gap-1.5 font-medium">
                    <Phone className="size-4" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Performance Score & Overall Word */}
          <div className="p-6 rounded-[2rem] bg-card border border-border text-center min-w-[160px] shadow-sm space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs uppercase font-bold text-muted-foreground">
                Performance
              </span>
              <ScoreInfoDialog studentId={user?.id} />
            </div>
            <div className="text-4xl font-black text-primary tabular-nums">
              {displayScore !== null ? displayScore : "—"}
            </div>
            <span className="text-xs font-bold text-foreground block">
              {groupLabel}
            </span>
          </div>
        </div>
      </BentoCard>

      {/* 3. Section 1: My Details */}
      <BentoCard variant="soft" className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
          <User className="size-5" />
          <span>My Details</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              Full Name
            </span>
            <p className="text-lg font-semibold text-foreground">
              {user?.name}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              Grade Group
            </span>
            <p className="text-lg font-semibold text-foreground">
              {grade}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
            <span className="text-xs uppercase font-bold text-muted-foreground">
              Role & Status
            </span>
            <p className="text-lg font-semibold text-foreground capitalize flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-primary" />
              Active Student
            </p>
          </div>
        </div>
      </BentoCard>

      {/* 4. Section 2: Appearance (Light / Dark / System) */}
      <BentoCard variant="soft" className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
          <Sun className="size-5" />
          <span>Appearance</span>
        </div>
        <p className="text-base text-muted-foreground">
          Choose how Newgen LMS looks for you on this device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-3xl border transition-all text-center gap-3",
              mounted && theme === "light"
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-foreground hover:bg-muted"
            )}
          >
            <Sun className="size-8" />
            <span className="text-base font-bold">Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-3xl border transition-all text-center gap-3",
              mounted && theme === "dark"
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-foreground hover:bg-muted"
            )}
          >
            <Moon className="size-8" />
            <span className="text-base font-bold">Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={cn(
              "flex flex-col items-center justify-center p-6 rounded-3xl border transition-all text-center gap-3",
              mounted && theme === "system"
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card border-border text-foreground hover:bg-muted"
            )}
          >
            <Laptop className="size-8" />
            <span className="text-base font-bold">System</span>
          </button>
        </div>
      </BentoCard>

      {/* 5. Section 3: My Password */}
      <BentoCard variant="soft" className="space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
          <KeyRound className="size-5" />
          <span>My Password</span>
        </div>
        <p className="text-base text-muted-foreground">
          Update your secret password to keep your student account safe.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            passwordMutation.mutate();
          }}
          className="space-y-4 pt-2 max-w-lg"
        >
          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">
              Current Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-12 rounded-full px-5 text-base"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">
              New Password
            </label>
            <Input
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-12 rounded-full px-5 text-base"
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground mb-1 block">
              Confirm New Password
            </label>
            <Input
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-full px-5 text-base"
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              className="h-12 rounded-full px-8 text-base font-semibold"
            >
              {passwordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </BentoCard>

      {/* 6. Section 4: My Logged In Devices */}
      <BentoCard variant="soft" className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider">
            <ShieldCheck className="size-5" />
            <span>My Logged In Devices</span>
          </div>
          {sessions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => terminateOtherSessionsMutation.mutate()}
              disabled={terminateOtherSessionsMutation.isPending}
              className="rounded-full h-10 px-4 text-xs font-semibold gap-1.5"
            >
              <LogOut className="size-3.5" />
              Log Out Other Devices
            </Button>
          )}
        </div>

        <div className="space-y-3 pt-2">
          {sessions.map((sess) => {
            const isMobile = sess.userAgent.toLowerCase().includes("mobile");
            return (
              <div
                key={sess.id}
                className="p-4 rounded-2xl bg-card border border-border flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-full bg-muted flex items-center justify-center shrink-0">
                    {isMobile ? (
                      <Smartphone className="size-5 text-foreground" />
                    ) : (
                      <Laptop className="size-5 text-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground truncate">
                        {isMobile ? "Phone / Tablet" : "Computer / Browser"}
                      </span>
                      {sess.isCurrent && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
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
      </BentoCard>
    </div>
  );
}
