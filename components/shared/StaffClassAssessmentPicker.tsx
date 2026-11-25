"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import type {
  AssignmentAssessmentOption,
  AssignmentClassOption,
  StaffAssignmentOptionsPayload,
} from "@/modules/users/staff-assignment-cache";

export type { AssignmentClassOption, AssignmentAssessmentOption };

export function filterAssessmentsByClasses(
  assessments: AssignmentAssessmentOption[],
  selectedClassIds: string[]
): AssignmentAssessmentOption[] {
  if (!selectedClassIds.length) return [];
  const selectedSet = new Set(selectedClassIds);
  return assessments.filter((asm) => asm.classIds.some((cid) => selectedSet.has(cid)));
}

export function useStaffAssignmentOptions(enabled: boolean) {
  const { user } = useAuth();

  const query = useQuery<{ data: StaffAssignmentOptionsPayload }>({
    queryKey: ["staff-assignment-options", user?.centerId, user?.id],
    queryFn: async () => {
      const res = await fetch("/api/v1/staff/assignment-options");
      if (!res.ok) return { data: { classes: [], assessments: [], cachedAt: "" } };
      return res.json();
    },
    enabled: enabled && Boolean(user?.centerId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  return {
    classList: query.data?.data?.classes ?? [],
    assessmentList: query.data?.data?.assessments ?? [],
    isLoadingOptions: query.isLoading,
  };
}

interface StaffClassAssessmentPickerProps {
  classes: AssignmentClassOption[];
  assessments: AssignmentAssessmentOption[];
  isLoading?: boolean;
  selectedClassIds: string[];
  selectedAssessmentIds: string[];
  onChangeClasses: (nextClassIds: string[], nextAssessmentIds: string[]) => void;
  onChangeAssessments: (nextAssessmentIds: string[]) => void;
  layout?: "stacked" | "columns";
  surfaceClassName?: string;
}

export function StaffClassAssessmentPicker({
  classes,
  assessments,
  isLoading = false,
  selectedClassIds,
  selectedAssessmentIds,
  onChangeClasses,
  onChangeAssessments,
  layout = "stacked",
  surfaceClassName = "bg-secondary/30",
}: StaffClassAssessmentPickerProps) {
  const selectedClassSet = React.useMemo(() => new Set(selectedClassIds), [selectedClassIds]);

  // O(1)-keyed memoized class -> filtered assessments view (0 DB calls on toggle)
  const filteredAssessments = React.useMemo(() => {
    if (selectedClassIds.length === 0) return [];
    return assessments.filter((asm) => asm.classIds.some((cid) => selectedClassSet.has(cid)));
  }, [assessments, selectedClassIds.length, selectedClassSet]);

  const handleToggleClass = (classId: string, checked: boolean) => {
    const nextClassIds = checked
      ? Array.from(new Set([...selectedClassIds, classId]))
      : selectedClassIds.filter((id) => id !== classId);

    if (checked) {
      onChangeClasses(nextClassIds, selectedAssessmentIds);
      return;
    }

    // Prune assessments that only belonged to the unchecked class
    const remainingAllowedIds = new Set(
      filterAssessmentsByClasses(assessments, nextClassIds).map((a) => a.id)
    );
    const nextAssessmentIds = selectedAssessmentIds.filter((aid) => remainingAllowedIds.has(aid));
    onChangeClasses(nextClassIds, nextAssessmentIds);
  };

  const handleToggleAssessment = (assessmentId: string, checked: boolean) => {
    const nextAssessmentIds = checked
      ? Array.from(new Set([...selectedAssessmentIds, assessmentId]))
      : selectedAssessmentIds.filter((id) => id !== assessmentId);
    onChangeAssessments(nextAssessmentIds);
  };

  const boxHeightClass = layout === "columns" ? "max-h-28 p-2 rounded-xl" : "max-h-36 p-3 rounded-2xl";

  return (
    <div
      className={cn(
        "pt-2 border-t border-border/60",
        layout === "columns" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"
      )}
    >
      {/* Assign to Classes */}
      <div className="space-y-1.5">
        <label className="font-extrabold text-foreground block text-xs">
          Assign to Classes:
        </label>
        {isLoading && classes.length === 0 ? (
          <p className={cn("text-[11px] text-muted-foreground border border-border", boxHeightClass, surfaceClassName)}>
            Loading classes...
          </p>
        ) : classes.length === 0 ? (
          <p className={cn("text-[11px] text-muted-foreground border border-border", boxHeightClass, surfaceClassName)}>
            No classes found in this center.
          </p>
        ) : (
          <div
            className={cn(
              "grid gap-2 overflow-y-auto border border-border",
              layout === "stacked" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
              boxHeightClass,
              surfaceClassName
            )}
          >
            {classes.map((cls) => {
              const isChecked = selectedClassSet.has(cls.id);
              return (
                <label
                  key={cls.id}
                  className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleToggleClass(cls.id, e.target.checked)}
                    className="rounded size-3.5 border-border text-primary focus:ring-primary shrink-0"
                  />
                  <span className="truncate" title={cls.name}>
                    {cls.name} {cls.subject ? `(${cls.subject})` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign to Assessments (Filtered strictly by selected classes) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="font-extrabold text-foreground block text-xs">
            {layout === "columns"
              ? "Assessments (By Selected Classes):"
              : "Assign to Assessments (Exams / Tests / Quizzes / Assignments):"}
          </label>
          {selectedClassIds.length > 0 && filteredAssessments.length > 0 && (
            <span className="text-[10px] font-bold text-[#184880] bg-[#EBF3FE] px-2 py-0.5 rounded-full border border-[#DDE8F8] shrink-0">
              {filteredAssessments.length} matched
            </span>
          )}
        </div>

        {isLoading && assessments.length === 0 ? (
          <p className={cn("text-[11px] text-muted-foreground border border-border", boxHeightClass, surfaceClassName)}>
            Loading assessments...
          </p>
        ) : selectedClassIds.length === 0 ? (
          <p className={cn("text-[11px] text-muted-foreground border border-border", boxHeightClass, surfaceClassName)}>
            Select at least one class first to load its exams, tests, quizzes, and assignments.
          </p>
        ) : filteredAssessments.length === 0 ? (
          <p className={cn("text-[11px] text-muted-foreground border border-border", boxHeightClass, surfaceClassName)}>
            No exams, tests, quizzes, or assignments found for the selected class(es).
          </p>
        ) : (
          <div
            className={cn(
              "grid gap-2 overflow-y-auto border border-border",
              layout === "stacked" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
              boxHeightClass,
              surfaceClassName
            )}
          >
            {filteredAssessments.map((asm) => {
              const isChecked = selectedAssessmentIds.includes(asm.id);
              return (
                <label
                  key={asm.id}
                  className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleToggleAssessment(asm.id, e.target.checked)}
                    className="rounded size-3.5 border-border text-primary focus:ring-primary shrink-0"
                  />
                  <span className="truncate" title={asm.title}>
                    [{asm.type ? asm.type.toUpperCase() : "TEST"}] {asm.title}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
