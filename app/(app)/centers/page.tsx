"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Building2, Plus, Edit2, Trash2, Globe, MapPin } from "lucide-react";
import {
  AdminAssetTiles,
  AdminStatusPill,
  AdminSurface,
  AdminToolbar,
} from "@/components/admin/AdminUI";

interface CenterData {
  _id: string;
  name: string;
  address?: string;
  phone?: string;
  timezone: string;
  createdAt?: string;
}

export default function CentersPage() {
  const queryClient = useQueryClient();
  const { user, hasPermission, refetchUser } = useAuth();

  const canCreate = user?.role === "super_admin" || user?.role === "admin" || hasPermission("centers.create");
  const canUpdate = user?.role === "super_admin" || user?.role === "admin" || hasPermission("centers.update");
  const canDelete = user?.role === "super_admin" || user?.role === "admin" || hasPermission("centers.delete");

  const [search, setSearch] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCenter, setEditingCenter] = React.useState<CenterData | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Colombo");

  const { data: centersResponse, isLoading } = useQuery<{ data: CenterData[] }>({
    queryKey: ["centers-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/centers");
      if (!res.ok) throw new Error("Failed to load centers");
      return res.json();
    },
  });

  const centers = centersResponse?.data || [];
  const filteredCenters = centers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.address || "").toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setName("");
    setAddress("");
    setPhone("");
    setTimezone("Asia/Colombo");
  };

  const openEdit = (center: CenterData) => {
    setEditingCenter(center);
    setName(center.name);
    setAddress(center.address || "");
    setPhone(center.phone || "");
    setTimezone(center.timezone || "Asia/Colombo");
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/centers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, phone, timezone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to create center");
      return json;
    },
    onSuccess: async () => {
      toast.success("Center added");
      setCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["centers-list"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      await refetchUser();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingCenter) return;
      const res = await fetch("/api/v1/centers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCenter._id, name, address, phone, timezone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to update center");
      return json;
    },
    onSuccess: async () => {
      toast.success("Center updated");
      setEditingCenter(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["centers-list"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      await refetchUser();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/centers?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete center");
      return json;
    },
    onSuccess: async () => {
      toast.success("Center deleted");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["centers-list"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      await refetchUser();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <Skeleton className="h-36 rounded-[24px]" />
          <Skeleton className="h-36 rounded-[24px]" />
          <Skeleton className="h-36 rounded-[24px]" />
        </div>
        <Skeleton className="h-80 rounded-[24px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Total Centers", value: centers.length, icon: Building2, badge: "Active branches", tone: 1 },
          { label: "Active Center", value: user?.centerName || centers[0]?.name || "Main", icon: MapPin, badge: "Selected", tone: 2 },
          { label: "Timezone", value: centers[0]?.timezone || "Asia/Colombo", icon: Globe, badge: "Standard", tone: 3 },
        ]}
      />

      <AdminToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search centers..."
        actions={
          canCreate && (
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
              className="rounded-full h-10 px-5 text-xs font-bold gap-1.5"
            >
              <Plus className="size-4" />
              <span>Add Center</span>
            </Button>
          )
        }
      />

      <AdminSurface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[11px] font-semibold text-[var(--muted-foreground)]">
                <th className="py-3.5 px-5">Center</th>
                <th className="py-3.5 px-4">Address</th>
                <th className="py-3.5 px-4">Phone</th>
                <th className="py-3.5 px-4">Timezone</th>
                {(canUpdate || canDelete) && <th className="py-3.5 px-5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]/60 text-xs">
              {filteredCenters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--muted-foreground)]">
                    No centers found.
                  </td>
                </tr>
              ) : (
                filteredCenters.map((c) => (
                  <tr key={c._id} className="hover:bg-[var(--admin-surface)]/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center shrink-0">
                          <Building2 className="size-4" />
                        </div>
                        <span className="font-bold text-[var(--foreground)]">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--muted-foreground)]">{c.address || "—"}</td>
                    <td className="py-3.5 px-4 text-[var(--muted-foreground)] tabular-nums">{c.phone || "—"}</td>
                    <td className="py-3.5 px-4">
                      <AdminStatusPill label={c.timezone} tone="neutral" />
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {canUpdate && (
                            <Button variant="outline" size="icon-sm" onClick={() => openEdit(c)} aria-label="Edit">
                              <Edit2 className="size-3.5" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              onClick={() => setDeleteId(c._id)}
                              className="text-rose-600 hover:bg-rose-50"
                              aria-label="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminSurface>

      {/* Add Center Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Add Center</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-3.5 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Center Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Kandy Campus" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="e.g. 45 Peradeniya Road" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 81 234 5678" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Timezone</label>
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 rounded-xl">
                <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
                <option value="UTC">UTC (GMT+0:00)</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </Select>
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full h-10 text-xs">Cancel</Button>
              <Button type="submit" disabled={!name.trim() || createMutation.isPending} className="rounded-full h-10 px-5 text-xs">
                {createMutation.isPending ? "Adding..." : "Add Center"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Center Dialog */}
      <Dialog open={!!editingCenter} onOpenChange={(o) => !o && setEditingCenter(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Center</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-3.5 pt-2 text-xs"
          >
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Center Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Address</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground block">Timezone</label>
              <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-10 rounded-xl">
                <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
                <option value="UTC">UTC (GMT+0:00)</option>
                <option value="America/New_York">America/New_York</option>
                <option value="Europe/London">Europe/London</option>
              </Select>
            </div>
            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setEditingCenter(null)} className="rounded-full h-10 text-xs">Cancel</Button>
              <Button type="submit" disabled={!name.trim() || updateMutation.isPending} className="rounded-full h-10 px-5 text-xs">
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete center?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />
    </div>
  );
}
