"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GraduationCap, Lock } from "lucide-react";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 10) {
      setErrorMessage("New password must be at least 10 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error?.message || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully");
      router.push("/dashboard");
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 bg-background text-foreground">
      <header className="flex items-center justify-between max-w-5xl w-full mx-auto py-2">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <GraduationCap className="size-6 stroke-[2]" />
          </div>
          <div>
            <span className="font-semibold text-xl tracking-tight block">Newgen LMS</span>
            <span className="text-xs text-muted-foreground font-medium block">
              Education Center
            </span>
          </div>
        </div>
        <ThemeSwitch />
      </header>

      <main className="flex items-center justify-center my-auto py-8">
        <Card className="w-full max-w-md rounded-3xl p-8 border-border bg-card shadow-lg">
          <div className="space-y-2 text-center pb-6">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Set a new password
            </h1>
            <p className="text-base text-muted-foreground">
              Please choose a new secure password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="rounded-2xl bg-destructive/15 border border-destructive/30 p-4 text-base font-medium text-foreground text-center">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground block pl-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  required
                  placeholder="Your temporary or current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-12 rounded-full h-12 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground block pl-2">
                New Password (minimum 10 characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-12 rounded-full h-12 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground block pl-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 rounded-full h-12 text-base"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full h-12 text-base font-medium mt-6"
            >
              {loading ? "Updating..." : "Save Password"}
            </Button>
          </form>
        </Card>
      </main>

      <footer className="text-center text-sm text-muted-foreground py-4">
        © Newgen Education Center. All rights reserved.
      </footer>
    </div>
  );
}
