import { UserRole } from "./permissions";
import { User, IUser } from "@/modules/users/model";
import { ClassModel } from "@/modules/classes/model";
import { Assessment } from "@/modules/exams/model";
import { connectDB } from "@/lib/db";
import mongoose from "mongoose";

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 5,
  admin: 4,
  teacher: 3,
  staff: 2,
  student: 1,
};

export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

export async function canMutateUser(
  actor: { id: string; role: UserRole },
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (actor.id === targetUserId) {
    return { allowed: false, reason: "You cannot modify or delete your own account status" };
  }

  await connectDB();
  const target = await User.findById(targetUserId).lean() as IUser | null;
  if (!target) {
    return { allowed: false, reason: "User not found" };
  }

  // Hierarchy check: actor must have strictly higher role
  if (!canManageRole(actor.role, target.role)) {
    return { allowed: false, reason: "You can only manage users with a lower role" };
  }

  // Protect last super admin
  if (target.role === "super_admin") {
    const superAdminCount = await User.countDocuments({
      role: "super_admin",
      status: "active",
      deletedAt: null,
    });
    if (superAdminCount <= 1) {
      return { allowed: false, reason: "The last Super Admin account cannot be deleted or disabled" };
    }
  }

  return { allowed: true };
}

// Scope check for classes
export async function canAccessClass(
  actor: { id: string; role: UserRole },
  classId: string
): Promise<boolean> {
  if (actor.role === "super_admin" || actor.role === "admin") return true;

  await connectDB();
  const classDoc = await ClassModel.findById(classId).lean();
  if (!classDoc) return false;

  const actorObjId = new mongoose.Types.ObjectId(actor.id);
  if (actor.role === "teacher") {
    return classDoc.teacherId.equals(actorObjId);
  }
  if (actor.role === "staff") {
    return classDoc.staffIds.some((sId) => sId.equals(actorObjId));
  }
  return false;
}

// Scope check for assessments
export async function canAccessAssessment(
  actor: { id: string; role: UserRole },
  assessmentId: string
): Promise<boolean> {
  if (actor.role === "super_admin" || actor.role === "admin") return true;

  await connectDB();
  const assessment = await Assessment.findById(assessmentId).lean();
  if (!assessment) return false;

  const actorObjId = new mongoose.Types.ObjectId(actor.id);
  if (actor.role === "staff") {
    return assessment.evaluatorIds.some((eId) => eId.equals(actorObjId));
  }
  if (actor.role === "teacher") {
    if (assessment.createdBy.equals(actorObjId)) return true;
    const teacherClasses = await ClassModel.find({
      teacherId: actorObjId,
      _id: { $in: assessment.classIds },
      deletedAt: null,
    }).select("_id");
    return teacherClasses.length > 0;
  }
  return false;
}
