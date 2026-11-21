import { connectDB } from "@/lib/db";
import { Setting } from "./model";
import mongoose from "mongoose";

export interface PerformanceWeights {
  marks: number;
  attendance: number;
  improvement: number;
}

export interface GroupThresholds {
  excellent: number;
  medium: number;
}

export interface GradeScaleItem {
  grade: string;
  min: number;
}

export class SettingsService {
  static async getAllSettings(centerId: string) {
    await connectDB();
    const cId = new mongoose.Types.ObjectId(centerId);
    const settings = await Setting.find({ centerId: cId }).lean();

    const getVal = (key: string, defaultVal: unknown) => {
      const found = settings.find((s) => s.key === key);
      return found ? found.value : defaultVal;
    };

    return {
      performanceWeights: getVal("performanceWeights", {
        marks: 0.6,
        attendance: 0.25,
        improvement: 0.15,
      }) as PerformanceWeights,
      groupThresholds: getVal("groupThresholds", {
        excellent: 75,
        medium: 50,
      }) as GroupThresholds,
      gradeScale: getVal("gradeScale", [
        { grade: "A", min: 75 },
        { grade: "B", min: 65 },
        { grade: "C", min: 55 },
        { grade: "S", min: 35 },
        { grade: "W", min: 0 },
      ]) as GradeScaleItem[],
    };
  }

  static async updateSetting(centerId: string, key: string, value: unknown) {
    await connectDB();
    const cId = new mongoose.Types.ObjectId(centerId);
    const updated = await Setting.findOneAndUpdate(
      { centerId: cId, key },
      { $set: { value } },
      { upsert: true, returnDocument: "after" }
    );
    return updated;
  }
}
