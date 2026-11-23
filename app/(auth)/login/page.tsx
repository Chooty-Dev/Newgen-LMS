"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GraduationCap, Lock, User } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error?.message || "Wrong username or password");
        return;
      }

      toast.success("Signed in successfully");

      if (json.data?.user?.mustChangePassword) {
        router.push("/change-password");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background text-foreground">
      {/* Left Column: Header, Form, Footer */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 min-h-screen">
        {/* Top Header with Brand & Theme Switch */}
        <header className="flex items-center justify-between w-full py-2">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
              <GraduationCap className="size-6 stroke-[2]" />
            </div>
            <div>
              <span className="font-semibold text-xl tracking-tight block">Danuma LMS</span>
              <span className="text-xs text-muted-foreground font-medium block">
                Education Center
              </span>
            </div>
          </div>
          <ThemeSwitch />
        </header>

        {/* Center: Main Login Card */}
        <main className="flex items-center justify-center my-auto py-8">
          <Card className="w-full max-w-md rounded-3xl p-8 border-border bg-card shadow-lg">
            <div className="space-y-2 text-center pb-6">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Welcome back
              </h1>
              <p className="text-base text-muted-foreground">
                Sign in with your username or email to continue.
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
                  Username or Email
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    required
                    placeholder="e.g. kasun or admin@newgen.lk"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-12 rounded-full h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-base font-medium text-foreground block pl-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 rounded-full h-12 text-base"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full rounded-full h-12 text-base font-medium mt-6"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Card>
        </main>

        {/* Bottom Footer with Version & TRIMIDS Developer Credit */}
        <footer className="w-full pt-6 border-t border-border/40 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>© Newgen Education Center. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">v1.0.0</span>
            <span>•</span>
            <span className="font-semibold text-foreground tracking-wide">
              A product by TRIMIDS
            </span>
          </div>
        </footer>
      </div>

      {/* Right Column: Full Edge-to-Edge Illustration (No margins, no paddings, no text) */}
      <div className="hidden lg:block lg:w-1/2 relative min-h-screen overflow-hidden">
        <Image
          src="/images/login-illustration.jpg"
          alt="Newgen Education Center"
          fill
          priority
          sizes="50vw"
          className="object-cover w-full h-full"
        />
      </div>
    </div>
  );
}
