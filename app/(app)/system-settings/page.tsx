"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Sliders, Award, Layers, Save } from "lucide-react";

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
    return (
      <div className="space-y-6">
        <PageHeader
          title="System Settings"
          description="Configure performance score weights, thresholds, and academic grade boundaries."
        />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  const settings = settingsData?.data;
  if (!settings) return null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="System Settings"
        description="Configure performance score weights, standing thresholds, and academic grade boundaries."
      />

      <SystemSettingsForm
        settings={settings}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["system-settings"] })}
      />
    </div>
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
  const [attendanceWeight, setAttendanceWeight] = React.useState(
    Math.round(settings.performanceWeights.attendance * 100)
  );
  const [improvementWeight, setImprovementWeight] = React.useState(
    Math.round(settings.performanceWeights.improvement * 100)
  );

  const [excellentMin, setExcellentMin] = React.useState(settings.groupThresholds.excellent);
  const [mediumMin, setMediumMin] = React.useState(settings.groupThresholds.medium);

  const [gradeScale, setGradeScale] = React.useState(settings.gradeScale);

  const totalWeight = marksWeight + attendanceWeight + improvementWeight;
  const isWeightsValid = totalWeight === 100;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!isWeightsValid) {
        throw new Error("Weights must sum exactly to 100%");
      }
      const res = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          performanceWeights: {
            marks: marksWeight / 100,
            attendance: attendanceWeight / 100,
            improvement: improvementWeight / 100,
          },
          groupThresholds: {
            excellent: excellentMin,
            medium: mediumMin,
          },
          gradeScale,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("System settings saved successfully.");
      onSaved();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save settings.");
    },
  });

  const handleGradeChange = (index: number, newMin: number) => {
    const updated = [...gradeScale];
    updated[index] = { ...updated[index], min: newMin };
    setGradeScale(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Performance Score Weights */}
        <Card className="rounded-3xl p-8">
          <CardHeader className="p-0 mb-6 flex flex-row items-center gap-3">
            <Sliders className="size-6 text-foreground" />
            <div>
              <CardTitle className="text-xl">Performance Score Formula</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Weights assigned to each component (must sum to 100%)
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Marks Score Weight (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={marksWeight}
                onChange={(e) => setMarksWeight(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Attendance Score Weight (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={attendanceWeight}
                onChange={(e) => setAttendanceWeight(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">Improvement Trend Weight (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={improvementWeight}
                onChange={(e) => setImprovementWeight(Number(e.target.value))}
              />
            </div>

            <div
              className={`p-4 rounded-2xl border text-sm flex items-center justify-between ${
                isWeightsValid
                  ? "bg-accent/20 border-border text-foreground"
                  : "bg-destructive/10 border-destructive text-destructive-foreground"
              }`}
            >
              <span className="font-medium">Total Formula Weight</span>
              <span className="font-bold tabular-nums text-base">{totalWeight}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Performance Standing Thresholds */}
        <Card className="rounded-3xl p-8">
          <CardHeader className="p-0 mb-6 flex flex-row items-center gap-3">
            <Layers className="size-6 text-foreground" />
            <div>
              <CardTitle className="text-xl">Standing Categories</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Score boundaries for performance classifications</p>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">
                &ldquo;Excellent&rdquo; Minimum Score (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={excellentMin}
                onChange={(e) => setExcellentMin(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">Scores equal or above this tier receive &ldquo;Excellent&rdquo;</p>
            </div>

            <div className="space-y-2">
              <label className="text-base font-medium text-foreground">
                &ldquo;Good&rdquo; Minimum Score (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={mediumMin}
                onChange={(e) => setMediumMin(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Scores below this tier are flagged as &ldquo;Needs Help&rdquo;
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Card 3: Grade Boundaries */}
      <Card className="rounded-3xl p-8">
        <CardHeader className="p-0 mb-6 flex flex-row items-center gap-3">
          <Award className="size-6 text-foreground" />
          <div>
            <CardTitle className="text-xl">Grade Boundaries</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Minimum percentage marks required for each letter grade
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            {gradeScale.map((item, index) => (
              <div key={item.grade} className="p-4 rounded-2xl bg-card border border-border space-y-2">
                <span className="text-lg font-bold block">{item.grade} Grade</span>
                <label className="text-xs text-muted-foreground block">Minimum %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={item.min}
                  onChange={(e) => handleGradeChange(index, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isWeightsValid || updateMutation.isPending}
          className="rounded-full px-8 gap-2"
        >
          <Save className="size-5" />
          {updateMutation.isPending ? "Saving..." : "Save System Settings"}
        </Button>
      </div>
    </form>
  );
}
