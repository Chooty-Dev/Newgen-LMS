import { connectDB } from "@/lib/db";
import { Center, ICenter } from "./model";
import mongoose from "mongoose";

export class CentersService {
  static async listCenters(): Promise<ICenter[]> {
    await connectDB();
    const centers = await Center.find().sort({ createdAt: 1 }).lean();
    if (centers.length === 0) {
      const defaultCenter = await Center.create({
        name: "Newgen Education Center",
        address: "123 Galle Road, Colombo 03, Sri Lanka",
        phone: "+94 11 234 5678",
        timezone: "Asia/Colombo",
      });
      return [defaultCenter.toObject() as unknown as ICenter];
    }
    return centers as unknown as ICenter[];
  }

  static async getCenter(centerId?: string): Promise<ICenter | null> {
    await connectDB();
    if (centerId && mongoose.isValidObjectId(centerId)) {
      const center = await Center.findById(centerId);
      if (center) return center;
    }
    // Return the primary center
    let center = await Center.findOne();
    if (!center) {
      center = await Center.create({
        name: "Newgen Education Center",
        address: "123 Galle Road, Colombo 03, Sri Lanka",
        phone: "+94 11 234 5678",
        timezone: "Asia/Colombo",
      });
    }
    return center;
  }

  static async createCenter(
    data: { name: string; address?: string; phone?: string; timezone?: string },
    actorId?: string
  ): Promise<ICenter> {
    await connectDB();
    const center = await Center.create({
      name: data.name,
      address: data.address,
      phone: data.phone,
      timezone: data.timezone || "Asia/Colombo",
      createdBy: actorId && mongoose.isValidObjectId(actorId) ? new mongoose.Types.ObjectId(actorId) : undefined,
    });
    return center;
  }

  static async updateCenter(
    id: string,
    data: { name: string; address?: string; phone?: string; timezone?: string }
  ): Promise<ICenter> {
    await connectDB();
    const center = await Center.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: "after", runValidators: true }
    );
    if (!center) {
      throw new Error("Center not found");
    }
    return center;
  }

  static async deleteCenter(id: string): Promise<void> {
    await connectDB();
    const deleted = await Center.findByIdAndDelete(id);
    if (!deleted) {
      throw new Error("Center not found");
    }
  }
}
