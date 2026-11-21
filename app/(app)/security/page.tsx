"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Lock, Users, AlertOctagon, Save } from "lucide-react";

interface SecurityConfig {
  idleTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
}

interface ActiveSessionItem {
  id: string;
  user?: {
    name: string;
    username: string;
    role: string;
    email: string;
  };
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

interface FailedLoginItem {
  id: string;
  identifier: string;
  ip: string;
  time: string;
  result: string;
}

interface SecurityResponse {
  data: {
    config: SecurityConfig;
    activeSessions: ActiveSessionItem[];
    failedLogins: FailedLoginItem[];
  };
}

export default function SecurityPage() {
  const queryClient = useQueryClient();
  const [sessionToRevoke, setSessionToRevoke] = React.useState<string | null>(null);

  const { data: secData, isLoading } = useQuery<SecurityResponse>({
    queryKey: ["security-overview"],
    queryFn: async () => {
      const res = await fetch("/api/v1/security");
      if (!res.ok) throw new Error("Failed to load security overview");
      return res.json();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await fetch("/api/v1/security/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Failed to revoke session");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Session revoked immediately.");
      queryClient.invalidateQueries({ queryKey: ["security-overview"] });
      setSessionToRevoke(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not revoke session.");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Security Controls"
          description="Configure session timeouts, review active logins, and revoke unauthorized access."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  const data = secData?.data;
  if (!data) return null;

  const sessionColumns: ColumnDef<ActiveSessionItem>[] = [
    {
      accessorKey: "user.name",
      header: "User",
      cell: ({ row }) => (
        <div>
          <span className="font-semibold text-foreground text-base block">
            {row.original.user?.name || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {row.original.user?.role || "user"} • {row.original.user?.username}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "ip",
      header: "IP Address",
      cell: ({ row }) => <span className="tabular-nums font-mono text-sm">{row.original.ip}</span>,
    },
    {
      accessorKey: "userAgent",
      header: "Client Device",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
          {row.original.userAgent}
        </span>
      ),
    },
    {
      accessorKey: "lastActiveAt",
      header: "Last Active",
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">
          {row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleTimeString() : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setSessionToRevoke(row.original.id)}
        >
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Security Controls"
        description="Configure session timeouts, review active logins, and revoke unauthorized access."
      />

      {/* Security Config Form */}
      <SecurityConfigForm
        config={data.config}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["security-overview"] })}
      />

      {/* Center-wide Active Sessions */}
      <Card className="rounded-3xl p-6">
        <CardHeader className="p-0 mb-6 flex flex-row items-center gap-3">
          <Users className="size-6 text-foreground" />
          <div>
            <CardTitle className="text-xl">Active Sessions Center-wide</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Currently signed-in devices across all staff, teachers, and students
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={sessionColumns}
            data={data.activeSessions}
            emptyMessage="No active sessions found."
          />
        </CardContent>
      </Card>

      {/* Recent Failed Logins */}
      <Card className="rounded-3xl p-6">
        <CardHeader className="p-0 mb-4 flex flex-row items-center gap-3">
          <AlertOctagon className="size-6 text-foreground" />
          <div>
            <CardTitle className="text-xl">Recent Failed Login Attempts</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Recorded failed credentials and security blocks
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            {data.failedLogins.length > 0 ? (
              data.failedLogins.map((fail) => (
                <div
                  key={fail.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-accent/20 border border-border/40"
                >
                  <div>
                    <p className="text-sm font-medium">{fail.identifier}</p>
                    <p className="text-xs text-muted-foreground">IP: {fail.ip}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase px-3 py-1 rounded-full bg-accent text-accent-foreground">
                    {fail.result}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4">No failed login attempts recorded.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm Revoke Session Dialog */}
      <ConfirmDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title="Revoke Session"
        description="Are you sure you want to revoke this session? The user will be signed out immediately."
        confirmLabel="Yes, Revoke"
        onConfirm={() => {
          if (sessionToRevoke) revokeMutation.mutate(sessionToRevoke);
        }}
      />
    </div>
  );
}

function SecurityConfigForm({
  config,
  onSaved,
}: {
  config: SecurityConfig;
  onSaved: () => void;
}) {
  const [idleMinutes, setIdleMinutes] = React.useState(config.idleTimeoutMinutes);
  const [absoluteHours, setAbsoluteHours] = React.useState(config.absoluteTimeoutHours);
  const [maxAttempts, setMaxAttempts] = React.useState(config.maxLoginAttempts);
  const [lockoutMinutes, setLockoutMinutes] = React.useState(config.lockoutDurationMinutes);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/security/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idleTimeoutMinutes: idleMinutes,
          absoluteTimeoutHours: absoluteHours,
          maxLoginAttempts: maxAttempts,
          lockoutDurationMinutes: lockoutMinutes,
        }),
      });
      if (!res.ok) throw new Error("Failed to update security config");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Security rules updated successfully.");
      onSaved();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update security rules.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  return (
    <Card className="rounded-3xl p-8 max-w-3xl">
      <CardHeader className="p-0 mb-6 flex flex-row items-center gap-3">
        <Lock className="size-6 text-foreground" />
        <div>
          <CardTitle className="text-xl">Authentication & Session Rules</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Global session timeouts and brute force lockout parameters
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Idle Timeout (minutes)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={idleMinutes}
                onChange={(e) => setIdleMinutes(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Inactivity period before requiring re-login</p>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Absolute Expiry (hours)</label>
              <Input
                type="number"
                min={1}
                max={72}
                value={absoluteHours}
                onChange={(e) => setAbsoluteHours(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Maximum total duration of a single session</p>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Max Failed Login Attempts</label>
              <Input
                type="number"
                min={3}
                max={20}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Threshold before temporarily locking user IP</p>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Lockout Duration (minutes)</label>
              <Input
                type="number"
                min={1}
                max={120}
                value={lockoutMinutes}
                onChange={(e) => setLockoutMinutes(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Duration of lockout after repeated failures</p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-full px-8 gap-2"
          >
            <Save className="size-5" />
            {saveMutation.isPending ? "Saving..." : "Save Security Rules"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
