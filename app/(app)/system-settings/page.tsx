"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Save, Sliders, Award, Layers } from "lucide-react";
import { AdminAssetTiles, AdminSectionHeader, AdminSurface } from "@/components/admin/AdminUI";
import { cn } from "@/lib/utils";

interface SystemSettingsData {
  performanceWeights: {
    marks: number;
    attendance: number;
    improvement: number;
  };
  groupThresholds: {
    excellent: number;
    medium: number;
  };
  gradeScale: Array<{
    grade: string;
    min: number;
  }>;
}

export default function SystemSettingsPage() {
  const queryClient = useQueryClient();

  const { data: settingsData, isLoading } = useQuery<{ data: SystemSettingsData }>({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const res = await fetch("/api/v1/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96 rounded-[24px]" />;
  }

  const settings = settingsData?.data;
  if (!settings) return null;

  return (
    <SystemSettingsForm
      settings={settings}
      onSaved={() => queryClient.invalidateQueries({ queryKey: ["system-settings"] })}
    />
  );
}

function SystemSettingsForm({
  settings,
  onSaved,
}: {
  settings: SystemSettingsData;
  onSaved: () => void;
}) {
  const [marksWeight, setMarksWeight] = React.useState(Math.round(settings.performanceWeights.marks * 100));
  const [attendanceWeight, setAttendanceWeight] = React.useState(Math.round(settings.performanceWeights.attendance * 100));
  const [improvementWeight, setImprovementWeight] = React.useState(Math.round(settings.performanceWeights.improvement * 100));
  const [excellentMin, setExcellentMin] = React.useState(settings.groupThresholds.excellent);
  const [mediumMin, setMediumMin] = React.useState(settings.groupThresholds.medium);
  const [gradeScale, setGradeScale] = React.useState(settings.gradeScale);

  const totalWeight = marksWeight + attendanceWeight + improvementWeight;
  const isWeightsValid = totalWeight === 100;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!isWeightsValid) throw new Error("Weights must sum to 100%");
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performanceWeights: {
            marks: marksWeight / 100,
            attendance: attendanceWeight / 100,
            improvement: improvementWeight / 100,
          },
          groupThresholds: { excellent: excellentMin, medium: mediumMin },
          gradeScale,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Settings saved");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleGradeChange = (index: number, newMin: number) => {
    const updated = [...gradeScale];
    updated[index] = { ...updated[index], min: newMin };
    setGradeScale(updated);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        updateMutation.mutate();
      }}
      className="space-y-6 animate-in fade-in duration-200"
    >
      <AdminAssetTiles
        columns={3}
        items={[
          { label: "Formula Weight", value: `${totalWeight}%`, icon: Sliders, badge: isWeightsValid ? "Balanced" : "Must be 100%", tone: 1 },
          { label: "Excellent Min", value: `${excellentMin}%`, icon: Layers, badge: "Top tier", tone: 2 },
          { label: "Grade Levels", value: gradeScale.length, icon: Award, badge: "Configured", tone: 3 },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <AdminSurface className="p-6 space-y-4">
          <AdminSectionHeader title="Score Formula" />
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Marks %</label>
              <Input type="number" min={0} max={100} value={marksWeight} onChange={(e) => setMarksWeight(Number(e.target.value))} className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Attendance %</label>
              <Input type="number" min={0} max={100} value={attendanceWeight} onChange={(e) => setAttendanceWeight(Number(e.target.value))} className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Growth %</label>
              <Input type="number" min={0} max={100} value={improvementWeight} onChange={(e) => setImprovementWeight(Number(e.target.value))} className="h-10 rounded-xl" />
            </div>
          </div>
          <div
            className={cn(
              "px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between font-semibold",
              isWeightsValid
                ? "bg-[var(--admin-surface)] border-[var(--admin-border)] text-foreground"
                : "bg-rose-50 border-rose-200 text-rose-600"
            )}
          >
            <span>Total Weight</span>
            <span className="tabular-nums font-bold">{totalWeight}%</span>
          </div>
        </AdminSurface>

        <AdminSurface className="p-6 space-y-4">
          <AdminSectionHeader title="Standing Thresholds" />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Excellent Min (%)</label>
              <Input type="number" min={0} max={100} value={excellentMin} onChange={(e) => setExcellentMin(Number(e.target.value))} className="h-10 rounded-xl" />
            </div>
            <div>
              <label className="font-semibold block mb-1">Good Min (%)</label>
              <Input type="number" min={0} max={100} value={mediumMin} onChange={(e) => setMediumMin(Number(e.target.value))} className="h-9 rounded-xl" />
            </div>
          </div>
        </AdminSurface>
      </div>

      <AdminSurface className="p-6">
        <AdminSectionHeader title="Grade Scale" />
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
          {gradeScale.map((item, index) => (
            <div key={item.grade} className="p-3.5 rounded-2xl bg-[var(--admin-surface)] border border-[var(--admin-border)] space-y-1.5 text-xs">
              <span className="text-base font-bold block">{item.grade}</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={item.min}
                onChange={(e) => handleGradeChange(index, Number(e.target.value))}
                className="h-9 rounded-xl bg-white"
              />
            </div>
          ))}
        </div>
      </AdminSurface>

      <div className="flex justify-end">
        <Button type="submit" disabled={!isWeightsValid || updateMutation.isPending} className="rounded-full h-10 px-6 text-xs font-bold gap-1.5">
          <Save className="size-4" />
          <span>{updateMutation.isPending ? "Saving..." : "Save Settings"}</span>
        </Button>
      </div>
    </form>
  );
}
