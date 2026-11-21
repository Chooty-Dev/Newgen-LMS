import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole } from "@/core/rbac/permissions";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  actorId?: mongoose.Types.ObjectId;
  actorRole?: UserRole;
  actorName?: string;
  action: string;
  resource: {
    type: string;
    id?: string;
  };
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  result: "success" | "denied" | "failed";
  ip?: string;
  userAgent?: string;
  requestId: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: { type: String },
    actorName: { type: String },
    action: { type: String, required: true, index: true },
    resource: {
      type: { type: String, required: true },
      id: { type: String },
    },
    summary: { type: String, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    result: { type: String, enum: ["success", "denied", "failed"], required: true, index: true },
    ip: { type: String },
    userAgent: { type: String },
    requestId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
