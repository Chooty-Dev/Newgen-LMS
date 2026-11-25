"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminSurface, AdminToolbar } from "@/components/admin/AdminUI";

interface PermissionsOverview {
  moduleCatalog: Record<string, { label: string; permissions: string[] }>;
  rolePermissions: Record<string, string[]>;
  overrides: Array<{
    id: string;
    userId: string;
    user?: { name: string; username: string; role: string };
    grants: string[];
    revokes: string[];
  }>;
  superAdminExclusive: string[];
}

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"roles" | "users">("roles");

  const { data: permData, isLoading } = useQuery<{ data: PermissionsOverview }>({
    queryKey: ["permissions-overview"],
    queryFn: async () => {
      const res = await fetch("/api/v1/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 rounded-[24px]" />;
  }

  const overview = permData?.data;
  if (!overview) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[var(--admin-surface)] border border-[var(--admin-border)]">
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
              activeTab === "roles" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
            )}
          >
            Role Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
              activeTab === "users" ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"
            )}
          >
            User Overrides
          </button>
        </div>
      </div>

      {activeTab === "roles" ? (
        <RolePermissionsTab
          key={JSON.stringify(overview.rolePermissions)}
          overview={overview}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["permissions-overview"] })}
        />
      ) : (
        <UserOverridesTab
          overview={overview}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["permissions-overview"] })}
        />
      )}
    </div>
  );
}

