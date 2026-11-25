"use client";

import * as React from "react";
import Image from "next/image";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, GraduationCap, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LoginFormFieldsProps {
  identifier: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  errorMessage: string;
  idleNotice: boolean;
  onChangeIdentifier: (val: string) => void;
  onChangePassword: (val: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  variant?: "mobile" | "desktop";
}

function LoginFormFields({
  identifier,
  password,
  showPassword,
  loading,
  errorMessage,
  idleNotice,
  onChangeIdentifier,
  onChangePassword,
  onTogglePassword,
  onSubmit,
  variant = "mobile",
}: LoginFormFieldsProps) {
  const isDesktop = variant === "desktop";

  return (
    <form onSubmit={onSubmit} className={cn(isDesktop ? "space-y-3 xl:space-y-4" : "space-y-5")}>
      {idleNotice && !errorMessage && (
        <div
          className={cn(
            "rounded-2xl bg-amber-500/10 border border-amber-500/30 font-medium text-amber-700 text-center",
            isDesktop ? "p-2.5 text-xs" : "p-4 text-base"
          )}
        >
          Your session expired due to inactivity. Please sign in again.
        </div>
      )}

      {errorMessage && (
        <div
          className={cn(
            "rounded-2xl bg-rose-50 border border-rose-200 font-medium text-rose-700 text-center",
            isDesktop ? "p-2.5 text-xs" : "p-4 text-base text-foreground bg-destructive/15 border-destructive/30"
          )}
        >
          {errorMessage}
        </div>
      )}

      <div className={cn(isDesktop ? "space-y-1.5" : "space-y-2")}>
        <label
          className={cn(
            "font-semibold text-[#0F172A] block pl-1.5",
            isDesktop ? "text-xs xl:text-sm" : "text-base font-medium pl-2"
          )}
        >
          Username or Email
        </label>
        <div className="relative">
          <User
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-[#627D98] pointer-events-none",
              isDesktop ? "left-3.5 size-4" : "left-4 size-5 text-muted-foreground"
            )}
          />
          <Input
            type="text"
            required
            autoComplete="username"
            placeholder="e.g. kasun or admin@newgen.lk"
            value={identifier}
            onChange={(e) => onChangeIdentifier(e.target.value)}
            className={cn(
              "rounded-full border-[#DDE8F8] bg-[#F4F8FD] focus-visible:bg-white transition-colors",
              isDesktop
                ? "pl-10 pr-4 h-10 xl:h-11 text-xs xl:text-sm"
                : "pl-12 h-12 text-base bg-background"
            )}
          />
        </div>
      </div>

      <div className={cn(isDesktop ? "space-y-1.5" : "space-y-2")}>
        <label
          className={cn(
            "font-semibold text-[#0F172A] block pl-1.5",
            isDesktop ? "text-xs xl:text-sm" : "text-base font-medium pl-2"
          )}
        >
          Password
        </label>
        <div className="relative">
          <Lock
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-[#627D98] pointer-events-none",
              isDesktop ? "left-3.5 size-4" : "left-4 size-5 text-muted-foreground"
            )}
          />
          <Input
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            className={cn(
              "rounded-full border-[#DDE8F8] bg-[#F4F8FD] focus-visible:bg-white transition-colors",
              isDesktop
                ? "pl-10 pr-10 h-10 xl:h-11 text-xs xl:text-sm"
                : "pl-12 pr-12 h-12 text-base bg-background"
            )}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-[#627D98] hover:text-[#184880] transition-colors cursor-pointer",
              isDesktop ? "right-3.5" : "right-4"
            )}
          >
            {showPassword ? (
              <EyeOff className={cn(isDesktop ? "size-4" : "size-5")} />
            ) : (
              <Eye className={cn(isDesktop ? "size-4" : "size-5")} />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full rounded-full font-semibold bg-[#184880] hover:bg-[#123763] text-white transition-colors cursor-pointer",
          isDesktop ? "h-10 xl:h-11 text-sm mt-2 xl:mt-3" : "h-12 text-base font-medium mt-6"
        )}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [idleNotice, setIdleNotice] = React.useState(false);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reason") === "idle") {
        setIdleNotice(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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

      try {
        localStorage.setItem("newgen_last_active", String(Date.now()));
        localStorage.removeItem("newgen_logout_event");
      } catch {
        // Ignore
      }

      const targetUrl = json.data?.user?.mustChangePassword
        ? "/change-password"
        : "/dashboard";

      window.location.href = targetUrl;
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile / Tablet View (< lg): Preserved Clean Card Layout */}
      <div className="lg:hidden min-h-screen flex flex-col justify-between p-6 sm:p-10 bg-background text-foreground">
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

            <LoginFormFields
              identifier={identifier}
              password={password}
              showPassword={showPassword}
              loading={loading}
              errorMessage={errorMessage}
              idleNotice={idleNotice}
              onChangeIdentifier={setIdentifier}
              onChangePassword={setPassword}
              onTogglePassword={() => setShowPassword((prev) => !prev)}
              onSubmit={handleSubmit}
              variant="mobile"
            />
          </Card>
        </main>

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

      {/* Desktop View (>= lg): Full Illustrated Scene + Precision-Aligned Notebook Login Form */}
      <div className="hidden lg:flex lg:flex-col min-h-screen w-full bg-[#F4F8FD] text-[#0F172A] justify-between overflow-hidden">
        <main className="flex-1 flex items-center justify-center w-full px-4 pt-2 min-h-0">
          {/* Exact 16:9 stage locked to login-bg.webp (3120x1755) so form always lands cleanly on the left spiral paper */}
          <div
            className="relative w-full aspect-[16/9]"
            style={{ maxWidth: "min(100vw, calc((100vh - 3.75rem) * 16 / 9))" }}
          >
            <Image
              src="/images/login-bg-new.webp"
              alt="Danuma LMS Login Workspace"
              fill
              priority
              sizes="100vw"
              className="object-contain pointer-events-none select-none"
            />

            {/* Login Form Overlay positioned cleanly over the white spiral notebook sheet (x: 8.2%-33.2%, y: 14.5%-77.2%) */}
            <div className="absolute left-[8.2%] top-[14.2%] w-[25%] h-[63.2%] flex flex-col justify-center px-3 xl:px-6 2xl:px-8 py-3 overflow-y-auto">
              <div className="w-full space-y-4 xl:space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0">
                    <span className="font-bold text-xl xl:text-2xl tracking-tight text-[#0F172A] block leading-tight">
                      Danuma LMS
                    </span>
                    <span className="text-[15px] xl:text-md font-medium text-[#627D98] block leading-tight">
                      Sign in to continue
                    </span>
                  </div>
                </div>

                <LoginFormFields
                  identifier={identifier}
                  password={password}
                  showPassword={showPassword}
                  loading={loading}
                  errorMessage={errorMessage}
                  idleNotice={idleNotice}
                  onChangeIdentifier={setIdentifier}
                  onChangePassword={setPassword}
                  onTogglePassword={() => setShowPassword((prev) => !prev)}
                  onSubmit={handleSubmit}
                  variant="desktop"
                />
              </div>
            </div>
          </div>
        </main>

        {/* Bottom Copyright, Version & TRIMIDS Footer */}
        <footer className="w-full px-8 py-3 bg-white border-t border-[#DDE8F8] text-xs sm:text-sm text-[#627D98] flex items-center justify-between gap-4 shrink-0">
          <span>© Newgen Education Center. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F172A]">v1.0.0</span>
            <span>•</span>
            <span className="font-bold text-[#184880] tracking-wide">
              A product by TRIMIDS
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
