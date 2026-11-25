import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { ClassModel } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";

export interface AssignmentClassOption {
  id: string;
  name: string;
  subject?: string;
}

export interface AssignmentAssessmentOption {
  id: string;
  title: string;
  type: string;
  classIds: string[];
  classNames: string[];
}

export interface StaffAssignmentOptionsPayload {
  classes: AssignmentClassOption[];
  assessments: AssignmentAssessmentOption[];
  cachedAt: string;
}

const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000;

const assignmentOptionsCache = new Map<
  string,
  { expiresAt: number; payload: StaffAssignmentOptionsPayload }
>();

function makeCacheKey(centerId: string, teacherId?: string): string {
  return teacherId ? `${centerId}:teacher:${teacherId}` : `${centerId}:all`;
}

export function invalidateStaffAssignmentOptionsCache(centerId?: string): void {
  if (!centerId) {
    assignmentOptionsCache.clear();
    return;
  }
  const prefix = `${centerId}:`;
  for (const key of assignmentOptionsCache.keys()) {
    if (key.startsWith(prefix)) {
      assignmentOptionsCache.delete(key);
    }
  }
}

export function filterAssessmentsForClasses<T extends { id: string; classIds: string[] }>(
  assessments: T[],
  selectedClassIds: string[]
): T[] {
  if (!selectedClassIds.length) return [];
  const selectedSet = new Set(selectedClassIds);
  return assessments.filter((asm) => asm.classIds.some((cid) => selectedSet.has(cid)));
}

export async function getCachedStaffAssignmentOptions(params: {
  centerId: string;
  teacherId?: string;
  ttlMs?: number;
  nowMs?: number;
}): Promise<{ data: StaffAssignmentOptionsPayload; cacheHit: boolean }> {
  const { centerId, teacherId, ttlMs = DEFAULT_CACHE_TTL_MS } = params;
  const nowMs = params.nowMs ?? Date.now();
  const key = makeCacheKey(centerId, teacherId);

  const cached = assignmentOptionsCache.get(key);
  if (cached && cached.expiresAt > nowMs) {
    return { data: cached.payload, cacheHit: true };
  }

  await connectDB();

  const centerObjId = new mongoose.Types.ObjectId(centerId);
  const classQuery: Record<string, unknown> = {
    centerId: centerObjId,
    deletedAt: null,
  };
  if (teacherId && mongoose.isValidObjectId(teacherId)) {
    classQuery.teacherId = new mongoose.Types.ObjectId(teacherId);
  }

  const rawClasses = await ClassModel.find(classQuery)
    .select("_id name subjectId")
    .populate("subjectId", "name code")
    .sort({ name: 1 })
    .lean();

  const classNameMap = new Map<string, string>();
  const classes: AssignmentClassOption[] = rawClasses.map((cls) => {
    const id = cls._id.toString();
    classNameMap.set(id, cls.name);
    const sub = cls.subjectId as unknown as { name?: string } | null;
    return {
      id,
      name: cls.name,
      subject: sub?.name,
    };
  });

  const assessmentQuery: Record<string, unknown> = {
    centerId: centerObjId,
    deletedAt: null,
  };

  if (teacherId && mongoose.isValidObjectId(teacherId)) {
    const teacherObjId = new mongoose.Types.ObjectId(teacherId);
    const myClassObjIds = rawClasses.map((c) => c._id);
    assessmentQuery.$or = [
      { createdBy: teacherObjId },
      ...(myClassObjIds.length > 0 ? [{ classIds: { $in: myClassObjIds } }] : []),
    ];
  }

  const rawAssessments = await Assessment.find(assessmentQuery)
    .select("_id title type classIds")
    .sort({ "sessions.0.date": -1, createdAt: -1 })
    .lean();

  const assessments: AssignmentAssessmentOption[] = rawAssessments.map((asm) => {
    const classIds = (asm.classIds || []).map((cid) => cid.toString());
    return {
      id: asm._id.toString(),
      title: asm.title,
      type: asm.type || "test",
      classIds,
      classNames: classIds
        .map((cid) => classNameMap.get(cid))
        .filter((name): name is string => Boolean(name)),
    };
  });

  const payload: StaffAssignmentOptionsPayload = {
    classes,
    assessments,
    cachedAt: new Date(nowMs).toISOString(),
  };

  assignmentOptionsCache.set(key, {
    expiresAt: nowMs + ttlMs,
    payload,
  });

  return { data: payload, cacheHit: false };
}
