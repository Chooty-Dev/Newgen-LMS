import mongoose, { Schema, Document, Model } from "mongoose";
import { Permission, UserRole } from "@/core/rbac/permissions";

export interface IRolePermission extends Document {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

const RolePermissionSchema = new Schema<IRolePermission>(
  {
    role: {
      type: String,
      enum: ["super_admin", "admin", "teacher", "staff", "student"],
      required: true,
      unique: true,
    },
    permissions: [{ type: String }],
  },
  { timestamps: true }
);

export const RolePermissionModel: Model<IRolePermission> =
  mongoose.models.RolePermission ||
  mongoose.model<IRolePermission>("RolePermission", RolePermissionSchema);

export interface IUserPermission extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  grants: Permission[];
  revokes: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

const UserPermissionSchema = new Schema<IUserPermission>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    grants: [{ type: String }],
    revokes: [{ type: String }],
  },
  { timestamps: true }
);

export const UserPermissionModel: Model<IUserPermission> =
  mongoose.models.UserPermission ||
  mongoose.model<IUserPermission>("UserPermission", UserPermissionSchema);
