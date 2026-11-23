"use client";

import * as React from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";
import { Building2, Plus, Edit2, Trash2, Globe, CheckCircle2, MapPin } from "lucide-react";

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

  // Dialog States
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingCenter, setEditingCenter] = React.useState<CenterData | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Form Fields
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Colombo");

  // Fetch Centers
  const { data: centersResponse, isLoading } = useQuery<{ data: CenterData[] }>({
    queryKey: ["centers-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/centers");
      if (!res.ok) throw new Error("Failed to load center details");
      return res.json();
    },
  });

  const centers = centersResponse?.data || [];

  // Reset form
  const resetForm = () => {
    setName("");
    setAddress("");
    setPhone("");
    setTimezone("Asia/Colombo");
  };

  // Open Edit Dialog
  const openEdit = (center: CenterData) => {
    setEditingCenter(center);
    setName(center.name);
    setAddress(center.address || "");
    setPhone(center.phone || "");
    setTimezone(center.timezone || "Asia/Colombo");
  };

  // Create Center Mutation
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
      toast.success("Center created successfully.");
      setCreateOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["centers-list"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      await refetchUser();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not create center.");
    },
  });

  // Update Center Mutation
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
      toast.success("Center details updated successfully.");
      setEditingCenter(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["centers-list"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      await refetchUser();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not update center.");
    },
  });

  // Delete Center Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/centers?id=${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete center");
      return json;
    },
    onSuccess: async () => {
      toast.success("Center deleted successfully.");
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["centers-list"] });
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      await refetchUser();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not delete center.");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Manage Centers" description="Add, edit or remove your education centers here." />
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* 1. TOP HEADER: Solid Blue Banner (2/3) + 2x2 Stats Cards (1/3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 rounded-3xl p-6 sm:p-8 md:p-9 bg-[#184880] text-white relative overflow-hidden shadow-[0_4px_20px_-4px_rgba(24,72,128,0.12)] min-h-[220px] flex flex-col justify-between">
          <div className="relative z-10 max-w-sm sm:max-w-md space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              Education Centers & Branches
            </h2>
            <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
              Configure education institute branches, local addresses, contact details, and operational timezones for centralized administration.
            </p>
            <div className="pt-2">
              {canCreate && (
                <Button
                  onClick={() => {
                    resetForm();
                    setCreateOpen(true);
                  }}
                  className="bg-white text-primary hover:bg-white/95 font-bold text-xs sm:text-sm rounded-full shadow-md gap-2 h-11 px-6 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>Add Education Center</span>
                </Button>
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 w-48 sm:w-64 md:w-72 lg:w-80 h-full max-h-[220px] z-10">
            <Image
              src="/images/class.webp"
              alt="Centers"
              fill
              priority
              className="object-contain object-bottom-right drop-shadow-md"
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Building2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {centers.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Total Centers
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl font-black text-foreground tabular-nums leading-tight">
                  {centers.length}
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Active Branches
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <MapPin className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-foreground truncate leading-tight">
                  Colombo
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Primary Location
                </p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-3 sm:p-3.5 shadow-[0_4px_20px_-4px_rgba(24,72,128,0.06)] flex items-center gap-2.5">
              <div className="size-9 sm:size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Globe className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-foreground truncate leading-tight">
                  GMT+05:30
                </p>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground truncate">
                  Local Timezone
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-card border border-border rounded-2xl text-xs text-muted-foreground font-medium flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Center-level data isolation is active for this workspace.</span>
          </div>
        </div>
      </section>

      {/* Centers Table Card */}
      <Card className="rounded-3xl p-6 md:p-8">
        <CardHeader className="p-0 mb-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="size-6 text-foreground" />
            <CardTitle className="text-2xl">Education Centers ({centers.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {centers.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <p className="text-base text-muted-foreground">No centers found.</p>
              {canCreate && (
                <Button onClick={() => setCreateOpen(true)} className="rounded-full">
                  Add Center
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Center Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Timezone</TableHead>
                    {(canUpdate || canDelete) && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {centers.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="size-4 text-muted-foreground" />
                          <span>{c.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.address || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                          {c.timezone}
                        </span>
                      </TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canUpdate && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEdit(c)}
                                className="rounded-full gap-1 h-9"
                              >
                                <Edit2 className="size-4" />
                                <span>Edit</span>
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(c._id)}
                                className="rounded-full gap-1 h-9 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="size-4" />
                                <span>Delete</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Center Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl">Add Center</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Create a new education center in your system.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Center Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Kandy Campus"
                className="h-12 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 45 Peradeniya Road, Kandy"
                className="h-12 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +94 81 234 5678"
                className="h-12 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Timezone</label>
              <Select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-12 rounded-full"
              >
                <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
                <option value="UTC">UTC (GMT+0:00)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-full h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="rounded-full h-12 px-6"
              >
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
            <DialogTitle className="text-2xl">Edit Center</DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Update information for this education center.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Center Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Address</label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-12 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Phone Number</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Timezone</label>
              <Select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-12 rounded-full"
              >
                <option value="Asia/Colombo">Asia/Colombo (GMT+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (GMT+4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (GMT+8:00)</option>
                <option value="UTC">UTC (GMT+0:00)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCenter(null)}
                className="rounded-full h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || updateMutation.isPending}
                className="rounded-full h-12 px-6"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete this center?"
        description="This cannot be undone. You cannot delete the only remaining center in the system."
        confirmLabel="Yes, Delete"
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
        }}
      />
    </div>
  );
}