function RolePermissionsTab({
  overview,
  onSaved,
}: {
  overview: PermissionsOverview;
  onSaved: () => void;
}) {
  const [selectedRole, setSelectedRole] = React.useState<string>("admin");
  const [search, setSearch] = React.useState<string>("");
  const [activePermissions, setActivePermissions] = React.useState<string[]>(
    overview.rolePermissions[selectedRole] || []
  );

  const isSuperAdmin = selectedRole === "super_admin";

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    setActivePermissions(overview.rolePermissions[role] || []);
  };

  const togglePermission = (permission: string) => {
    if (isSuperAdmin) return;
    setActivePermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  const toggleAllInModule = (modulePermissions: string[]) => {
    if (isSuperAdmin) return;
    const allActive = modulePermissions.every((p) => activePermissions.includes(p));
    if (allActive) {
      setActivePermissions((prev) => prev.filter((p) => !modulePermissions.includes(p)));
    } else {
      setActivePermissions((prev) => Array.from(new Set([...prev, ...modulePermissions])));
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/permissions/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole, permissions: activePermissions }),
      });
      if (!res.ok) throw new Error("Failed to save permissions");
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Saved ${selectedRole} permissions`);
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filteredModules = Object.entries(overview.moduleCatalog).filter(([key, group]) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      group.label.toLowerCase().includes(term) ||
      key.toLowerCase().includes(term) ||
      group.permissions.some((p) => p.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {["admin", "teacher", "staff", "student", "super_admin"].map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => handleRoleChange(role)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-bold capitalize border transition-all cursor-pointer",
              selectedRole === role
                ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                : "bg-white text-[var(--foreground)] border-[var(--admin-border)] hover:bg-[var(--admin-surface)]"
            )}
          >
            {role.replace("_", " ")}
          </button>
        ))}
      </div>

      {isSuperAdmin ? (
        <AdminSurface tinted className="p-6 flex items-center gap-4">
          <Shield className="size-7 text-[var(--primary)] shrink-0" />
          <div>
            <p className="font-bold text-sm text-foreground">Super Admin Root Access</p>
            <p className="text-xs text-muted-foreground">All permissions enabled unconditionally.</p>
          </div>
        </AdminSurface>
      ) : (
        <>
          <AdminToolbar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Filter modules..."
            actions={
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
              >
                <Save className="size-4" />
                <span>{saveMutation.isPending ? "Saving..." : "Save Permissions"}</span>
              </Button>
            }
          />

          <div className="space-y-4">
            {filteredModules.map(([modKey, modGroup]) => {
              const allChecked = modGroup.permissions.every((p) => activePermissions.includes(p));
              const someChecked = modGroup.permissions.some((p) => activePermissions.includes(p));

              return (
                <AdminSurface key={modKey} className="p-5">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--admin-border)]">
                    <h3 className="font-bold text-sm text-foreground">{modGroup.label}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>All</span>
                      <Switch
                        checked={allChecked || someChecked}
                        onCheckedChange={() => toggleAllInModule(modGroup.permissions)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {modGroup.permissions.map((perm) => {
                      const isExclusive = overview.superAdminExclusive.includes(perm);
                      const isChecked = activePermissions.includes(perm);

                      return (
                        <div
                          key={perm}
                          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)]"
                        >
                          <div className="pr-2 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{perm}</p>
                            {isExclusive && <span className="text-[10px] text-muted-foreground">Root Only</span>}
                          </div>
                          <Switch
                            checked={isChecked}
                            disabled={isExclusive}
                            onCheckedChange={() => togglePermission(perm)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </AdminSurface>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function UserOverridesTab({
  overview,
  onSaved,
}: {
  overview: PermissionsOverview;
  onSaved: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);

  const { data: usersData } = useQuery<{
    data: Array<{ id: string; name: string; username: string; role: string }>;
  }>({
    queryKey: ["users-for-permissions"],
    queryFn: async () => {
      const res = await fetch("/api/v1/students?limit=50");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const users = usersData?.data || [];
  const activeUserId = selectedUserId || (users.length > 0 ? users[0].id : "");
  const selectedUser = users.find((u) => u.id === activeUserId);

  const existingOverride = overview.overrides.find((o) => o.userId === activeUserId);
  const [grants, setGrants] = React.useState<string[]>(existingOverride?.grants || []);
  const [revokes, setRevokes] = React.useState<string[]>(existingOverride?.revokes || []);

  const saveMutation = useMutation({
    mutationFn: async (reset?: boolean) => {
      const res = await fetch("/api/v1/permissions/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: activeUserId, grants, revokes, reset: !!reset }),
      });
      if (!res.ok) throw new Error("Failed to update user permissions");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Overrides updated");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleGrant = (perm: string) => {
    setGrants((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    setRevokes((prev) => prev.filter((p) => p !== perm));
  };

  const toggleRevoke = (perm: string) => {
    setRevokes((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    setGrants((prev) => prev.filter((p) => p !== perm));
  };

  return (
    <div className="space-y-5">
      <AdminSurface className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <Select value={activeUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="h-10 rounded-full text-xs">
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} (@{u.username})
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsResetConfirmOpen(true)} className="rounded-full h-10 text-xs gap-1.5">
            <RotateCcw className="size-3.5" />
            <span>Reset</span>
          </Button>
          <Button onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending} className="rounded-full h-10 px-5 text-xs font-bold gap-1.5">
            <Save className="size-3.5" />
            <span>Save</span>
          </Button>
        </div>
      </AdminSurface>

      {selectedUser && (
        <div className="space-y-4">
          {Object.entries(overview.moduleCatalog).map(([modKey, modGroup]) => (
            <AdminSurface key={modKey} className="p-5">
              <h3 className="font-bold text-sm text-foreground pb-3 mb-3 border-b border-[var(--admin-border)]">
                {modGroup.label}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {modGroup.permissions.map((perm) => (
                  <div
                    key={perm}
                    className="p-3 rounded-xl bg-[var(--admin-surface)] border border-[var(--admin-border)] space-y-2 text-xs"
                  >
                    <p className="font-semibold text-foreground">{perm}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Grant</span>
                      <Switch checked={grants.includes(perm)} onCheckedChange={() => toggleGrant(perm)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Revoke</span>
                      <Switch checked={revokes.includes(perm)} onCheckedChange={() => toggleRevoke(perm)} />
                    </div>
                  </div>
                ))}
              </div>
            </AdminSurface>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Reset user permissions?"
        description="Restores role default permissions."
        confirmLabel="Reset"
        onConfirm={() => {
          saveMutation.mutate(true);
          setGrants([]);
          setRevokes([]);
        }}
      />
    </div>
  );
}
