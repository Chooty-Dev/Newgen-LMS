import { User, StudentProfile, TeacherProfile, StaffProfile, IUser } from "./model";
import { Center } from "@/modules/centers/model";
import { Enrollment } from "@/modules/classes/model";
import { PerformanceSnapshot } from "@/modules/analysis/model";
import { canMutateUser } from "@/core/rbac/policies";
import { generateTemporaryPassword, hashPassword } from "@/core/auth/password";
import { revokeAllUserSessions } from "@/core/auth/session";
import { connectDB } from "@/lib/db";
import { UserRole } from "@/core/rbac/permissions";
import mongoose from "mongoose";

export class UserService {
  // Create any user with generated temporary password
  static async createUser(
    actor: { id: string; role: UserRole; centerId: string },
    data: {
      name: string;
      username: string;
      password?: string;
      email?: string;
      phone?: string;
      role: UserRole;
      admissionNo?: string;
      grade?: string;
      dateOfBirth?: string;
      guardian?: { name: string; phone: string; relation: string };
      title?: string;
      position?: string;
      centerIds?: string[];
    }
  ): Promise<{ user: IUser; temporaryPassword: string }> {
    await connectDB();

    // Check username duplication
    const existing = await User.findOne({ username: data.username.toLowerCase(), deletedAt: null });
    if (existing) {
      throw new Error(`Username '${data.username}' is already in use`);
    }

    if (data.email) {
      const emailExisting = await User.findOne({ email: data.email.toLowerCase(), deletedAt: null });
      if (emailExisting) {
        throw new Error(`Email '${data.email}' is already in use`);
      }
    }

    const effectivePassword =
      data.password && data.password.trim().length >= 8
        ? data.password.trim()
        : generateTemporaryPassword();
    const passwordHash = await hashPassword(effectivePassword);

    // Multi-center handling for teachers / users
    let assignedCenterIds: mongoose.Types.ObjectId[] = [];
    if (data.centerIds && data.centerIds.length > 0) {
      assignedCenterIds = data.centerIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    }
    if (assignedCenterIds.length === 0 && actor.centerId && mongoose.isValidObjectId(actor.centerId)) {
      assignedCenterIds = [new mongoose.Types.ObjectId(actor.centerId)];
    }

    const primaryCenterId = assignedCenterIds.length > 0
      ? assignedCenterIds[0]
      : new mongoose.Types.ObjectId(actor.centerId);

    const user = await User.create({
      centerId: primaryCenterId,
      assignedCenterIds,
      role: data.role,
      username: data.username.toLowerCase(),
      email: data.email?.toLowerCase() || undefined,
      name: data.name,
      phone: data.phone || undefined,
      passwordHash,
      mustChangePassword: true,
      status: "active",
      failedLoginCount: 0,
    });

    // Ensure assignedCenterIds is explicitly written to MongoDB
    if (assignedCenterIds.length > 0) {
      await User.updateOne(
        { _id: user._id },
        { $set: { assignedCenterIds } }
      );
    }

    // Create corresponding profile
    if (data.role === "student") {
      const admissionNo = data.admissionNo || `ADM-${Date.now().toString().slice(-6)}`;
      await StudentProfile.create({
        userId: user._id,
        centerId: user.centerId,
        admissionNo,
        grade: data.grade,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        guardian: data.guardian,
        joinedAt: new Date(),
      });
    } else if (data.role === "teacher") {
      await TeacherProfile.create({
        userId: user._id,
        centerId: user.centerId,
        assignedCenterIds,
        title: data.title || "Instructor",
        joinedAt: new Date(),
      });
      await TeacherProfile.updateOne(
        { userId: user._id },
        { $set: { assignedCenterIds, centerId: user.centerId } }
      );
    } else if (data.role === "staff") {
      await StaffProfile.create({
        userId: user._id,
        centerId: user.centerId,
        title: data.title || "Staff Member",
        position: data.position || "Evaluator / Coordinator",
        joinedAt: new Date(),
      });
    }

    return { user, temporaryPassword: effectivePassword };
  }

  // Reset password for a student, staff, teacher or admin
  static async resetUserPassword(
    actor: { id: string; role: UserRole },
    targetUserId: string
  ): Promise<{ temporaryPassword: string }> {
    await connectDB();

    const authCheck = await canMutateUser(actor, targetUserId);
    if (!authCheck.allowed) {
      throw new Error(authCheck.reason || "Unauthorized to reset password for this user");
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(targetUserId) },
      {
        passwordHash,
        mustChangePassword: true,
        failedLoginCount: 0,
        lockUntil: null,
        $inc: { permissionsVersion: 1 },
      }
    );

    await revokeAllUserSessions(targetUserId);

