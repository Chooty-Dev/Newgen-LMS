"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Lock, Users, AlertOctagon, Save } from "lucide-react";
import {
  AdminAssetTiles,
  AdminSectionHeader,
  AdminStatusPill,
  AdminSurface,
} from "@/components/admin/AdminUI";

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
      toast.success("Session revoked");
      queryClient.invalidateQueries({ queryKey: ["security-overview"] });
      setSessionToRevoke(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <Skeleton className="h-96 rounded-[24px]" />;
  }

  const data = secData?.data;
  if (!data) return null;

  const sessionColumns: ColumnDef<ActiveSessionItem>[] = [
    {
      accessorKey: "user.name",
      header: "User",
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground text-xs block">{row.original.user?.name || "Unknown"}</span>
          <span className="text-[11px] text-muted-foreground capitalize">{row.original.user?.role || "user"}</span>
        </div>
      ),
    },
    {
      accessorKey: "ip",
      header: "IP Address",
      cell: ({ row }) => <span className="tabular-nums font-mono text-xs">{row.original.ip}</span>,
    },
    {
      accessorKey: "lastActiveAt",
      header: "Last Active",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleTimeString() : "-"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Action",
      cell: ({ row }) => (
        <Button variant="outline" size="sm" className="rounded-full h-8 text-xs text-rose-600" onClick={() => setSessionToRevoke(row.original.id)}>
          Revoke
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Active Sessions", value: data.activeSessions.length, icon: Users, badge: "Signed in", tone: 1 },
          { label: "Failed Logins", value: data.failedLogins.length, icon: AlertOctagon, badge: "Blocked", tone: 2 },
          { label: "Idle Timeout", value: `${data.config.idleTimeoutMinutes}m`, icon: Lock, badge: "Policy", tone: 3 },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <AdminSectionHeader title="Session Policy" />
          <SecurityConfigForm
            config={data.config}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["security-overview"] })}
          />
        </div>

        <div className="lg:col-span-6">
          <AdminSectionHeader title="Failed Logins" />
          <AdminSurface className="p-5 space-y-2.5 max-h-[340px] overflow-y-auto">
            {data.failedLogins.length > 0 ? (
              data.failedLogins.map((fail) => (
                <div
                  key={fail.id}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] text-xs"
                >
                  <div>
                    <p className="font-bold text-foreground">{fail.identifier}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">IP: {fail.ip}</p>
                  </div>
                  <AdminStatusPill label={fail.result} tone="danger" />
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">No failed attempts.</p>
            )}
          </AdminSurface>
        </div>
      </div>

      <div>
        <AdminSectionHeader title="Active Sessions" />
        <AdminSurface className="p-2 sm:p-4">
          <DataTable columns={sessionColumns} data={data.activeSessions} emptyMessage="No active sessions." />
        </AdminSurface>
      </div>

      <ConfirmDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title="Revoke session?"
        description="User will be signed out immediately."
        confirmLabel="Revoke"
        onConfirm={() => {
          if (sessionToRevoke) revokeMutation.mutate(sessionToRevoke);
        }}
      />
    </div>
  );
}

function SecurityConfigForm({ config, onSaved }: { config: SecurityConfig; onSaved: () => void }) {
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
      toast.success("Security policy updated");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <AdminSurface className="p-5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
        className="space-y-4 text-xs"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="font-semibold block mb-1">Idle Timeout (min)</label>
            <Input type="number" min={1} max={120} value={idleMinutes} onChange={(e) => setIdleMinutes(Number(e.target.value))} className="h-9 rounded-xl" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Max Session (hrs)</label>
            <Input type="number" min={1} max={72} value={absoluteHours} onChange={(e) => setAbsoluteHours(Number(e.target.value))} className="h-9 rounded-xl" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Max Login Attempts</label>
            <Input type="number" min={3} max={20} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className="h-9 rounded-xl" />
          </div>
          <div>
            <label className="font-semibold block mb-1">Lockout (min)</label>
            <Input type="number" min={1} max={120} value={lockoutMinutes} onChange={(e) => setLockoutMinutes(Number(e.target.value))} className="h-9 rounded-xl" />
          </div>
        </div>
        <Button type="submit" disabled={saveMutation.isPending} className="rounded-full h-10 px-5 text-xs font-bold gap-1.5">
          <Save className="size-3.5" />
          <span>{saveMutation.isPending ? "Saving..." : "Save Policy"}</span>
        </Button>
      </form>
    </AdminSurface>
  );
}
