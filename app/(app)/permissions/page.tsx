"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, RotateCcw, Save } from "lucide-react";

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

  const { data: permData, isLoading } = useQuery<{ data: PermissionsOverview }>({
    queryKey: ["permissions-overview"],
    queryFn: async () => {
      const res = await fetch("/api/v1/permissions");
      if (!res.ok) throw new Error("Failed to load permissions");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Role & User Permissions"
          description="Configure system access rights for each role and individual users."
        />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  const overview = permData?.data;
  if (!overview) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Role & User Permissions"
        description="Configure system access rights for each role and individual users."
      />

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles">Role Permissions</TabsTrigger>
          <TabsTrigger value="users">User Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <RolePermissionsTab
            key={JSON.stringify(overview.rolePermissions)}
            overview={overview}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["permissions-overview"] })}
          />
        </TabsContent>

        <TabsContent value="users">
          <UserOverridesTab
            overview={overview}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ["permissions-overview"] })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// -------------------------------------------------------------
// Tab 1: Role Permissions
// -------------------------------------------------------------
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
        body: JSON.stringify({
          role: selectedRole,
          permissions: activePermissions,
        }),
      });
      if (!res.ok) throw new Error("Failed to save role permissions");
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Permissions for ${selectedRole} saved successfully.`);
      onSaved();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not save role permissions.");
    },
  });

  // Filter modules by search
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
    <div className="space-y-6">
      {/* Role Picker Pills */}
      <div className="flex flex-wrap gap-3">
        {["admin", "teacher", "staff", "student", "super_admin"].map((role) => (
          <Button
            key={role}
            variant={selectedRole === role ? "default" : "outline"}
            onClick={() => handleRoleChange(role)}
            className="rounded-full px-6 capitalize"
          >
            {role.replace("_", " ")}
          </Button>
        ))}
      </div>

      {isSuperAdmin ? (
        <Card className="rounded-3xl p-8 bg-accent/20 border-2 border-border">
          <div className="flex items-center gap-4">
            <Shield className="size-8 text-foreground" />
            <div>
              <h3 className="text-xl font-bold">Super Admin Full Access</h3>
              <p className="text-base text-muted-foreground mt-1">
                The Super Admin role unconditionally has all system permissions and cannot be modified.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SearchInput
              value={search}
              onValueChange={setSearch}
              placeholder="Filter module permissions..."
              className="max-w-md"
            />
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="rounded-full px-8 gap-2"
            >
              <Save className="size-5" />
              {saveMutation.isPending ? "Saving..." : "Save Role Permissions"}
            </Button>
          </div>

          <div className="space-y-6">
            {filteredModules.map(([modKey, modGroup]) => {
              const allChecked = modGroup.permissions.every((p) => activePermissions.includes(p));
              const someChecked = modGroup.permissions.some((p) => activePermissions.includes(p));

              return (
                <Card key={modKey} className="rounded-3xl p-6">
                  <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between border-b border-border/50 pb-4">
                    <div>
                      <CardTitle className="text-xl">{modGroup.label}</CardTitle>
                      <p className="text-sm text-muted-foreground">Module: {modKey}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Full Module Access</span>
                      <Switch
                        checked={allChecked || someChecked}
                        onCheckedChange={() => toggleAllInModule(modGroup.permissions)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 pt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {modGroup.permissions.map((perm) => {
                      const isExclusive = overview.superAdminExclusive.includes(perm);
                      const isChecked = activePermissions.includes(perm);

                      return (
                        <div
                          key={perm}
                          className="flex items-center justify-between p-3 rounded-2xl bg-accent/20 border border-border/40"
                        >
                          <div className="pr-2">
                            <p className="text-sm font-medium text-foreground">{perm}</p>
                            {isExclusive && (
                              <span className="text-xs text-muted-foreground">Super Admin Only</span>
                            )}
                          </div>
                          <Switch
                            checked={isChecked}
                            disabled={isExclusive}
                            onCheckedChange={() => togglePermission(perm)}
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Tab 2: User Overrides
// -------------------------------------------------------------
function UserOverridesTab({
  overview,
  onSaved,
}: {
  overview: PermissionsOverview;
  onSaved: () => void;
}) {
  const [selectedUserId, setSelectedUserId] = React.useState<string>("");
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);

  // Fetch users for the picker
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
        body: JSON.stringify({
          userId: activeUserId,
          grants,
          revokes,
          reset: !!reset,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user permissions");
      return res.json();
    },
    onSuccess: () => {
      toast.success("User permissions updated successfully.");
      onSaved();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update user permissions.");
    },
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
    <div className="space-y-6">
      <Card className="rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Select User</label>
            <Select value={activeUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username}) — Role: {u.role}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-4 sm:pt-0">
            <Button
              variant="outline"
              onClick={() => setIsResetConfirmOpen(true)}
              className="rounded-full gap-2"
            >
              <RotateCcw className="size-4" />
              Reset to Role Defaults
            </Button>
            <Button
              onClick={() => saveMutation.mutate(false)}
              disabled={saveMutation.isPending}
              className="rounded-full px-8 gap-2"
            >
              <Save className="size-5" />
              Save Overrides
            </Button>
          </div>
        </div>
      </Card>

      {selectedUser && (
        <div className="space-y-6">
          {Object.entries(overview.moduleCatalog).map(([modKey, modGroup]) => (
            <Card key={modKey} className="rounded-3xl p-6">
              <CardHeader className="p-0 mb-4 border-b border-border/50 pb-3">
                <CardTitle className="text-xl">{modGroup.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-0 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modGroup.permissions.map((perm) => {
                  const isGranted = grants.includes(perm);
                  const isRevoked = revokes.includes(perm);

                  return (
                    <div
                      key={perm}
                      className="p-3 rounded-2xl bg-accent/20 border border-border/40 space-y-2"
                    >
                      <p className="text-sm font-medium text-foreground">{perm}</p>
                      <div className="flex items-center justify-between pt-1">
                        <label className="text-xs text-muted-foreground">Grant Extra</label>
                        <Switch
                          checked={isGranted}
                          onCheckedChange={() => toggleGrant(perm)}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <label className="text-xs text-muted-foreground">Explicit Revoke</label>
                        <Switch
                          checked={isRevoked}
                          onCheckedChange={() => toggleRevoke(perm)}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={isResetConfirmOpen}
        onOpenChange={setIsResetConfirmOpen}
        title="Reset User Permissions"
        description="Are you sure you want to reset this user's permissions back to their default role permissions? All custom grants and revokes will be cleared."
        confirmLabel="Yes, Reset"
        onConfirm={() => {
          saveMutation.mutate(true);
          setGrants([]);
          setRevokes([]);
        }}
      />
    </div>
  );
}