    return { temporaryPassword };
  }

  // Soft delete user
  static async softDeleteUser(
    actor: { id: string; role: UserRole },
    targetUserId: string
  ): Promise<void> {
    await connectDB();

    const authCheck = await canMutateUser(actor, targetUserId);
    if (!authCheck.allowed) {
      throw new Error(authCheck.reason || "Unauthorized to delete this user");
    }

    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(targetUserId) },
      {
        deletedAt: new Date(),
        deletedBy: new mongoose.Types.ObjectId(actor.id),
        status: "disabled",
      }
    );

    await revokeAllUserSessions(targetUserId);
  }

  // List students with performance snapshot and enrollments
  static async listStudents(params: {
    centerId: string;
    page: number;
    limit: number;
    search?: string;
    status?: string;
    classId?: string;
    group?: string;
    teacherClassesOnly?: string[];
  }) {
    await connectDB();

    const query: Record<string, unknown> = {
      role: "student",
      deletedAt: null,
    };

    if (params.centerId && mongoose.isValidObjectId(params.centerId)) {
      query.centerId = new mongoose.Types.ObjectId(params.centerId);
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.search) {
      query.$or = [
        { name: { $regex: params.search, $options: "i" } },
        { username: { $regex: params.search, $options: "i" } },
      ];
    }

    // Filter by class enrollment
    if (params.classId) {
      const enrollments = await Enrollment.find({
        classId: new mongoose.Types.ObjectId(params.classId),
        status: "active",
      }).select("studentId");
      const studentIds = enrollments.map((e) => e.studentId);
      query._id = { $in: studentIds };
    } else if (params.teacherClassesOnly && params.teacherClassesOnly.length > 0) {
      const enrollments = await Enrollment.find({
        classId: { $in: params.teacherClassesOnly.map((id) => new mongoose.Types.ObjectId(id)) },
        status: "active",
      }).select("studentId");
      const studentIds = enrollments.map((e) => e.studentId);
      query._id = { $in: studentIds };
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean();

    const userIds = users.map((u) => u._id);

    // Fetch student profiles
    const profiles = await StudentProfile.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    // Fetch latest performance snapshot
    const snapshots = await PerformanceSnapshot.find({ studentId: { $in: userIds } })
      .sort({ period: -1 })
      .lean();
    const snapshotMap = new Map();
    for (const s of snapshots) {
      if (!snapshotMap.has(s.studentId.toString())) {
        snapshotMap.set(s.studentId.toString(), s);
      }
    }

    const data = users.map((user) => {
      const p = profileMap.get(user._id.toString());
      const s = snapshotMap.get(user._id.toString());
      return {
        id: user._id.toString(),
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        status: user.status,
        joinedAt: user.createdAt,
        admissionNo: p?.admissionNo || "-",
        grade: p?.grade || "-",
        guardian: p?.guardian,
        performanceScore: s?.score ?? 70,
        group: s?.group ?? "medium",
      };
    });

    // Optional group filter
    const filteredData = params.group
      ? data.filter((d) => d.group === params.group)
      : data;

    return {
      data: filteredData,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit) || 1,
      },
    };
  }

  // List teachers
  static async listTeachers(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    centerId?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      role: "teacher",
      deletedAt: null,
    };

    if (params.status) query.status = params.status;
    if (params.centerId && mongoose.isValidObjectId(params.centerId)) {
      const cObj = new mongoose.Types.ObjectId(params.centerId);
      query.$or = [{ centerId: cObj }, { assignedCenterIds: cObj }];
    }
    if (params.search) {
      const searchConditions = [
        { name: { $regex: params.search, $options: "i" } },
        { username: { $regex: params.search, $options: "i" } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean();

    const userIds = users.map((u) => u._id);
    const profiles = await TeacherProfile.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const allCenters = await Center.find().select("_id name").lean();
    const centerNameMap = new Map(allCenters.map((c) => [c._id.toString(), c.name]));

    const data = users.map((u) => {
      const p = profileMap.get(u._id.toString());
      const rawCenterIds =
        u.assignedCenterIds && u.assignedCenterIds.length > 0
          ? u.assignedCenterIds
          : p?.assignedCenterIds && p.assignedCenterIds.length > 0
            ? p.assignedCenterIds
            : u.centerId
              ? [u.centerId]
              : [];
      const centerIds = rawCenterIds.map((id) => id.toString());
      const centers = centerIds.map((id) => ({
        id,
        name: centerNameMap.get(id) || "Education Center",
      }));

      return {
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        status: u.status,
        joinedAt: u.createdAt,
        title: p?.title || "Teacher",
        assignedCenterIds: centerIds,
        centers,
      };
    });

    return {
      data,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit) || 1,
      },
    };
  }

  // List staff members
  static async listStaff(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    centerId?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      role: "staff",
      deletedAt: null,
    };

    if (params.status) query.status = params.status;
    if (params.centerId && mongoose.isValidObjectId(params.centerId)) {
      query.centerId = new mongoose.Types.ObjectId(params.centerId);
    }
    if (params.search) {
      query.$or = [
        { name: { $regex: params.search, $options: "i" } },
        { username: { $regex: params.search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean();

    const userIds = users.map((u) => u._id);
    const profiles = await StaffProfile.find({ userId: { $in: userIds } }).lean();
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    const data = users.map((u) => {
      const p = profileMap.get(u._id.toString());
      return {
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        email: u.email,
        phone: u.phone,
        status: u.status,
        joinedAt: u.createdAt,
        title: p?.title || "Staff Member",
        position: p?.position || "Coordinator",
      };
    });

    return {
      data,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit) || 1,
      },
    };
  }

  // List admins (Super Admin only)
  static async listAdmins(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    await connectDB();
    const query: Record<string, unknown> = {
      role: { $in: ["admin", "super_admin"] },
      deletedAt: null,
    };

    if (params.status) query.status = params.status;
    if (params.search) {
      query.$or = [
        { name: { $regex: params.search, $options: "i" } },
        { username: { $regex: params.search, $options: "i" } },
      ];
    }

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean();

    const data = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      joinedAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }));

    return {
      data,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit) || 1,
      },
    };
  }
}
